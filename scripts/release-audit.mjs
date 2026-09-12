import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const notes = [];

const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));
const fail = (m) => failures.push(m);
const note = (m) => notes.push(m);
const assert = (condition, message) => { if (!condition) fail(message); };

for (const required of [
  'app.json',
  'eas.json',
  'google-services.json',
  'src/app/login.tsx',
  'src/app/register.tsx',
  'src/app/forgot-password.tsx',
  'src/app/reset-password.tsx',
  'src/app/delete-account.tsx',
  'src/app/premium.android.tsx',
  'src/lib/push-notifications.ts',
  'website/privacy.html',
  'website/terms.html',
  'website/delete-account.html',
  'docs/PLAY_REVIEWER_ACCESS.md',
  'docs/PLAY_STORE_LISTING.md',
  'docs/google-play-data-safety-answers.md',
  'docs/PLAY_CONTENT_RATING_TARGET_AUDIENCE.md',
]) assert(exists(required), `Missing release-critical file: ${required}`);

if (exists('app.json')) {
  const app = JSON.parse(read('app.json'));
  const expo = app.expo ?? {};
  const android = expo.android ?? {};
  const blocked = android.blockedPermissions ?? [];
  assert(expo.scheme === 'sipmate', 'Deep-link scheme must remain sipmate');
  assert(android.package === 'com.bariccreator.sipmate', 'Android package ID changed');
  assert(android.googleServicesFile === './google-services.json', 'Firebase google-services file path changed');
  assert((android.permissions ?? []).includes('ACCESS_COARSE_LOCATION'), 'Coarse location permission missing');
  assert((android.permissions ?? []).includes('ACCESS_FINE_LOCATION'), 'Fine location permission missing');
  for (const p of [
    'android.permission.CAMERA',
    'android.permission.RECORD_AUDIO',
    'android.permission.READ_MEDIA_IMAGES',
    'android.permission.READ_MEDIA_VIDEO',
    'android.permission.SYSTEM_ALERT_WINDOW',
  ]) assert(blocked.includes(p), `${p} is no longer explicitly blocked`);
}

if (exists('eas.json')) {
  const eas = JSON.parse(read('eas.json'));
  const build = eas?.build?.production?.android ?? {};
  const submit = eas?.submit?.production?.android ?? {};
  assert(build.buildType === 'app-bundle', 'Production Android output is not an AAB');
  assert(submit.track === 'internal', 'Release-day submit must start on internal track');
  assert(submit.releaseStatus === 'draft', 'Release-day submit must remain draft');
  assert(submit.changesNotSentForReview === true, 'Release-day submit could auto-send changes for review');
}

if (exists('src/app/register.tsx')) {
  const s = read('src/app/register.tsx');
  assert(s.includes('numericAge < 18'), '18+ registration gate is missing');
  assert(s.includes('acceptedTerms'), 'Terms acceptance gate is missing');
  assert(s.includes("router.push('/community-guidelines')"), 'Community Guidelines link is missing from registration');
  assert(s.includes("router.push('/terms')"), 'Terms link is missing from registration');
}

if (exists('src/app/forgot-password.tsx')) {
  const s = read('src/app/forgot-password.tsx');
  assert(s.includes("redirectTo: 'sipmate://reset-password'"), 'Password reset deep link changed unexpectedly');
}

if (exists('src/app/reset-password.tsx')) {
  const s = read('src/app/reset-password.tsx');
  assert(s.includes('supabase.auth.setSession'), 'Password recovery no longer establishes a recovery session');
  assert(s.includes('supabase.auth.updateUser({ password })'), 'Password update call is missing');
  assert(s.includes('supabase.auth.signOut()'), 'Password reset no longer signs out after success');
}

if (exists('src/app/delete-account.tsx')) {
  const s = read('src/app/delete-account.tsx');
  assert(s.includes("supabase.functions.invoke('delete-account'"), 'In-app delete-account flow is missing');
  assert(s.includes('Authorization: `Bearer ${accessToken}`'), 'Delete-account request is not authenticated');
}

if (exists('src/app/premium.android.tsx')) {
  const s = read('src/app/premium.android.tsx');
  assert(!s.includes('create-checkout-session'), 'Android Premium exposes Stripe checkout');
  assert(!s.includes('stripe.com'), 'Android Premium directly references Stripe');
  note('Android Premium remains release-gated to pricing display only.');
}

if (exists('src/lib/push-notifications.ts')) {
  const s = read('src/lib/push-notifications.ts');
  assert(s.includes("Notifications.setNotificationChannelAsync('messages'"), 'Android message notification channel is missing');
  assert(s.includes('Notifications.requestPermissionsAsync()'), 'Push notification permission request is missing');
  assert(s.includes("supabase.functions.invoke('register-push-token'"), 'Push token registration backend call is missing');
}

if (exists('src/app/_layout.tsx')) {
  const s = read('src/app/_layout.tsx');
  assert(s.includes('Notifications.addNotificationResponseReceivedListener'), 'Notification tap listener is missing');
  assert(s.includes("pathname: '/chat'"), 'Message notifications no longer deep-link into chat');
  assert(s.includes('clearPresence()'), 'Presence cleanup is missing from app lifecycle');
}

console.log(`Release audit completed with ${notes.length} note(s).`);
for (const m of notes) console.log(`NOTE: ${m}`);
if (failures.length) {
  for (const m of failures) console.error(`FAIL: ${m}`);
  console.error(`Release audit failed with ${failures.length} blocking issue(s).`);
  process.exit(1);
}
console.log('Release audit passed.');
