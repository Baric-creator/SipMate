import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const layout = fs.readFileSync(new URL('../src/app/_layout.tsx', import.meta.url), 'utf8');

test('notification taps require an authenticated session before protected navigation', () => {
  const handlerStart = layout.indexOf('const openFromNotification = async');
  const getSession = layout.indexOf('supabase.auth.getSession()', handlerStart);
  const messageRoute = layout.indexOf("data?.type === 'message'", handlerStart);
  assert.ok(handlerStart >= 0, 'async notification handler is missing');
  assert.ok(getSession > handlerStart, 'notification handler does not read the current session');
  assert.ok(messageRoute > getSession, 'notification route is evaluated before session verification');
  assert.match(layout, /if \(!session\?\.user\) \{\s*router\.replace\('\/login'\)/s);
});

test('message notifications only pass the trusted conversation identifier', () => {
  assert.match(layout, /pathname: '\/chat', params: \{ conversationId: String\(data\.conversationId\) \}/);
  assert.doesNotMatch(layout, /conversationId: String\(data\.conversationId\), name:/);
  assert.doesNotMatch(layout, /conversationId: String\(data\.conversationId\), id:/);
});

test('cold-start notification routing is awaited before clearing the last response', () => {
  assert.match(layout, /await openFromNotification\(response\);\s*await Notifications\.clearLastNotificationResponseAsync\(\);/s);
});
