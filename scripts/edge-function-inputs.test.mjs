import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const announceCheers = fs.readFileSync('supabase/functions/announce-cheers/index.ts', 'utf8');
const discordOauth = fs.readFileSync('supabase/functions/discord-oauth/index.ts', 'utf8');
const registerPushToken = fs.readFileSync('supabase/functions/register-push-token/index.ts', 'utf8');
const sendMessageNotification = fs.readFileSync('supabase/functions/send-message-notification/index.ts', 'utf8');
const sendCheersNotification = fs.readFileSync('supabase/functions/send-cheers-notification/index.ts', 'utf8');
const adminModeration = fs.readFileSync('supabase/functions/admin-moderation/index.ts', 'utf8');
const joinWaitlist = fs.readFileSync('supabase/functions/join-waitlist/index.ts', 'utf8');
const createCheckoutSession = fs.readFileSync('supabase/functions/create-checkout-session/index.ts', 'utf8');

test('Discord Cheers feed validates other_user_id before interpolated PostgREST filters', () => {
  assert.match(announceCheers, /const UUID_PATTERN =/);
  assert.match(announceCheers, /UUID_PATTERN\.test\(otherUserId\)/);
  assert.match(announceCheers, /otherUserId === caller\.id/);

  const validationAt = announceCheers.indexOf('UUID_PATTERN.test(otherUserId)');
  const filterAt = announceCheers.indexOf('.or(');
  assert.ok(validationAt >= 0 && filterAt > validationAt, 'other_user_id must be validated before it reaches the textual .or() filter');
});

test('Discord Cheers feed still requires mutual Cheers and both users consent', () => {
  assert.match(announceCheers, /!hasOutbound \|\| !hasInbound/);
  assert.match(announceCheers, /profiles\.every\(\(profile\) => profile\.share_cheers_discord === true\)/);
  assert.match(announceCheers, /allowed_mentions: \{ parse: \[\] \}/);
});

test('Discord disconnect keeps linkage if Premium role revocation fails', () => {
  const disconnectAt = discordOauth.indexOf('body.action === "disconnect"');
  const roleRevokeAt = discordOauth.indexOf('updateDiscordRole(profile.discord_user_id, false)', disconnectAt);
  const clearLinkAt = discordOauth.indexOf('discord_user_id: null', disconnectAt);
  assert.ok(disconnectAt >= 0 && roleRevokeAt > disconnectAt && clearLinkAt > roleRevokeAt);
  assert.match(discordOauth.slice(roleRevokeAt, clearLinkAt), /if \(!roleResult\.ok\)/);
  assert.match(discordOauth.slice(roleRevokeAt, clearLinkAt), /discord_role_revoke_failed/);
});

test('push token registration bounds attacker-controlled token input before storage access', () => {
  assert.match(registerPushToken, /const MAX_PUSH_TOKEN_LENGTH = 256/);
  assert.match(registerPushToken, /pushToken\.length > MAX_PUSH_TOKEN_LENGTH/);
  const validationAt = registerPushToken.indexOf('pushToken.length > MAX_PUSH_TOKEN_LENGTH');
  const tableAt = registerPushToken.indexOf('.from("device_push_tokens")');
  assert.ok(validationAt >= 0 && tableAt > validationAt, 'push token validation must happen before device token storage access');
});

test('message notification validates UUID input before querying messages', () => {
  assert.match(sendMessageNotification, /const UUID_PATTERN =/);
  assert.match(sendMessageNotification, /UUID_PATTERN\.test\(messageId\)/);
  const validationAt = sendMessageNotification.indexOf('UUID_PATTERN.test(messageId)');
  const queryAt = sendMessageNotification.indexOf('.from("messages")');
  assert.ok(validationAt >= 0 && queryAt > validationAt, 'messageId must be validated before the messages query');
});

test('Cheers notification validates UUID input before querying Cheers', () => {
  assert.match(sendCheersNotification, /const UUID_PATTERN =/);
  assert.match(sendCheersNotification, /UUID_PATTERN\.test\(cheersId\)/);
  const validationAt = sendCheersNotification.indexOf('UUID_PATTERN.test(cheersId)');
  const queryAt = sendCheersNotification.indexOf('.from("cheers")');
  assert.ok(validationAt >= 0 && queryAt > validationAt, 'cheersId must be validated before the Cheers query');
});

test('admin moderation validates report UUID before updating reports', () => {
  assert.match(adminModeration, /const UUID_PATTERN =/);
  assert.match(adminModeration, /!UUID_PATTERN\.test\(reportId\)/);
  const validationAt = adminModeration.indexOf('!UUID_PATTERN.test(reportId)');
  const updateAt = adminModeration.indexOf('.from("reports")');
  assert.ok(validationAt >= 0 && updateAt > validationAt, 'reportId must be validated before report mutation');
});

test('public waitlist endpoint rejects malformed and oversized request bodies before database access', () => {
  assert.match(joinWaitlist, /const MAX_BODY_BYTES = 8_192/);
  assert.match(joinWaitlist, /request_too_large/);
  assert.match(joinWaitlist, /invalid_json/);
  assert.match(joinWaitlist, /new TextEncoder\(\)\.encode\(rawBody\)\.byteLength > MAX_BODY_BYTES/);
  const sizeGuardAt = joinWaitlist.indexOf('byteLength > MAX_BODY_BYTES');
  const tableAt = joinWaitlist.indexOf('.from("waitlist")');
  assert.ok(sizeGuardAt >= 0 && tableAt > sizeGuardAt, 'waitlist body must be bounded before database access');
});

test('public waitlist endpoint fails closed when Supabase configuration is missing', () => {
  assert.match(joinWaitlist, /if \(!supabaseUrl \|\| !anonKey\)/);
  assert.match(joinWaitlist, /temporarily_unavailable/);
  assert.match(joinWaitlist, /status: 503/);
});

test('Premium checkout coalesces rapid duplicate requests through a bounded Stripe idempotency key', () => {
  assert.match(createCheckoutSession, /const CHECKOUT_IDEMPOTENCY_WINDOW_MS = 5 \* 60 \* 1000/);
  assert.match(createCheckoutSession, /function checkoutIdempotencyKey\(userId: string, plan: string\)/);
  assert.match(createCheckoutSession, /Math\.floor\(Date\.now\(\) \/ CHECKOUT_IDEMPOTENCY_WINDOW_MS\)/);
  assert.match(createCheckoutSession, /'Idempotency-Key': checkoutIdempotencyKey\(user\.id, String\(plan\)\)/);
});
