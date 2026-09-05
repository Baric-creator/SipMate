import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const warnings = [];
function read(relativePath) { return fs.readFileSync(path.join(root, relativePath), 'utf8'); }
function exists(relativePath) { return fs.existsSync(path.join(root, relativePath)); }
function fail(message) { failures.push(message); }
function warn(message) { warnings.push(message); }
function assert(condition, message) { if (!condition) fail(message); }
function walk(dir, files = []) { if (!fs.existsSync(dir)) return files; for (const entry of fs.readdirSync(dir, { withFileTypes: true })) { if (['node_modules', '.git', '.expo', 'dist', 'web-build', 'assets'].includes(entry.name)) continue; const full = path.join(dir, entry.name); if (entry.isDirectory()) walk(full, files); else files.push(full); } return files; }

const repoFiles = walk(root);
const textFiles = repoFiles.filter((file) => /\.(?:ts|tsx|js|mjs|json|md|toml|yml|yaml|env|txt)$/i.test(file));
const secretPatterns = [
  { name: 'Stripe live secret key', regex: /sk_live_[A-Za-z0-9]{16,}/g },
  { name: 'Stripe webhook signing secret', regex: /whsec_[A-Za-z0-9]{16,}/g },
  { name: 'private key material', regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
  { name: 'Google service-account private key field', regex: /"private_key"\s*:\s*"-----BEGIN PRIVATE KEY-----/g },
];
for (const file of textFiles) { const relative = path.relative(root, file).replaceAll('\\', '/'); if (relative === 'scripts/security-audit.mjs') continue; const content = fs.readFileSync(file, 'utf8'); for (const pattern of secretPatterns) { if (pattern.regex.test(content)) fail(`${pattern.name} found in ${relative}`); pattern.regex.lastIndex = 0; } }

const clientFiles = walk(path.join(root, 'src')).filter((file) => /\.(?:ts|tsx|js|mjs)$/i.test(file));
for (const file of clientFiles) {
  const relative = path.relative(root, file).replaceAll('\\', '/'); const content = fs.readFileSync(file, 'utf8');
  for (const forbidden of ['SUPABASE_SERVICE_ROLE_KEY', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'STRIPE_SUBSCRIPTION_WEBHOOK_SECRET']) if (content.includes(forbidden)) fail(`Server-only env name ${forbidden} referenced by client source ${relative}`);
  if (relative !== 'src/lib/profile-media.ts' && /\.storage\s*\.from\(\s*['"]avatars['"]\s*\)\s*\.getPublicUrl\s*\(/s.test(content)) fail(`Direct avatars getPublicUrl bypasses profile-media boundary in ${relative}`);
  if (relative !== 'src/lib/profile-media.ts' && relative !== 'src/components/private-profile-image.tsx' && content.includes('/storage/v1/object/public/avatars/')) fail(`Hard-coded public avatar Storage URL bypasses profile-media boundary in ${relative}`);
}

for (const relative of ['src/app/chats.tsx', 'src/app/edit-profile.tsx']) { if (!exists(relative)) continue; const content = read(relative); assert(content.includes('PrivateProfileImage'), `${relative} must render profile media through PrivateProfileImage`); assert(!/\bImage\s*,/.test(content) && !/<Image\b/.test(content), `${relative} still contains raw React Native Image profile-media rendering`); }
for (const relative of ['src/app/nearby.tsx', 'src/app/user-profile.tsx']) { if (!exists(relative)) continue; const content = read(relative); if (!content.includes('PrivateProfileImage') || /<Image\b/.test(content)) warn(`${relative} still has raw profile-media rendering; private bucket cutover remains blocked`); }

assert(exists('src/lib/profile-media.ts'), 'Central profile-media helper is missing');
if (exists('src/lib/profile-media.ts')) {
  const media = read('src/lib/profile-media.ts');
  assert(media.includes('createSignedUrl'), 'Profile media helper no longer creates signed URLs');
  assert(media.includes('options?.preferSigned ?? true'), 'Signed profile media is no longer the default');
  assert(media.includes('5 * 60'), 'Signed profile media TTL changed from the privacy-hardened five-minute default');
  assert(media.includes("SIGNED_AVATAR_MARKER = '/storage/v1/object/sign/avatars/'"), 'Signed avatar URLs can no longer be normalized for renewal');
  assert(media.includes('[PUBLIC_AVATAR_MARKER, SIGNED_AVATAR_MARKER]'), 'Profile media path parsing no longer accepts both legacy public and signed SipMate avatar URLs');
  assert(media.includes('process.env.EXPO_PUBLIC_SUPABASE_URL'), 'Profile media parser no longer anchors managed URLs to configured Supabase');
  assert(media.includes('new URL'), 'Profile media parser no longer parses managed media URLs structurally');
  assert(media.includes('parsed.origin !== SUPABASE_ORIGIN'), 'Profile media parser no longer rejects lookalike external Storage URLs');
  assert(media.includes('parsed.pathname.startsWith(marker)'), 'Profile media parser no longer requires the Storage marker at the pathname boundary');
}
assert(exists('src/components/private-profile-image.tsx'), 'PrivateProfileImage component is missing');
if (exists('src/components/private-profile-image.tsx')) { const privateImage = read('src/components/private-profile-image.tsx'); assert(privateImage.includes('resolveProfileMediaUrl'), 'PrivateProfileImage bypasses the central media resolver'); assert(privateImage.includes('getProfileMediaStoragePath'), 'PrivateProfileImage no longer classifies managed SipMate Storage references centrally'); assert(privateImage.includes('managedStoragePath'), 'PrivateProfileImage no longer tracks whether media is managed Storage'); assert(privateImage.includes('preferSigned: true'), 'PrivateProfileImage no longer explicitly requires signed media'); assert(privateImage.includes('SIGNED_MEDIA_REFRESH_MS = 4 * 60 * 1000'), 'PrivateProfileImage no longer refreshes before the five-minute signed URL expiry'); assert(privateImage.includes('setTimeout'), 'PrivateProfileImage signed URL refresh timer is missing'); }

const stripeClaimMigration = 'supabase/migrations/20260904180100_add_atomic_stripe_webhook_claim_api.sql';
const stripeReassertMigration = 'supabase/migrations/20260904195000_reassert_stripe_webhook_rpc_caller_identity.sql';
assert(exists(stripeReassertMigration), 'Post-claim Stripe caller hardening migration is missing');
if (exists(stripeClaimMigration) && exists(stripeReassertMigration)) { const claim = read(stripeClaimMigration).toLowerCase(); const reassert = read(stripeReassertMigration).toLowerCase(); assert(claim.includes('current_user'), 'Historical Stripe claim migration changed; re-audit migration ordering'); assert(!reassert.includes("if current_user not in"), 'Final Stripe webhook RPC hardening still authorizes with SECURITY DEFINER current_user'); assert(reassert.includes("coalesce(auth.role(), '') <> 'service_role'"), 'Final Stripe webhook RPC hardening no longer validates the JWT service role'); assert(reassert.includes("on conflict (event_id) do nothing"), 'Hardened Stripe claim lost atomic insert semantics'); assert(reassert.includes("for update"), 'Hardened Stripe claim lost row locking for retries'); assert(reassert.includes("v_status='processed'"), 'Hardened Stripe claim lost processed-event idempotency'); assert(reassert.includes('attempts=attempts+1'), 'Hardened Stripe claim lost retry attempt accounting'); assert(reassert.includes("last_error=left(coalesce(p_error,'unknown error'),2000)"), 'Hardened Stripe failure handler changed bounded error persistence'); assert(path.basename(stripeReassertMigration) > path.basename(stripeClaimMigration), 'Stripe caller hardening must replay after the historical claim API migration'); }

assert(exists('.env.example'), '.env.example is missing');
if (exists('.env.example')) { const envExample = read('.env.example'); const assignments = envExample.split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith('#') && line.includes('=')); for (const assignment of assignments) { const key = assignment.split('=', 1)[0]; if (!key.startsWith('EXPO_PUBLIC_')) fail(`Non-public variable ${key} is assigned in .env.example`); } assert(envExample.includes('EXPO_PUBLIC_SUPABASE_URL='), '.env.example is missing EXPO_PUBLIC_SUPABASE_URL'); assert(envExample.includes('EXPO_PUBLIC_SUPABASE_ANON_KEY='), '.env.example is missing EXPO_PUBLIC_SUPABASE_ANON_KEY'); }
assert(exists('app.json'), 'app.json is missing');
if (exists('app.json')) { const app = JSON.parse(read('app.json')); const android = app?.expo?.android ?? {}; const permissions = android.permissions ?? []; const blockedPermissions = android.blockedPermissions ?? []; assert(android.package === 'com.bariccreator.sipmate', 'Android package ID changed unexpectedly'); assert(!permissions.includes('ACCESS_BACKGROUND_LOCATION'), 'Background location permission is configured'); assert(!permissions.includes('RECORD_AUDIO'), 'Microphone permission is configured'); assert(blockedPermissions.includes('android.permission.RECORD_AUDIO'), 'RECORD_AUDIO is no longer explicitly blocked'); }
assert(exists('eas.json'), 'eas.json is missing');
if (exists('eas.json')) { const eas = JSON.parse(read('eas.json')); const production = eas?.build?.production?.android ?? {}; const submit = eas?.submit?.production?.android ?? {}; assert(eas?.cli?.requireCommit === true, 'EAS builds no longer require a clean committed state'); assert(production.buildType === 'app-bundle', 'Production Android build is not app-bundle'); assert(submit.track === 'internal', 'Google Play submit track is not internal'); assert(submit.releaseStatus === 'draft', 'Google Play submission is not draft'); assert(submit.changesNotSentForReview === true, 'Google Play submission may be sent for review automatically'); }
assert(exists('supabase/functions/delete-account/index.ts'), 'Delete-account Edge Function is missing');
if (exists('supabase/functions/delete-account/index.ts')) { const deletion = read('supabase/functions/delete-account/index.ts'); assert(deletion.includes("ACCOUNT_DELETION_ENABLED') !== 'true'"), 'Account deletion safety gate is missing or changed'); assert(deletion.includes('auth.admin.deleteUser'), 'Delete-account function no longer deletes the Auth identity'); }
for (const fn of ['create-checkout-session', 'create-customer-portal']) { const relative = `supabase/functions/${fn}/index.ts`; assert(exists(relative), `${fn} Edge Function is missing`); if (!exists(relative)) continue; const content = read(relative); assert(content.includes("Deno.env.get('APP_WEB_URL')"), `${fn} does not anchor production redirects to APP_WEB_URL`); assert(content.includes("parsed.hostname === 'localhost'") || content.includes("parsed.hostname === '127.0.0.1'"), `${fn} has no explicit local development-origin handling`); }
assert(exists('supabase/functions/stripe-webhook/index.ts'), 'Stripe webhook Edge Function is missing');
if (exists('supabase/functions/stripe-webhook/index.ts')) { const webhook = read('supabase/functions/stripe-webhook/index.ts'); assert(webhook.includes('constructEventAsync'), 'Stripe webhook signature verification is missing'); assert(webhook.includes('STRIPE_WEBHOOK_SECRET'), 'Primary Stripe webhook secret is not referenced'); assert(webhook.includes('SUPABASE_SERVICE_ROLE_KEY'), 'Webhook no longer uses server-side service role access'); }
assert(exists('src/app/premium.android.tsx'), 'Android Premium release-gate screen is missing');
if (exists('src/app/premium.android.tsx')) { const premiumAndroid = read('src/app/premium.android.tsx'); assert(!premiumAndroid.includes('create-checkout-session'), 'Android Premium screen exposes web Stripe checkout'); assert(!premiumAndroid.includes('stripe.com'), 'Android Premium screen directly references Stripe'); }
if (exists('supabase/config.toml')) { const config = read('supabase/config.toml'); const functionJwtSetting = (name) => { const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); const match = config.match(new RegExp(`\\[functions\\.${escaped}\\]([\\s\\S]*?)(?=\\n\\[functions\\.|$)`)); return match?.[1]?.match(/verify_jwt\s*=\s*(true|false)/)?.[1] ?? null; }; for (const fn of ['create-checkout-session', 'create-customer-portal', 'delete-account']) assert(functionJwtSetting(fn) === 'true', `${fn} must keep platform JWT verification enabled`); assert(functionJwtSetting('stripe-webhook') === 'false', 'Stripe webhook must remain callable without a user JWT so Stripe can deliver signed events'); }
for (const file of clientFiles) { const relative = path.relative(root, file).replaceAll('\\', '/'); const content = fs.readFileSync(file, 'utf8'); if (/\bwindow\.(?:alert|confirm)\s*\(/.test(content)) warn(`Browser-only alert/confirm still used in ${relative}`); if (/\.select\(\s*['"]\*['"]\s*\)/.test(content)) warn(`Broad select('*') found in ${relative}; confirm every returned column is intended for the client`); }
console.log(`Security audit checked ${textFiles.length} repository text files.`); for (const message of warnings) console.warn(`WARN: ${message}`); if (failures.length) { for (const message of failures) console.error(`FAIL: ${message}`); console.error(`Security audit failed with ${failures.length} blocking issue(s).`); process.exit(1); } console.log(`Security audit passed with ${warnings.length} warning(s).`);
