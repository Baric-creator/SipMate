import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync(new URL('../src/app/delete-account.tsx', import.meta.url), 'utf8');

test('account deletion blocks duplicate taps synchronously', () => {
  assert.match(source, /const deletionInFlightRef = useRef\(false\)/);
  assert.match(source, /if \(deletionInFlightRef\.current\) return/);
  assert.match(source, /deletionInFlightRef\.current = true/);
});

test('account deletion keeps the original user identity through the destructive request', () => {
  assert.match(source, /const expectedUserId = session\?\.user\?\.id/);
  assert.match(source, /Authorization: `Bearer \$\{accessToken\}`/);
  assert.match(source, /currentSession\?\.user\?\.id !== expectedUserId/);
});

test('a switched-in account is not signed out by a stale deletion completion', () => {
  const guardIndex = source.indexOf('currentSession?.user?.id !== expectedUserId');
  const signOutIndex = source.indexOf('await supabase.auth.signOut()');
  assert.ok(guardIndex >= 0 && signOutIndex > guardIndex);
});
