import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const exists = (relativePath) => fs.existsSync(path.join(root, relativePath));

const chatListMigration = 'supabase/migrations/20260915150500_chat_list_respects_active_until.sql';
assert(exists(chatListMigration), `Missing migration: ${chatListMigration}`);

if (exists(chatListMigration)) {
  const sql = read(chatListMigration);
  assert(sql.includes('create or replace function public.get_chat_list()'), 'Latest chat-list migration no longer replaces get_chat_list()');
  assert(sql.includes('security definer'), 'get_chat_list() must remain SECURITY DEFINER');
  assert(sql.includes('set search_path = pg_catalog, public'), 'get_chat_list() search_path hardening is missing');
  assert(sql.includes('auth.uid()'), 'get_chat_list() no longer scopes results to the authenticated user');
  assert(sql.includes("p.last_seen_at >= now() - interval '90 seconds'"), 'Chat-list online status no longer requires a fresh heartbeat');
  assert(sql.includes('p.active_until is not null'), 'Chat-list Active state no longer requires active_until');
  assert(sql.includes('p.active_until > now()'), 'Chat-list Active state can outlive the 3-hour session window');
  assert(sql.includes('not public.is_blocked_between(auth.uid(), p.id)'), 'Blocked users can reappear in the chat list');
  assert(sql.includes('revoke all on function public.get_chat_list() from public'), 'Public execution was re-enabled for get_chat_list()');
  assert(sql.includes('grant execute on function public.get_chat_list() to authenticated'), 'Authenticated execution is missing for get_chat_list()');
}

const nearbyMigration = 'supabase/migrations/20260914142559_add_active_session_window.sql';
assert(exists(nearbyMigration), `Missing migration: ${nearbyMigration}`);
if (exists(nearbyMigration)) {
  const sql = read(nearbyMigration);
  assert(sql.includes('active_until'), 'Nearby Active-session migration lost active_until support');
  assert(sql.includes('now()'), 'Nearby Active-session migration no longer enforces time-based expiry');
}

if (failures.length) {
  failures.forEach((message) => console.error(`FAIL: ${message}`));
  console.error(`Database contract audit failed with ${failures.length} blocking issue(s).`);
  process.exit(1);
}

console.log('Database contract audit passed.');
