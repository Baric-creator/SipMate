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
  'src/app/_layout.tsx',
  'src/app/login.tsx',
  'src/app/register.tsx',
  'src/app/forgot-password.tsx',
  'src/app/reset-password.tsx',
  'src/app/delete-account.tsx',
  'src/app/user-profile.tsx',
  'src/app/chat.tsx',
  'src/app/cheers.tsx',
  'src/app/premium.android.tsx',
  'src/lib/push-notifications.ts',
  'supabase/functions/admin-moderation/index.ts',
  'website/founder.html',
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

if (exists('src/app/user-profile.tsx')) {
  const s = read('src/app/user-profile.tsx');
  assert(s.includes("supabase.from('reports').insert"), 'In-app report submission is missing');
  assert(s.includes("supabase.from('blocks').insert"), 'In-app block action is missing');
  assert(s.includes("supabase.from('cheers').insert"), 'Cheers send action is missing');
  assert(s.includes("supabase.rpc('is_blocked_between'") || s.includes("from('blocks')"), 'Profile safety flow no longer checks block state');
  assert(s.includes("pathname: '/chat'"), 'Mutual Cheers no longer opens chat');
}

if (exists('src/app/chat.tsx')) {
  const s = read('src/app/chat.tsx');
  assert(s.includes("supabase.rpc('is_blocked_between'"), 'Chat no longer checks block state');
  assert(s.includes(".update({ read_at: new Date().toISOString() })"), 'Chat read receipts are missing');
  assert(s.includes("supabase.functions.invoke('send-message-notification'"), 'Chat push notification call is missing');
  assert(s.includes("event: 'INSERT'"), 'Realtime message INSERT subscription is missing');
  assert(s.includes("event: 'UPDATE'"), 'Realtime message UPDATE subscription is missing');
  assert(s.includes("event: 'typing'"), 'Realtime typing indicator broadcast is missing');
}

if (exists('src/app/cheers.tsx')) {
  const s = read('src/app/cheers.tsx');
  assert(s.includes("status === 'Mutual Cheers'"), 'Mutual Cheers state is missing');
  assert(s.includes("from('conversations')"), 'Cheers screen can no longer open/create chat conversations');
  assert(s.includes("router.push('/premium')"), 'Received Cheers Premium reveal gate is missing');
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
  assert(s.includes(".from('device_push_tokens')"), 'Push token logout cleanup is missing');
}

if (exists('src/app/_layout.tsx')) {
  const s = read('src/app/_layout.tsx');
  assert(s.includes('Notifications.addNotificationResponseReceivedListener'), 'Notification tap listener is missing');
  assert(s.includes("pathname: '/chat'"), 'Message notifications no longer deep-link into chat');
  assert(s.includes('clearPresence()'), 'Presence cleanup is missing from app lifecycle');
}

if (exists('supabase/functions/admin-moderation/index.ts')) {
  const s = read('supabase/functions/admin-moderation/index.ts');
  assert(s.includes('ADMIN_EMAILS'), 'Moderation endpoint no longer restricts founder access');
  assert(s.includes('authClient.auth.getUser(token)'), 'Moderation endpoint no longer validates caller JWT');
  assert(s.includes('reviewed_at'), 'Moderation endpoint no longer writes audit timestamps');
  assert(s.includes('reviewed_by'), 'Moderation endpoint no longer records reviewer identity');
  assert(s.includes('ALLOWED_STATUSES'), 'Moderation endpoint no longer constrains report statuses');
}

if (exists('website/founder.html')) {
  const s = read('website/founder.html');
  assert(s.includes('data-tab="moderation"'), 'Founder dashboard moderation tab is missing');
  assert(s.includes('/functions/v1/admin-moderation'), 'Founder dashboard moderation backend is missing');
  assert(s.includes('data-report-action="reviewed"'), 'Founder dashboard cannot mark reports reviewed');
  assert(s.includes('data-report-action="dismissed"'), 'Founder dashboard cannot dismiss reports');
}

console.log(`Release audit completed with ${notes.length} note(s).`);
for (const m of notes) console.log(`NOTE: ${m}`);
if (failures.length) {
  for (const m of failures) console.error(`FAIL: ${m}`);
  console.error(`Release audit failed with ${failures.length} blocking issue(s).`);
  process.exit(1);
}
console.log('Release audit passed.');
