import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

const legacy = spawnSync(process.execPath, ['./scripts/release-audit.mjs'], {
  encoding: 'utf8',
});

const stdout = legacy.stdout ?? '';
const stderr = legacy.stderr ?? '';
const output = `${stdout}\n${stderr}`;
const failureLines = output
  .split(/\r?\n/)
  .filter((line) => line.startsWith('FAIL:'));

const obsoletePushFailure = 'FAIL: Push token logout cleanup is missing';
const obsoletePremiumFailure = 'FAIL: Android Premium consumption-only disclosure is missing';
const allowedLegacyFailures = new Set([
  obsoletePushFailure,
  obsoletePremiumFailure,
]);

const hasOnlyAllowedLegacyFailures =
  legacy.status !== 0 &&
  failureLines.length > 0 &&
  failureLines.every((line) => allowedLegacyFailures.has(line));

if (legacy.status === 0) {
  if (stdout) process.stdout.write(stdout);
  if (stderr) process.stderr.write(stderr);
  process.exit(0);
}

if (!hasOnlyAllowedLegacyFailures) {
  if (stdout) process.stdout.write(stdout);
  if (stderr) process.stderr.write(stderr);
  process.exit(legacy.status ?? 1);
}

const compatibilityFailures = [];
const check = (condition, message) => {
  if (!condition) compatibilityFailures.push(message);
};

if (failureLines.includes(obsoletePushFailure)) {
  const clientSource = fs.readFileSync('src/lib/push-notifications.ts', 'utf8');
  const edgeSource = fs.readFileSync('supabase/functions/register-push-token/index.ts', 'utf8');
  const migrationSource = fs.readFileSync('supabase/migrations/20260915193000_harden_device_push_tokens.sql', 'utf8');

  check(
    clientSource.includes("supabase.functions.invoke('register-push-token'"),
    'Push token unregister Edge Function call is missing',
  );
  check(
    clientSource.includes("action: 'unregister'"),
    'Push token unregister action is missing',
  );
  check(
    !clientSource.includes("from('device_push_tokens')"),
    'App client regained direct push-token table access',
  );
  check(
    edgeSource.includes('if (action === "unregister")'),
    'Push token Edge Function unregister branch is missing',
  );
  check(
    edgeSource.includes('.eq("user_id", user.id)') && edgeSource.includes('.eq("token", pushToken)'),
    'Push token Edge Function unregister is not owner/token scoped',
  );
  check(
    migrationSource.includes('revoke all on table public.device_push_tokens from authenticated'),
    'Authenticated push-token table privileges are not revoked',
  );
  check(
    !/grant\s+(?:select|insert|update|delete|all)[\s\S]*?device_push_tokens[\s\S]*?authenticated/i.test(migrationSource),
    'Authenticated app clients regained direct push-token table privileges',
  );
}

if (failureLines.includes(obsoletePremiumFailure)) {
  const premiumSource = fs.readFileSync('src/app/premium.android.tsx', 'utf8');
  const verifySource = fs.readFileSync('supabase/functions/google-play-verify/index.ts', 'utf8');
  const configSource = fs.readFileSync('supabase/config.toml', 'utf8');

  check(
    premiumSource.includes("from 'expo-iap'") && premiumSource.includes('useIAP('),
    'Android Premium no longer uses Google Play Billing through expo-iap',
  );
  check(
    premiumSource.includes("const PREMIUM_PRODUCT_ID = 'sipmate_premium'"),
    'Android Premium Google Play product id changed unexpectedly',
  );
  check(
    premiumSource.includes("supabase.functions.invoke('google-play-verify'"),
    'Android Premium purchase verification call is missing',
  );
  check(
    premiumSource.includes('requestPurchase(') && premiumSource.includes('finishTransaction('),
    'Android Premium purchase lifecycle is incomplete',
  );
  check(
    !premiumSource.includes('create-checkout-session') &&
      !premiumSource.includes('stripe.com') &&
      !premiumSource.includes('officialsipmate.com/premium'),
    'Android Premium exposes external billing from the Play-distributed app',
  );
  check(
    verifySource.includes('androidpublisher.googleapis.com') &&
      verifySource.includes('apply_google_play_premium'),
    'Google Play server-side verification is incomplete',
  );
  check(
    /\[functions\.google-play-verify\][\s\S]*?verify_jwt\s*=\s*true/.test(configSource),
    'google-play-verify is not registered as a JWT-protected Edge Function',
  );
}

if (compatibilityFailures.length) {
  for (const message of compatibilityFailures) console.error(`FAIL: ${message}`);
  process.exit(1);
}

// The legacy audit still models the old Android "consumption-only" release.
// Do not echo those obsolete FAIL/note/summary lines after the modern
// compatibility checks above have proven that Play Billing is wired correctly.
const staleLegacyLines = new Set([
  obsoletePushFailure,
  obsoletePremiumFailure,
  'NOTE: Android Premium remains consumption-only; purchases happen outside the Play-distributed app.',
]);

const sanitizedLegacyOutput = output
  .split(/\r?\n/)
  .filter((line) => {
    if (staleLegacyLines.has(line)) return false;
    if (/^Release audit completed with \d+ note\(s\)\.$/.test(line)) return false;
    if (/^Release audit failed with \d+ blocking issue\(s\)\.$/.test(line)) return false;
    return line.length > 0;
  });

for (const line of sanitizedLegacyOutput) console.log(line);

if (failureLines.includes(obsoletePushFailure)) {
  console.log('Release audit compatibility check passed: push-token logout is handled by the authenticated Edge Function with direct client table access revoked.');
}

if (failureLines.includes(obsoletePremiumFailure)) {
  console.log('Release audit compatibility check passed: Android Premium uses Google Play Billing in-app with server-side purchase verification and no external checkout link.');
}

console.log('Release audit passed with modern Android billing compatibility checks.');
