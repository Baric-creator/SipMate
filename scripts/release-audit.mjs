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
  'src/app/profile.tsx',
  'src/app/chat.tsx',
  'src/app/chats.tsx',
  'src/app/cheers.tsx',
  'src/app/nearby.tsx',
  'src/app/edit-profile.tsx',
  'src/app/premium.android.tsx',
  'src/lib/push-notifications.ts',
  'src/lib/conversations.ts',
  'src/lib/presence.ts',
  'supabase/functions/send-cheers-notification/index.ts',
  'supabase/functions/send-message-notification/index.ts',
  'supabase/functions/register-push-token/index.ts',
  'supabase/migrations/20260914142559_add_active_session_window.sql',
  'supabase/functions/admin-moderation/index.ts',
  'website/founder.html',
  'website/premium.html',
  'supabase/functions/create-checkout-session/index.ts',
  'supabase/functions/create-customer-portal/index.ts',
  'docs/PREMIUM_BILLING_RELEASE.md',
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

if (exists('src/app/profile.tsx')) {
  const s = read('src/app/profile.tsx');
  assert(s.includes('stopActiveSession()'), 'Logout no longer stops the Active Nearby session for the authenticated account');
  assert(s.includes('unregisterCurrentDevicePushTokenAsync'), 'Logout no longer unregisters the current device push token');
}

if (exists('src/app/user-profile.tsx')) {
  const s = read('src/app/user-profile.tsx');
  assert(s.includes("supabase.from('reports').insert"), 'In-app report submission is missing');
  assert(s.includes("supabase.from('blocks').insert"), 'In-app block action is missing');
  assert(s.includes("supabase.from('cheers').insert"), 'Cheers send action is missing');
  assert(s.includes("supabase.functions.invoke('send-cheers-notification'"), 'Cheers push notification call is missing');
  assert(s.includes("supabase.rpc('is_blocked_between'") || s.includes("from('blocks')"), 'Profile safety flow no longer checks block state');
  assert(s.includes("pathname: '/chat'"), 'Mutual Cheers no longer opens chat');
  assert(s.includes('findOrCreateConversation'), 'Profile chat opening no longer uses race-safe conversation creation');
  assert(s.includes('chatOpeningRef.current'), 'Profile can navigate to the same chat twice after rapid taps');
  assert(s.includes('cheersSubmittingRef.current') && s.includes('finally'), 'Rapid taps can submit Cheers concurrently');
  assert(s.includes('profileRequestIdRef.current') && s.includes('requestId'), 'Stale profile responses can overwrite a newly opened user profile');
}

if (exists('src/lib/conversations.ts')) {
  const s = read('src/lib/conversations.ts');
  assert(s.includes("createError?.code === '23505'"), 'Concurrent conversation creation is no longer recovered');
  assert(s.includes("userOne = myId < otherId"), 'Conversation participant order is no longer canonical');
}

if (exists('src/app/chat.tsx')) {
  const s = read('src/app/chat.tsx');
  assert(s.includes("supabase.rpc('is_blocked_between'"), 'Chat no longer checks block state');
  assert(s.includes(".update({ read_at: new Date().toISOString() })"), 'Chat read receipts are missing');
  assert(s.includes("supabase.functions.invoke('send-message-notification'"), 'Chat push notification call is missing');
  assert(s.includes("event: 'INSERT'"), 'Realtime message INSERT subscription is missing');
  assert(s.includes("event: 'UPDATE'"), 'Realtime message UPDATE subscription is missing');
  assert(s.includes("event: 'typing'"), 'Realtime typing indicator broadcast is missing');
  assert(s.includes('maxLength={1000}'), 'Chat message length cap is missing');
  assert(s.includes('useFocusEffect'), 'Chat block state is no longer refreshed on focus');
  assert(s.includes('messageSendingRef.current'), 'Rapid taps can submit the same chat message concurrently');
  assert(s.includes('messagesRequestIdRef.current'), 'A stale chat load can overwrite a newly opened conversation');
  assert(s.includes('activeConversationIdRef.current'), 'Late realtime events can leak into a newly opened chat');
  assert(s.includes("select('user_one, user_two')") && s.includes('conversationVerified'), 'Chat identity is no longer verified from the conversation record');
  assert(!s.includes('const { conversationId, name, id }'), 'Chat trusts spoofable navigation identity parameters');
  assert(s.includes('if (!conversationVerified)') && s.includes('setLoading(true)'), 'Messages can load before conversation membership is verified');
}

if (exists('src/app/chats.tsx')) {
  const s = read('src/app/chats.tsx');
  assert(s.includes('chatsRequestIdRef.current') && s.includes('isLatestRequest()'), 'Stale chat-list refreshes can overwrite the current account');
  assert(s.includes('chatsUserIdRef.current') && s.includes('accountChanged'), 'Chat-list state can leak across account changes');
  assert(s.includes('useFocusEffect') && s.includes('removeChannel(channel)'), 'Chat-list realtime subscription is not scoped to the focused screen');
  assert(!s.includes('&id=') && !s.includes('&name='), 'Chat list still passes spoofable identity parameters');
}

