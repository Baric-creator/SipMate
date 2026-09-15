import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync('src/app/profile.tsx', 'utf8');

test('profile loads use a monotonic request id and cancel stale focus work', () => {
  assert.match(source, /const profileLoadIdRef = useRef\(0\);/);
  assert.match(source, /const requestId = \+\+profileLoadIdRef\.current;/);
  assert.match(source, /if \(requestId !== profileLoadIdRef\.current\) return;/);
  assert.match(source, /return \(\) => \{\s*profileLoadIdRef\.current \+= 1;\s*\};/s);
});

test('profile results are discarded when the authenticated user changes', () => {
  assert.match(source, /const expectedUserId = session\.user\.id;/);
  assert.match(source, /currentSession\?\.user\?\.id !== expectedUserId/);
  assert.match(source, /sessionAfterCreate\?\.user\?\.id !== expectedUserId/);
});

test('logout invalidates pending profile loads before signing out', () => {
  assert.match(source, /async function handleLogout\(\) \{\s*profileLoadIdRef\.current \+= 1;/s);
  assert.match(source, /setProfile\(null\);\s*router\.replace\('\/login'\);/s);
});
