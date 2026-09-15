import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const forgot = fs.readFileSync(new URL('../src/app/forgot-password.tsx', import.meta.url), 'utf8');
const reset = fs.readFileSync(new URL('../src/app/reset-password.tsx', import.meta.url), 'utf8');

test('reset email flow blocks duplicate submissions synchronously', () => {
  assert.match(forgot, /const resetInFlightRef = useRef\(false\)/);
  assert.match(forgot, /if \(resetInFlightRef\.current\) return/);
  assert.match(forgot, /resetInFlightRef\.current = true/);
  assert.match(forgot, /resetInFlightRef\.current = false/);
});

test('password reset screen only becomes ready from a recovery flow', () => {
  assert.match(reset, /if \(event === 'PASSWORD_RECOVERY'\)/);
  assert.doesNotMatch(reset, /event === 'PASSWORD_RECOVERY' \|\| event === 'SIGNED_IN'/);
  assert.doesNotMatch(reset, /if \(active && data\.session\) setReady\(true\)/);
  assert.match(reset, /const recoveryReadyRef = useRef\(false\)/);
});

test('password reset blocks duplicate saves and protects a switched-in account', () => {
  assert.match(reset, /const saveInFlightRef = useRef\(false\)/);
  assert.match(reset, /if \(saveInFlightRef\.current\) return/);
  assert.match(reset, /currentSession\?\.user\?\.id !== expectedUserId/);
});