if (exists('src/app/cheers.tsx')) {
  const s = read('src/app/cheers.tsx');
  assert(s.includes("status === 'Mutual Cheers'"), 'Mutual Cheers state is missing');
  assert(s.includes('findOrCreateConversation'), 'Cheers screen no longer uses race-safe conversation creation');
  assert(s.includes('chatOpeningRef.current'), 'Cheers can navigate to the same chat twice after rapid taps');
  assert(s.includes('cheersRequestIdRef.current') && s.includes('isLatestRequest()'), 'Stale Cheers refreshes can overwrite the current account');
  assert(s.includes('cheersUserIdRef.current') && s.includes('accountChanged'), 'Cheers Premium/list state can leak across account changes');
  assert(s.includes('useFocusEffect') && s.includes('removeChannel(channel)'), 'Cheers realtime subscription is not scoped to the focused screen');
  assert(s.includes("router.push('/premium')"), 'Received Cheers Premium reveal gate is missing');
}

if (exists('src/app/nearby.tsx')) {
  const s = read('src/app/nearby.tsx');
  assert(s.includes("supabase.rpc('get_nearby_profiles'"), 'Nearby no longer uses the privacy-safe server-side distance RPC');
  assert(s.includes("supabase.rpc('get_my_profile_location'"), 'Nearby no longer uses the private own-location RPC');
  assert(!/\.select\([^)]*latitude[^)]*longitude/i.test(s), 'Nearby directly selects precise profile coordinates');
  assert(s.includes('distance_km'), 'Nearby no longer consumes server-calculated distance');
  assert(s.includes('premiumActive && requestCustomLatitude !== null'), 'Nearby custom location uses stale Premium state instead of current entitlement');
  assert(s.includes('premiumActive && requestCustomLongitude !== null'), 'Nearby custom longitude uses stale Premium state instead of current entitlement');
  assert(!s.includes('isPremium && customLatitude !== null'), 'Nearby custom location still depends on stale React Premium state');
  assert(!s.includes('isPremium && customLongitude !== null'), 'Nearby custom longitude still depends on stale React Premium state');
  assert(s.includes('useFocusEffect') && s.includes('30_000'), 'Nearby no longer refreshes safely while focused');
  assert(!s.includes(".channel(\n        'nearby-profile-status'"), 'Nearby subscribes to every profile heartbeat and can trigger refresh storms');
  assert(s.includes('nearbyRequestIdRef') && s.includes('isLatestRequest()'), 'Nearby can apply stale results after account or filter changes');
  assert(s.includes('nearbyUserIdRef') && s.includes('accountChanged'), 'Nearby can leak session-scoped state across account changes');
}

if (exists('src/app/edit-profile.tsx')) {
  const s = read('src/app/edit-profile.tsx');
  assert(s.includes("supabase.rpc('get_my_profile_location'"), 'Edit Profile no longer uses the private own-location RPC');
  assert(!/from\('profiles'\)\.select\([^)]*latitude[^)]*longitude/i.test(s), 'Edit Profile directly selects coordinate columns from profiles');
  assert(s.includes('getActiveUntilIso') && s.includes('active_until: activeUntil'), 'Edit Profile Active toggle no longer creates a valid timed Active session');
  assert(s.includes('isProfileAvailable(loadedProfile)'), 'Edit Profile can display an expired Active session as enabled');
}

if (exists('src/app/premium.android.tsx')) {
  const s = read('src/app/premium.android.tsx');
  assert(!s.includes('create-checkout-session'), 'Android Premium exposes Stripe checkout');
  assert(!s.includes('stripe.com'), 'Android Premium directly references Stripe');
  assert(!s.includes('officialsipmate.com/premium'), 'Android Premium links to external web billing');
  assert(s.includes('does not sell digital subscriptions inside the app') || s.includes('keine digitalen Abos innerhalb der App') || s.includes('ne prodaje digitalne pretplate unutar aplikacije'), 'Android Premium consumption-only disclosure is missing');
  note('Android Premium remains consumption-only; purchases happen outside the Play-distributed app.');
}

if (exists('website/premium.html')) {
  const s = read('website/premium.html');
  assert(s.includes("signInWithPassword"), 'Premium website sign-in flow is missing');
  assert(s.includes("create-checkout-session"), 'Premium website checkout call is missing');
  assert(s.includes("create-customer-portal"), 'Premium website subscription management is missing');
  assert(s.includes("premium_subscriptions"), 'Premium website entitlement status check is missing');
}

