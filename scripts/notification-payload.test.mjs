import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const messageSource = fs.readFileSync('supabase/functions/send-message-notification/index.ts', 'utf8');
const cheersSource = fs.readFileSync('supabase/functions/send-cheers-notification/index.ts', 'utf8');

test('message push navigation payload only contains trusted routing data', () => {
  const payloadBlock = messageSource.match(/data:\s*\{([\s\S]*?)\}\s*,\s*priority:\s*"high"/);
  assert.ok(payloadBlock, 'Could not find message push data payload');

  const body = payloadBlock[1];
  assert.match(body, /type:\s*"message"/);
  assert.match(body, /conversationId:\s*message\.conversation_id/);
  assert.doesNotMatch(body, /name\s*:/, 'Push payload must not carry display-name navigation identity');
  assert.doesNotMatch(body, /id\s*:/, 'Push payload must not carry sender-id navigation identity');
});

test('message notification still validates sender and conversation membership', () => {
  assert.match(messageSource, /message\.sender_id !== caller\.id/);
  assert.match(messageSource, /conversation\.user_one === caller\.id/);
  assert.match(messageSource, /conversation\.user_two === caller\.id/);
  assert.match(messageSource, /is_blocked_between/);
});

test('Cheers push carries only stable routing/state values, not display identity', () => {
  const payloadBlock = cheersSource.match(/data:\s*\{([^}]*)\}\s*,\s*priority:\s*"high"/);
  assert.ok(payloadBlock, 'Could not find Cheers push data payload');

  const body = payloadBlock[1];
  assert.match(body, /type:\s*"cheers"/);
  assert.match(body, /id:\s*caller\.id/);
  assert.match(body, /mutual/);
  assert.doesNotMatch(body, /name\s*:/, 'Cheers push payload must not carry a display name');
});

test('Cheers notification validates sender, block state and recipient Active window', () => {
  assert.match(cheersSource, /cheers\.sender_id !== caller\.id/);
  assert.match(cheersSource, /is_blocked_between/);
  assert.match(cheersSource, /recipientProfile\?\.is_active !== true/);
  assert.match(cheersSource, /activeUntil <= Date\.now\(\)/);
});

test('notification endpoints reject malformed JSON and malformed identifiers before table lookup', () => {
  assert.match(messageSource, /error: "invalid_json"/);
  assert.match(cheersSource, /error: "invalid_json"/);
  assert.match(messageSource, /UUID_PATTERN\.test\(messageId\)/);
  assert.match(cheersSource, /UUID_PATTERN\.test\(cheersId\)/);
  assert.ok(messageSource.indexOf('UUID_PATTERN.test(messageId)') < messageSource.indexOf('.from("messages")'));
  assert.ok(cheersSource.indexOf('UUID_PATTERN.test(cheersId)') < cheersSource.indexOf('.from("cheers")'));
});

test('notification fanout is bounded to the newest device tokens', () => {
  for (const source of [messageSource, cheersSource]) {
    assert.match(source, /const MAX_PUSH_TOKENS_PER_USER = 10;/);
    assert.match(source, /\.from\("device_push_tokens"\)[\s\S]*?\.eq\("user_id", recipientId\)[\s\S]*?\.order\("updated_at", \{ ascending: false \}\)[\s\S]*?\.limit\(MAX_PUSH_TOKENS_PER_USER\)/);
  }
});


test('verified photo notifications use a safe photo-specific preview', () => {
  assert.match(messageSource, /message_type, image_moderation_status/);
  assert.match(messageSource, /message\.message_type === "image" && message\.image_moderation_status === "approved"/);
  assert.match(messageSource, /skipped: "unapproved_image"/);
  assert.match(messageSource, /"📷 Verified photo"/);
  assert.match(messageSource, /messageType: isVerifiedImage \? "image" : "text"/);
});
