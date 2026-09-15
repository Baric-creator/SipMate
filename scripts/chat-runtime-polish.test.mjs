import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync(new URL('../src/app/chat.tsx', import.meta.url), 'utf8');

test('chat revalidates the authenticated user after conversation lookup', () => {
  assert.match(source, /const expectedUserId = session\.user\.id;/);
  assert.match(source, /currentSession\?\.user\?\.id !== expectedUserId/);
});

test('chat online status includes Active session expiry in initial and realtime profile data', () => {
  assert.match(source, /select\('name, is_active, last_seen_at, active_until, avatar_url'\)/);
  assert.match(source, /active_until\?: string \| null/);
});

test('message sending rejects an account switch after conversation verification', () => {
  assert.match(source, /session\.user\.id !== myUserId/);
  assert.match(source, /setConversationVerified\(false\);/);
});

test('block status load ignores late results after dependency cleanup', () => {
  assert.match(source, /async function checkBlockStatus\(\)[\s\S]*if \(!active\) return;[\s\S]*setIsBlocked\(Boolean\(data\)\);/);
});
