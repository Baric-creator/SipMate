import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync('src/lib/push-notifications.ts', 'utf8');

test('push registration coalesces concurrent attempts', () => {
  assert.match(source, /let registrationInFlight: Promise<string \| null> \| null = null;/);
  assert.match(source, /if \(registrationInFlight\) return registrationInFlight;/);
  assert.match(source, /registrationInFlight = registerForPushNotificationsInternal\(\);/);
  assert.match(source, /finally \{\s*registrationInFlight = null;\s*\}/s);
});

test('logout waits for any in-flight push registration before deleting token', () => {
  assert.match(source, /if \(registrationInFlight\) \{\s*await registrationInFlight\.catch\(\(\) => null\);\s*\}/s);
});
