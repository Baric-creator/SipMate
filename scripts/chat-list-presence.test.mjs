import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const migrationPath = 'supabase/migrations/20260915150500_chat_list_respects_active_until.sql';
const sql = fs.readFileSync(migrationPath, 'utf8');

test('chat list Active status requires an unexpired Active session', () => {
  assert.match(sql, /coalesce\(p\.is_active, false\)/);
  assert.match(sql, /p\.active_until is not null/);
  assert.match(sql, /p\.active_until > now\(\)/);
  assert.match(sql, /p\.last_seen_at >= now\(\) - interval '90 seconds'/);
});

test('chat list RPC stays authenticated and block-aware', () => {
  assert.match(sql, /security definer/i);
  assert.match(sql, /auth\.uid\(\)/);
  assert.match(sql, /is_blocked_between\(auth\.uid\(\), p\.id\)/);
  assert.match(sql, /grant execute on function public\.get_chat_list\(\) to authenticated/i);
});
