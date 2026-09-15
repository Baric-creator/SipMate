import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const migration = fs.readFileSync('supabase/migrations/20260915203000_harden_profile_signup_trigger.sql', 'utf8');

test('profile signup trigger requires an explicit adult age', () => {
  assert.match(migration, /create or replace function public\.handle_new_user_profile\(\)/);
  assert.match(migration, /set search_path = pg_catalog, public/);
  assert.match(migration, /raw_user_meta_data->>'age'/);
  assert.match(migration, /profile_age < 18 or profile_age > 120/);
  assert.match(migration, /raise exception 'A valid adult age is required'/);
});

test('signup trigger cannot be called directly by app roles', () => {
  assert.match(migration, /revoke all on function public\.handle_new_user_profile\(\) from public/);
  assert.match(migration, /revoke all on function public\.handle_new_user_profile\(\) from anon/);
  assert.match(migration, /revoke all on function public\.handle_new_user_profile\(\) from authenticated/);
});
