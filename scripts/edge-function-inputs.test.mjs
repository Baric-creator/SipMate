import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const announceCheers = fs.readFileSync('supabase/functions/announce-cheers/index.ts', 'utf8');

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
