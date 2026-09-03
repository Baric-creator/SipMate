import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const warnings = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function fail(message) {
  failures.push(message);
}

function warn(message) {
  warnings.push(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', '.expo', 'dist', 'web-build', 'assets'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else files.push(full);
  }
  return files;
}

const repoFiles = walk(root);
const textFiles = repoFiles.filter((file) => /\.(?:ts|tsx|js|mjs|json|md|toml|yml|yaml|env|txt)$/i.test(file));

// High-confidence credential signatures. These should never exist in committed source.
const secretPatterns = [
  { name: 'Stripe live secret key', regex: /sk_live_[A-Za-z0-9]{16,}/g },
  { name: 'Stripe webhook signing secret', regex: /whsec_[A-Za-z0-9]{16,}/g },
  { name: 'private key material', regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
  { name: 'Google service-account private key field', regex: /"private_key"\s*:\s*"-----BEGIN PRIVATE KEY-----/g },
];

for (const file of textFiles) {
  const relative = path.relative(root, file).replaceAll('\\', '/');
  const content = fs.readFileSync(file, 'utf8');
  for (const pattern of secretPatterns) {
    if (pattern.regex.test(content)) fail(`${pattern.name} found in ${relative}`);
    pattern.regex.lastIndex = 0;
  }
}

// Server-only credentials must not be referenced by client bundle source.
const clientFiles = walk(path.join(root, 'src')).filter((file) => /\.(?:ts|tsx|js|mjs)$/i.test(file));
for (const file of clientFiles) {
  const relative = path.relative(root, file).replaceAll('\\', '/');
  const content = fs.readFileSync(file, 'utf8');
  for (const forbidden of ['SUPABASE_SERVICE_ROLE_KEY', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'STRIPE_SUBSCRIPTION_WEBHOOK_SECRET']) {
    if (content.includes(forbidden)) fail(`Server-only env name ${forbidden} referenced by client source ${relative}`);
  }
}

assert(exists('.env.example'), '.env.example is missing');
if (exists('.env.example')) {
  const envExample = read('.env.example');
  const assignments = envExample
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && line.includes('='));
  for (const assignment of assignments) {
    const key = assignment.split('=', 1)[0];
    if (!key.startsWith('EXPO_PUBLIC_')) fail(`Non-public variable ${key} is assigned in .env.example`);
  }
  assert(envExample.includes('EXPO_PUBLIC_SUPABASE_URL='), '.env.example is missing EXPO_PUBLIC_SUPABASE_URL');
  assert(envExample.includes('EXPO_PUBLIC_SUPABASE_ANON_KEY='), '.env.example is missing EXPO_PUBLIC_SUPABASE_ANON_KEY');
}

assert(exists('app.json'), 'app.json is missing');
if (exists('app.json')) {
  const app = JSON.parse(read('app.json'));
  const android = app?.expo?.android ?? {};
  const permissions = android.permissions ?? [];
  const blockedPermissions = android.blockedPermissions ?? [];
  assert(android.package === 'com.bariccreator.sipmate', 'Android package ID changed unexpectedly');
  assert(!permissions.includes('ACCESS_BACKGROUND_LOCATION'), 'Background location permission is configured');
  assert(!permissions.includes('RECORD_AUDIO'), 'Microphone permission is configured');
  assert(blockedPermissions.includes('android.permission.RECORD_AUDIO'), 'RECORD_AUDIO is no longer explicitly blocked');
}

assert(exists('eas.json'), 'eas.json is missing');
if (exists('eas.json')) {
  const eas = JSON.parse(read('eas.json'));
  const production = eas?.build?.production?.android ?? {};
  const submit = eas?.submit?.production?.android ?? {};
  assert(eas?.cli?.requireCommit === true, 'EAS builds no longer require a clean committed state');
  assert(production.buildType === 'app-bundle', 'Production Android build is not app-bundle');
  assert(submit.track === 'internal', 'Google Play submit track is not internal');
  assert(submit.releaseStatus === 'draft', 'Google Play submission is not draft');
  assert(submit.changesNotSentForReview === true, 'Google Play submission may be sent for review automatically');
}

assert(exists('supabase/functions/delete-account/index.ts'), 'Delete-account Edge Function is missing');
if (exists('supabase/functions/delete-account/index.ts')) {
  const deletion = read('supabase/functions/delete-account/index.ts');
  assert(deletion.includes("ACCOUNT_DELETION_ENABLED') !== 'true'"), 'Account deletion safety gate is missing or changed');
  assert(deletion.includes('auth.admin.deleteUser'), 'Delete-account function no longer deletes the Auth identity');
}

for (const fn of ['create-checkout-session', 'create-customer-portal']) {
  const relative = `supabase/functions/${fn}/index.ts`;
  assert(exists(relative), `${fn} Edge Function is missing`);
  if (!exists(relative)) continue;
  const content = read(relative);
  assert(content.includes("Deno.env.get('APP_WEB_URL')"), `${fn} does not anchor production redirects to APP_WEB_URL`);
  assert(content.includes("parsed.hostname === 'localhost'") || content.includes("parsed.hostname === '127.0.0.1'"), `${fn} has no explicit local development-origin handling`);
}

assert(exists('supabase/functions/stripe-webhook/index.ts'), 'Stripe webhook Edge Function is missing');
if (exists('supabase/functions/stripe-webhook/index.ts')) {
  const webhook = read('supabase/functions/stripe-webhook/index.ts');
  assert(webhook.includes('constructEventAsync'), 'Stripe webhook signature verification is missing');
  assert(webhook.includes('STRIPE_WEBHOOK_SECRET'), 'Primary Stripe webhook secret is not referenced');
  assert(webhook.includes('SUPABASE_SERVICE_ROLE_KEY'), 'Webhook no longer uses server-side service role access');
}

assert(exists('src/app/premium.android.tsx'), 'Android Premium release-gate screen is missing');
if (exists('src/app/premium.android.tsx')) {
  const premiumAndroid = read('src/app/premium.android.tsx');
  assert(!premiumAndroid.includes('create-checkout-session'), 'Android Premium screen exposes web Stripe checkout');
  assert(!premiumAndroid.includes('stripe.com'), 'Android Premium screen directly references Stripe');
}

if (exists('supabase/config.toml')) {
  const config = read('supabase/config.toml');
  const manualJwtFunctions = [...config.matchAll(/\[functions\.([^\]]+)\][\s\S]*?verify_jwt\s*=\s*false/g)].map((match) => match[1]);
  if (manualJwtFunctions.length) warn(`Functions with verify_jwt=false require their own authentication/signature checks: ${manualJwtFunctions.join(', ')}`);
}

for (const file of clientFiles) {
  const relative = path.relative(root, file).replaceAll('\\', '/');
  const content = fs.readFileSync(file, 'utf8');
  if (/\bwindow\.(?:alert|confirm)\s*\(/.test(content)) warn(`Browser-only alert/confirm still used in ${relative}`);
  if (/\.select\(\s*['"]\*['"]\s*\)/.test(content)) warn(`Broad select('*') found in ${relative}; confirm every returned column is intended for the client`);
}

console.log(`Security audit checked ${textFiles.length} repository text files.`);
for (const message of warnings) console.warn(`WARN: ${message}`);

if (failures.length) {
  for (const message of failures) console.error(`FAIL: ${message}`);
  console.error(`Security audit failed with ${failures.length} blocking issue(s).`);
  process.exit(1);
}

console.log(`Security audit passed with ${warnings.length} warning(s).`);