if (exists('supabase/functions/create-checkout-session/index.ts')) {
  const s = read('supabase/functions/create-checkout-session/index.ts');
  assert(s.includes('premium.html?checkout=success'), 'Checkout success return no longer targets Premium website');
  assert(s.includes('premium.html?checkout=cancelled'), 'Checkout cancel return no longer targets Premium website');
  assert(s.includes('allowedOrigins'), 'Checkout origin allowlist is missing');
  assert(s.includes("eq('status', 'active')"), 'Checkout duplicate-active-subscription guard is missing');
}

if (exists('supabase/functions/create-customer-portal/index.ts')) {
  const s = read('supabase/functions/create-customer-portal/index.ts');
  assert(s.includes('/premium.html'), 'Customer Portal return no longer targets Premium website');
  assert(s.includes('allowedOrigins'), 'Customer Portal origin allowlist is missing');
}

if (exists('supabase/functions/send-message-notification/index.ts')) {
  const s = read('supabase/functions/send-message-notification/index.ts');
  assert(s.includes('auth.getUser(token)'), 'Message notification endpoint no longer validates caller JWT');
  assert(s.includes('is_blocked_between'), 'Message notification endpoint no longer checks blocked users');
  assert(s.includes('already_read'), 'Message notification endpoint no longer skips already-read messages');
  assert(s.includes('channelId: \"messages\"'), 'Message push no longer uses the messages channel');
}

if (exists('supabase/functions/register-push-token/index.ts')) {
  const s = read('supabase/functions/register-push-token/index.ts');
  assert(s.includes('auth.getUser(token)'), 'Push token endpoint no longer validates caller JWT');
  assert(s.includes('invalid_push_token'), 'Push token validation is missing');
  assert(s.includes('device_push_tokens'), 'Push token storage is missing');
  assert(s.includes('.upsert({') && s.includes('onConflict: \"token\"'), 'Push token registration is no longer idempotent');
}

if (exists('src/lib/push-notifications.ts')) {
  const s = read('src/lib/push-notifications.ts');
  assert(s.includes("Notifications.setNotificationChannelAsync('messages'"), 'Android message notification channel is missing');
  assert(s.includes("Notifications.setNotificationChannelAsync('cheers'"), 'Android Cheers notification channel is missing');
  assert(s.includes('Notifications.requestPermissionsAsync()'), 'Push notification permission request is missing');
  assert(s.includes("supabase.functions.invoke('register-push-token'"), 'Push token registration backend call is missing');
  assert(s.includes(".from('device_push_tokens')"), 'Push token logout cleanup is missing');
}

if (exists('src/app/_layout.tsx')) {
  const s = read('src/app/_layout.tsx');
  assert(s.includes('Notifications.addNotificationResponseReceivedListener'), 'Notification tap listener is missing');
  assert(s.includes('Notifications.clearLastNotificationResponseAsync'), 'Consumed cold-start notification response is not cleared');
  assert(s.includes("pathname: '/chat'"), 'Message notifications no longer deep-link into chat');
  assert(s.includes("pathname: '/user-profile'"), 'Cheers notifications no longer deep-link into sender profile');
  assert(s.includes('clearPresence()'), 'Presence cleanup is missing from app lifecycle');
}

if (exists('src/lib/presence.ts')) {
  const s = read('src/lib/presence.ts');
  assert(s.includes('ACTIVE_SESSION_DURATION_MS = 3 * 60 * 60 * 1000'), 'Nearby Active session duration changed unexpectedly');
  assert(s.includes('isProfileAvailable'), 'Active session availability helper is missing');
  assert(s.includes('export async function stopActiveSession()') && s.includes(".eq('id', session.user.id)"), 'Authenticated Active session cleanup is missing');
}

if (exists('supabase/functions/send-cheers-notification/index.ts')) {
  const s = read('supabase/functions/send-cheers-notification/index.ts');
  assert(s.includes('auth.getUser(token)'), 'Cheers notification endpoint no longer validates caller JWT');
  assert(s.includes('active_until'), 'Cheers notification endpoint no longer checks Active session expiry');
  assert(s.includes('recipient_inactive'), 'Cheers notification endpoint no longer skips inactive recipients');
  assert(s.includes('channelId: \"cheers\"'), 'Cheers push no longer uses the dedicated notification channel');
}

if (exists('supabase/migrations/20260914142559_add_active_session_window.sql')) {
  const s = read('supabase/migrations/20260914142559_add_active_session_window.sql');
  assert(s.includes('add column if not exists active_until timestamptz'), 'Active session database column migration is missing');
  assert(s.includes('p.active_until > now()'), 'Nearby RPC no longer honors Active session expiry');
  assert(!s.includes("p.last_seen_at >= now() - interval '90 seconds'"), 'Nearby RPC still expires users when the app goes to background');
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
