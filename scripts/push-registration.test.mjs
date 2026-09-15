import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync('src/lib/push-notifications.ts', 'utf8');

test('push registration coalesces concurrent attempts only for the same user', () => {
  assert.match(source, /type PushRegistrationTask = \{\s*userId: string;\s*promise: Promise<string \| null>;\s*\};/s);
  assert.match(source, /if \(registrationInFlight\?\.userId === userId\) \{\s*return registrationInFlight\.promise;\s*\}/s);
  assert.match(source, /const promise = registerForPushNotificationsInternal\(userId\);/);
  assert.match(source, /const task: PushRegistrationTask = \{ userId, promise \};/);
  assert.match(source, /if \(registrationInFlight === task\) \{\s*registrationInFlight = null;\s*\}/s);
});

test('push registration aborts if the authenticated user changes mid-flight', () => {
  assert.match(source, /registerForPushNotificationsInternal\(expectedUserId: string\)/);
  assert.match(source, /session\.user\.id !== expectedUserId/);
});

test('logout waits only for the current users in-flight push registration', () => {
  assert.match(source, /if \(registrationInFlight\?\.userId === userId\) \{\s*await registrationInFlight\.promise\.catch\(\(\) => null\);\s*\}/s);
  assert.match(source, /\.eq\('user_id', userId\)/);
});
