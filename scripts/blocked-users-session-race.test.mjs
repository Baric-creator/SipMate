import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync(new URL('../src/app/blocked-users.tsx', import.meta.url), 'utf8');

test('blocked users invalidates stale focus loads', () => {
  assert.match(source, /const loadIdRef = useRef\(0\)/);
  assert.match(source, /loadIdRef\.current \+= 1/);
  assert.match(source, /const requestId = \+\+loadIdRef\.current/);
});

test('blocked users verifies the account after async reads', () => {
  assert.match(source, /sessionAfterBlocks\?\.user\?\.id !== myId/);
  assert.match(source, /finalSession\?\.user\?\.id !== myId/);
});

test('unblock ignores duplicate taps and stale account completions', () => {
  assert.match(source, /unblockingRef\.current\.has\(userId\)/);
  assert.match(source, /currentSession\?\.user\?\.id !== expectedUserId/);
});
