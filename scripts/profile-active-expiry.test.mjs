import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync(new URL('../src/app/profile.tsx', import.meta.url), 'utf8');

test('own profile keeps Active session separate from live online presence', () => {
  assert.match(source, /active_until: string \| null;/);
  assert.match(source, /select\('id, name, age, city, bio, currently_up_for, is_active, last_seen_at, active_until, avatar_url/);
  assert.match(source, /const profileAvailable = isProfileAvailable\(profile\);/);
  assert.match(source, /const profileOnline = profileAvailable && isProfileOnline\(profile\);/);
  assert.match(source, /profileAvailable \? t\('profileScreen\.active'\) : t\('profileScreen\.inactive'\)/);
});
