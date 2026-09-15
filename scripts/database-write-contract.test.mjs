import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const profileWrites = fs.readFileSync('supabase/migrations/20260915201000_restrict_profile_write_columns.sql', 'utf8');
const photoWrites = fs.readFileSync('supabase/migrations/20260915202000_restrict_profile_photo_writes.sql', 'utf8');
const activeSessionWrites = fs.readFileSync('supabase/migrations/20260915205000_enforce_active_session_window.sql', 'utf8');
const activeSessionSafety = fs.readFileSync('supabase/migrations/20260915205100_safe_active_session_insert_trigger.sql', 'utf8');

test('authenticated profile writes remain owner-scoped and cannot change Premium state', () => {
  assert.match(profileWrites, /caller_id uuid := auth\.uid\(\)/);
  assert.match(profileWrites, /new\.id <> caller_id/);
  assert.match(profileWrites, /old\.id <> caller_id or new\.id <> old\.id/);
  assert.match(profileWrites, /new\.is_premium := false/);
  assert.match(profileWrites, /new\.is_premium := old\.is_premium/);
  assert.match(profileWrites, /revoke delete on table public\.profiles from authenticated/);
  assert.doesNotMatch(
    profileWrites.match(/grant update \([\s\S]*?\) on table public\.profiles to authenticated;/i)?.[0] ?? '',
    /premium_until|discord_user_id|discord_username|discord_connected_at/,
  );
});

test('profile photo writes are insert/delete only and owner delete is trigger-enforced', () => {
  assert.match(photoWrites, /revoke update on table public\.profile_photos from authenticated/);
  assert.match(photoWrites, /grant insert \(user_id, photo_url, sort_order\)/);
  assert.match(photoWrites, /grant delete on table public\.profile_photos to authenticated/);
  assert.match(photoWrites, /old\.user_id <> auth\.uid\(\)/);
  assert.match(photoWrites, /before delete on public\.profile_photos/);
});

test('authenticated clients cannot extend an existing Active session beyond its server window', () => {
  assert.match(activeSessionWrites, /auth\.role\(\) <> 'authenticated'/);
  assert.match(activeSessionWrites, /now\(\) \+ interval '3 hours'/);
  assert.match(activeSessionWrites, /least\(coalesce\(new\.active_until, old\.active_until\), old\.active_until\)/);
  assert.match(activeSessionWrites, /new\.last_seen_at := now\(\)/);
  assert.match(activeSessionWrites, /new\.active_until := null/);
  assert.match(activeSessionWrites, /new\.last_seen_at := null/);
  assert.match(activeSessionWrites, /before insert or update of is_active, active_until, last_seen_at on public\.profiles/);
});

test('Active session trigger handles INSERT before reading OLD', () => {
  const insertAt = activeSessionSafety.indexOf("if tg_op = 'INSERT' then");
  const oldReadAt = activeSessionSafety.indexOf('old.is_active');
  assert.ok(insertAt >= 0 && oldReadAt > insertAt, 'INSERT branch must be resolved before OLD fields are referenced');
  assert.match(activeSessionSafety, /new\.active_until := now\(\) \+ interval '3 hours'/);
  assert.match(activeSessionSafety, /revoke all on function public\.enforce_profile_active_session_window\(\) from public/);
});
