import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync('supabase/functions/send-message-notification/index.ts', 'utf8');

test('message push navigation payload only contains trusted routing data', () => {
  const payloadBlock = source.match(/data:\s*\{([\s\S]*?)\}\s*,\s*priority:\s*"high"/);
  assert.ok(payloadBlock, 'Could not find message push data payload');

  const body = payloadBlock[1];
  assert.match(body, /type:\s*"message"/);
  assert.match(body, /conversationId:\s*message\.conversation_id/);
  assert.doesNotMatch(body, /name\s*:/, 'Push payload must not carry display-name navigation identity');
  assert.doesNotMatch(body, /id\s*:/, 'Push payload must not carry sender-id navigation identity');
});

test('message notification still validates sender and conversation membership', () => {
  assert.match(source, /message\.sender_id !== caller\.id/);
  assert.match(source, /conversation\.user_one === caller\.id/);
  assert.match(source, /conversation\.user_two === caller\.id/);
  assert.match(source, /is_blocked_between/);
});
