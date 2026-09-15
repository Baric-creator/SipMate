import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const announceCheers = fs.readFileSync('supabase/functions/announce-cheers/index.ts', 'utf8');
const discordOauth = fs.readFileSync('supabase/functions/discord-oauth/index.ts', 'utf8');

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
