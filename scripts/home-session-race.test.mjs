import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync(new URL('../src/app/index.tsx', import.meta.url), 'utf8');

test('home profile loads invalidate stale focus work', () => {
  assert.match(source, /const homeLoadIdRef = useRef\(0\);/);
  assert.match(source, /const requestId = \+\+homeLoadIdRef\.current;/);
  assert.match(source, /homeLoadIdRef\.current \+= 1;/);
});

test('home profile results are discarded after account changes', () => {
  assert.match(source, /const expectedUserId = session\.user\.id;/);
  assert.match(source, /currentSession\?\.user\?\.id !== expectedUserId/);
  assert.match(source, /sessionAfterCreate\?\.user\?\.id !== expectedUserId/);
});

test('home activity count only commits for the current user and request', () => {
  assert.match(source, /const isCurrent = \(\) =>[\s\S]*currentUserIdRef\.current === myId[\s\S]*requestId === homeLoadIdRef\.current/);
  assert.match(source, /if \(isCurrent\(\)\) \{\s*setActivityCount/);
});

test('Active toggle revalidates ownership before updating profile state', () => {
  assert.match(source, /session\.user\.id !== profileId/);
  assert.match(source, /current\?\.id === profileId/);
});
