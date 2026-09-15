import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync('src/lib/push-notifications.ts', 'utf8');
const edgeSource = fs.readFileSync('supabase/functions/register-push-token/index.ts', 'utf8');

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
  assert.match(source, /const accessToken = session\?\.access_token;/);
});

test('push unregistration goes through the authenticated Edge Function, not direct token-table access', () => {
  assert.match(source, /functions\.invoke\('register-push-token'/);
  assert.match(source, /action: 'unregister'/);
  assert.match(source, /Authorization: `Bearer \$\{accessToken\}`/);
  assert.doesNotMatch(source, /from\('device_push_tokens'\)/, 'app clients must not access push-token storage directly');
});

test('push token Edge Function scopes unregister to the authenticated user and token', () => {
  assert.match(edgeSource, /const action = body\?\.action \?\? "register";/);
  assert.match(edgeSource, /action !== "register" && action !== "unregister"/);
  assert.match(edgeSource, /if \(action === "unregister"\)/);
  assert.match(edgeSource, /\.from\("device_push_tokens"\)\s*\.delete\(\)\s*\.eq\("user_id", user\.id\)\s*\.eq\("token", pushToken\)/s);
  assert.match(edgeSource, /auth\.getUser\(token\)/);
});

test('push token Edge Function bounds input and per-user registrations', () => {
  assert.match(edgeSource, /const MAX_PUSH_TOKEN_LENGTH = 256;/);
  assert.match(edgeSource, /const MAX_PUSH_TOKENS_PER_USER = 10;/);
  assert.match(edgeSource, /pushToken\.length > MAX_PUSH_TOKEN_LENGTH/);
  assert.match(edgeSource, /return new Response\(JSON\.stringify\(\{ error: "invalid_json" \}\), \{ status: 400, headers \}\)/);
  assert.match(edgeSource, /\.eq\("user_id", user\.id\)\s*\.order\("updated_at", \{ ascending: false \}\)\s*\.range\(MAX_PUSH_TOKENS_PER_USER,/s);
  assert.match(edgeSource, /\.delete\(\)\s*\.eq\("user_id", user\.id\)\s*\.in\("token", tokensToDelete\)/s);
});
