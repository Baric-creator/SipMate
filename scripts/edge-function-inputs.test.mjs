import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const announceCheers = fs.readFileSync('supabase/functions/announce-cheers/index.ts', 'utf8');
const discordOauth = fs.readFileSync('supabase/functions/discord-oauth/index.ts', 'utf8');
const registerPushToken = fs.readFileSync('supabase/functions/register-push-token/index.ts', 'utf8');
const sendMessageNotification = fs.readFileSync('supabase/functions/send-message-notification/index.ts', 'utf8');
const sendCheersNotification = fs.readFileSync('supabase/functions/send-cheers-notification/index.ts', 'utf8');

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
