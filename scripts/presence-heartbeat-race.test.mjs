import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync('src/app/_layout.tsx', 'utf8');

test('presence heartbeat invalidates stale async starts', () => {
  assert.match(source, /let heartbeatGeneration = 0;/);
  assert.match(source, /const generation = \+\+heartbeatGeneration;/);
  assert.match(source, /generation !== heartbeatGeneration/);
});

test('backgrounding stops heartbeats without ending the active session', () => {
  assert.match(source, /AppState\.currentState !== 'active'[\s\S]*return;/);
  assert.doesNotMatch(source, /clearPresence/);
});

test('heartbeat interval never touches presence while app is not active', () => {
  assert.match(source, /setInterval\(\(\) => \{\s*if \(AppState\.currentState === 'active'\) \{\s*void touchPresence\(\);\s*\}\s*\}, 45_000\);/s);
});
