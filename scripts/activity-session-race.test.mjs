import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync(new URL('../src/app/activity.tsx', import.meta.url), 'utf8');

test('Activity invalidates stale loads when focus changes', () => {
  assert.match(source, /const activityLoadIdRef = useRef\(0\)/);
  assert.match(source, /activityLoadIdRef\.current \+= 1/);
});

test('Activity revalidates the authenticated account before applying async results', () => {
  assert.match(source, /const requestId = \+\+activityLoadIdRef\.current/);
  assert.match(source, /sessionAfterBaseQueries\?\.user\?\.id !== myId/);
  assert.match(source, /sessionAfterMessages\?\.user\?\.id !== myId/);
  assert.match(source, /finalSession\?\.user\?\.id !== myId/);
});

test('Activity message navigation only passes the verified conversation id', () => {
  assert.match(source, /params: \{ conversationId: item\.conversationId \}/);
  assert.doesNotMatch(source, /params:\s*\{[\s\S]*?conversationId: item\.conversationId,[\s\S]*?name: item\.name/);
});
