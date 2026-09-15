import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync(new URL('../src/lib/presence.ts', import.meta.url), 'utf8');

test('presence heartbeat requires an unexpired Active session', () => {
  assert.match(source, /\.eq\('is_active', true\)[\s\S]*?\.gt\('active_until', now\)/);
});

test('presence heartbeat uses one timestamp for write and expiry guard', () => {
  assert.match(source, /const now = new Date\(\)\.toISOString\(\)/);
  assert.match(source, /update\(\{ last_seen_at: now \}\)/);
});
