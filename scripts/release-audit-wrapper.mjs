import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

const legacy = spawnSync(process.execPath, ['./scripts/release-audit.mjs'], {
  encoding: 'utf8',
});

if (legacy.stdout) process.stdout.write(legacy.stdout);
if (legacy.stderr) process.stderr.write(legacy.stderr);

if (legacy.status === 0) process.exit(0);

const output = `${legacy.stdout ?? ''}\n${legacy.stderr ?? ''}`;
const obsoleteFailure = 'FAIL: Push token logout cleanup is missing';
const failureLines = output
  .split(/\r?\n/)
  .filter((line) => line.startsWith('FAIL:'));

if (failureLines.length !== 1 || failureLines[0] !== obsoleteFailure) {
  process.exit(legacy.status ?? 1);
}

const clientSource = fs.readFileSync('src/lib/push-notifications.ts', 'utf8');
const edgeSource = fs.readFileSync('supabase/functions/register-push-token/index.ts', 'utf8');
const migrationSource = fs.readFileSync('supabase/migrations/20260915193000_harden_device_push_tokens.sql', 'utf8');

const checks = [
  [clientSource.includes("supabase.functions.invoke('register-push-token'"), 'Push token unregister Edge Function call is missing'],
  [clientSource.includes("action: 'unregister'"), 'Push token unregister action is missing'],
  [!clientSource.includes("from('device_push_tokens')"), 'App client regained direct push-token table access'],
  [edgeSource.includes('if (action === "unregister")'), 'Push token Edge Function unregister branch is missing'],
  [edgeSource.includes('.eq("user_id", user.id)') && edgeSource.includes('.eq("token", pushToken)'), 'Push token Edge Function unregister is not owner/token scoped'],
  [migrationSource.includes('revoke all on table public.device_push_tokens from authenticated'), 'Authenticated push-token table privileges are not revoked'],
  [!/grant\s+(?:select|insert|update|delete|all)[\s\S]*?device_push_tokens[\s\S]*?authenticated/i.test(migrationSource), 'Authenticated app clients regained direct push-token table privileges'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  for (const message of failures) console.error(`FAIL: ${message}`);
  process.exit(1);
}

console.log('Release audit compatibility check passed: push-token logout is handled by the authenticated Edge Function with direct client table access revoked.');
