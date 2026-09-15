import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync(new URL('../src/app/chats.tsx', import.meta.url), 'utf8');

test('chat list revalidates the account after the RPC before applying rows', () => {
  const rpcIndex = source.indexOf("supabase.rpc('get_chat_list')");
  const sessionIndex = source.indexOf('session: currentSession', rpcIndex);
  const guardIndex = source.indexOf('currentSession?.user?.id !== myId', sessionIndex);
  const setIndex = source.indexOf('setChats(items)', guardIndex);

  assert.ok(rpcIndex >= 0);
  assert.ok(sessionIndex > rpcIndex);
  assert.ok(guardIndex > sessionIndex);
  assert.ok(setIndex > guardIndex);
});

test('chat list also requires the request to remain current after revalidation', () => {
  assert.match(source, /if \(!isLatestRequest\(\) \|\| currentSession\?\.user\?\.id !== myId\) return/);
});
