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

const pushTokenMigration = 'supabase/migrations/20260915193000_harden_device_push_tokens.sql';
assert(exists(pushTokenMigration), `Missing migration: ${pushTokenMigration}`);
if (exists(pushTokenMigration)) {
  const sql = read(pushTokenMigration);
  assert(sql.includes('alter table public.device_push_tokens enable row level security'), 'device_push_tokens RLS is not explicitly enabled');
  assert(sql.includes('revoke all on table public.device_push_tokens from anon'), 'Anonymous push-token access is not revoked');
  assert(sql.includes('revoke all on table public.device_push_tokens from authenticated'), 'Authenticated push-token privileges are not reset before the narrow grant');
  assert(sql.includes('grant delete on table public.device_push_tokens to authenticated'), 'Authenticated users cannot unregister their own push token');
  assert(sql.includes('for delete') && sql.includes('auth.uid() = user_id'), 'Push-token DELETE policy is not scoped to the token owner');
  assert(!sql.includes('grant select on table public.device_push_tokens to authenticated'), 'Push tokens became readable by app clients');
}

const discordStateMigration = 'supabase/migrations/20260906184000_add_discord_oauth_states.sql';
const discordFeedMigration = 'supabase/migrations/20260907191500_add_discord_cheers_feed.sql';
for (const [migration, table] of [
  [discordStateMigration, 'discord_oauth_states'],
  [discordFeedMigration, 'discord_cheers_announcements'],
]) {
  assert(exists(migration), `Missing migration: ${migration}`);
  if (exists(migration)) {
    const sql = read(migration);
    assert(sql.includes(`alter table public.${table} enable row level security`), `${table} RLS is not explicitly enabled`);
    assert(sql.includes('revoke all') && sql.includes(table) && sql.includes('anon') && sql.includes('authenticated'), `${table} remains directly accessible to app clients`);
  }
}

const galleryLimitMigration = 'supabase/migrations/20260915195000_enforce_premium_gallery_limit.sql';
assert(exists(galleryLimitMigration), `Missing migration: ${galleryLimitMigration}`);
if (exists(galleryLimitMigration)) {
  const sql = read(galleryLimitMigration);
  assert(sql.includes('create or replace function public.enforce_profile_photo_insert()'), 'Premium gallery insert guard function is missing');
  assert(sql.includes('security definer'), 'Premium gallery guard must remain SECURITY DEFINER');
  assert(sql.includes('set search_path = pg_catalog, public'), 'Premium gallery guard search_path hardening is missing');
  assert(sql.includes('new.user_id <> auth.uid()'), 'Premium gallery guard no longer enforces photo ownership');
  assert(sql.includes('p.is_premium = true') && sql.includes('p.premium_until > now()'), 'Premium gallery guard no longer checks a current Premium entitlement');
  assert(sql.includes('for update'), 'Premium gallery inserts are no longer serialized against concurrent uploads');
  assert(sql.includes('current_photo_count >= 6'), 'Premium gallery six-photo limit is missing');
  assert(sql.includes('before insert on public.profile_photos'), 'Premium gallery guard trigger no longer runs before INSERT');
  assert(sql.includes('revoke all on function public.enforce_profile_photo_insert() from public'), 'Premium gallery trigger function became directly executable by public');
}

if (failures.length) {
  failures.forEach((message) => console.error(`FAIL: ${message}`));
  console.error(`Database contract audit failed with ${failures.length} blocking issue(s).`);
  process.exit(1);
}

console.log('Database contract audit passed.');
