import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const exists = (relative) => fs.existsSync(path.join(root, relative));
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

const app = JSON.parse(read('app.json'));
const eas = JSON.parse(read('eas.json'));

assert(app?.expo?.android?.package === 'com.bariccreator.sipmate', 'Android package changed from com.bariccreator.sipmate');
assert(Number.isInteger(app?.expo?.android?.versionCode) && app.expo.android.versionCode >= 1, 'Android versionCode must be a positive integer');
assert(eas?.cli?.requireCommit === true, 'EAS builds must require a committed source state');
assert(eas?.build?.production?.android?.buildType === 'app-bundle', 'Production Android build must remain an app bundle');
assert(eas?.submit?.production?.android?.track === 'internal', 'Production submit profile must remain on the internal Play track until explicit release promotion');
assert(eas?.submit?.production?.android?.releaseStatus === 'draft', 'Production submit profile must remain draft until explicit release promotion');

const privateMediaSurfaces = [
  ['src/app/nearby.tsx', 'NearbyProfileAvatar'],
  ['src/app/user-profile.tsx', 'UserProfileAvatar'],
  ['src/app/chat.tsx', 'ChatHeaderAvatar'],
  ['src/app/chats.tsx', 'PrivateProfileImage'],
  ['src/app/edit-profile.tsx', 'PrivateProfileImage'],
];

for (const [relative, boundary] of privateMediaSurfaces) {
  assert(exists(relative), `Release surface missing: ${relative}`);
  if (!exists(relative)) continue;
  const content = read(relative);
  assert(content.includes(boundary), `${relative} no longer uses ${boundary}`);
  assert(!/<Image\b/.test(content), `${relative} contains raw React Native Image profile-media rendering`);
  assert(!content.includes('refresh=${Date.now()}'), `${relative} still cache-busts profile media with Date.now`);
}

const cutover = read('supabase/migrations/20260905142100_cutover_avatars_bucket_private.sql');
for (const marker of [
  'private-media cutover blocked: avatars bucket is missing',
  'private.can_read_avatar_object(text)',
  'Authenticated avatar read',
  'profile avatar URL is missing avatar_path backfill',
  'gallery URL is missing storage_path backfill',
  'referenced profile avatar object is missing',
  'referenced gallery object is missing',
  'set public = false',
]) {
  assert(cutover.includes(marker), `Private-media cutover lost fail-closed marker: ${marker}`);
}

const ownerOnly = read('supabase/migrations/20260905142000_lock_direct_profile_reads_to_owner.sql');
assert(ownerOnly.includes('Users can view own profile'), 'Owner-only profile SELECT cutover is missing');
assert(ownerOnly.includes('Users can view own profile photos'), 'Owner-only profile photo SELECT cutover is missing');

const contracts = read('supabase/tests/security_contracts.test.sql');
const planMatch = contracts.match(/select plan\((\d+)\);/);
assert(planMatch && Number(planMatch[1]) >= 53, 'Database security contract plan regressed below 53');

const androidPremium = read('src/app/premium.android.tsx');
assert(!androidPremium.includes('create-checkout-session'), 'Android Premium screen exposes web Stripe checkout');
assert(!androidPremium.includes('stripe.com'), 'Android Premium screen directly references Stripe');

if (failures.length) {
  for (const failure of failures) console.error(`RELEASE_PREFLIGHT_FAIL: ${failure}`);
  console.error(`Release preflight failed with ${failures.length} blocking issue(s).`);
  process.exit(1);
}

console.log('RELEASE_PREFLIGHT_OK=true');
console.log(`Release preflight passed with database contract plan ${planMatch?.[1] ?? 'unknown'}.`);
