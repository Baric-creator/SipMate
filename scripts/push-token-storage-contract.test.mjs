import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const migration = fs.readFileSync('supabase/migrations/20260915204000_bound_device_push_token_length.sql', 'utf8');

test('device push tokens stay bounded at the database boundary', () => {
  assert.match(migration, /device_push_tokens_token_length_check/);
  assert.match(migration, /char_length\(token\) between 1 and 256/);
  assert.match(migration, /not valid/);
});
