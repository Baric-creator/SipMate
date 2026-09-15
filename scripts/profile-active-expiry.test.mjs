import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync(new URL('../src/app/profile.tsx', import.meta.url), 'utf8');

test('own profile reads Active expiry and combines it with heartbeat freshness', () => {
  assert.match(source, /active_until: string \| null;/);
  assert.match(source, /select\('id, name, age, city, bio, currently_up_for, is_active, last_seen_at, active_until, avatar_url/);
  assert.match(source, /const profileOnline = isProfileAvailable\(profile\) && isProfileOnline\(profile\);/);
});
