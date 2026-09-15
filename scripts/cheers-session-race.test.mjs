import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync(new URL('../src/app/cheers.tsx', import.meta.url), 'utf8');

test('Cheers revalidates the current account throughout async loading', () => {
  assert.match(source, /const isCurrentAccount = async \(\) =>/);
  assert.match(source, /currentSession\?\.user\?\.id === myId/);
  assert.ok((source.match(/await isCurrentAccount\(\)/g) ?? []).length >= 4);
});

test('Cheers chat opening revalidates account before navigation', () => {
  const createIndex = source.indexOf('findOrCreateConversation(myId, otherId)');
  const sessionIndex = source.indexOf('session: currentSession', createIndex);
  const routeIndex = source.indexOf("pathname: '/chat'", sessionIndex);
  assert.ok(createIndex >= 0 && sessionIndex > createIndex && routeIndex > sessionIndex);
  assert.match(source, /currentSession\?\.user\?\.id !== myId/);
});

test('Cheers chat navigation only passes conversation identity', () => {
  assert.match(source, /params: \{ conversationId \}/);
  assert.doesNotMatch(source, /params: \{ conversationId, id:/);
});
