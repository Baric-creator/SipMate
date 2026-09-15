import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync('supabase/migrations/20260915205300_add_premium_reward_grants.sql', 'utf8');

test('Premium reward ledger is backend-only and idempotent', () => {
  assert.match(source, /create table if not exists public\.premium_reward_grants/);
  assert.match(source, /unique \(source, external_reference\)/);
  assert.match(source, /alter table public\.premium_reward_grants enable row level security/);
  assert.match(source, /revoke all on table public\.premium_reward_grants from authenticated/);
  assert.match(source, /create or replace function public\.grant_premium_reward/);
  assert.match(source, /auth\.role\(\) <> 'service_role'/);
  assert.match(source, /when unique_violation then/);
  assert.match(source, /grant execute on function public\.grant_premium_reward\(uuid, text, text, integer, jsonb\) to service_role/);
});

test('Premium reward extends a finite entitlement without shortening lifetime Premium', () => {
  assert.match(source, /current_is_premium and current_until is null/);
  assert.match(source, /new_until := null/);
  assert.match(source, /greatest\(coalesce\(current_until, now\(\)\), now\(\)\)/);
  assert.match(source, /set is_premium = true,/);
  assert.match(source, /premium_until = new_until/);
});

test('Premium reward inputs are bounded', () => {
  assert.match(source, /duration_days between 1 and 3650/);
  assert.match(source, /char_length\(source\) between 1 and 80/);
  assert.match(source, /char_length\(external_reference\) between 1 and 160/);
});
