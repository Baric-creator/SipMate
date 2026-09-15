import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync('supabase/functions/announce-cheers/index.ts', 'utf8');

test('Discord Cheers posting has bounded provider latency', () => {
  assert.match(source, /const DISCORD_TIMEOUT_MS = 8_000/);
  assert.match(source, /signal: AbortSignal\.timeout\(DISCORD_TIMEOUT_MS\)/);
});

test('Discord Cheers reservation is rolled back on thrown or non-2xx provider failure', () => {
  assert.match(source, /const rollbackReservation = async \(\) =>/);
  assert.match(source, /DISCORD POST REQUEST ERROR/);
  assert.match(source, /if \(!discordResponse\.ok\)/);

  const requestFailureAt = source.indexOf('DISCORD POST REQUEST ERROR');
  const requestRollbackAt = source.indexOf('await rollbackReservation()', requestFailureAt);
  assert.ok(requestFailureAt >= 0 && requestRollbackAt > requestFailureAt, 'thrown Discord request failures must release the reservation');

  const statusFailureAt = source.indexOf('if (!discordResponse.ok)');
  const statusRollbackAt = source.indexOf('await rollbackReservation()', statusFailureAt);
  assert.ok(statusFailureAt >= 0 && statusRollbackAt > statusFailureAt, 'non-2xx Discord responses must release the reservation');
});
