import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

test('growth attribution survives website to app handoff', () => {
  const helper = fs.readFileSync('src/lib/growth-attribution.ts', 'utf8');
  const layout = fs.readFileSync('src/app/_layout.tsx', 'utf8');
  const claim = fs.readFileSync('supabase/functions/claim-attribution/index.ts', 'utf8');
  assert.match(helper, /searchParams\.get\('ref'\)/);
  assert.match(helper, /searchParams\.get\('src'\)/);
  assert.match(layout, /captureGrowthAttributionFromUrl/);
  assert.match(layout, /claim-attribution/);
  assert.match(claim, /referralAccepted/);
});

test('website provides a safe deep-link handoff', () => {
  const page = fs.readFileSync('website/open.html', 'utf8');
  assert.match(page, /sipmate:\/\//);
  assert.match(page, /allowedRoutes/);
  assert.match(page, /public-launch-status/);
});

test('remote config can gate maintenance update and key features', () => {
  const config = fs.readFileSync('src/lib/remote-config.ts', 'utf8');
  const layout = fs.readFileSync('src/app/_layout.tsx', 'utf8');
  const chat = fs.readFileSync('src/app/chat.tsx', 'utf8');
  assert.match(config, /get_app_remote_config/);
  assert.match(layout, /maintenanceMode/);
  assert.match(layout, /minAndroidVersionCode/);
  assert.match(layout, /featureDisabled/);
  assert.match(chat, /verifiedPhotosEnabled/);
});

test('notification preferences have a user control surface', () => {
  const screen = fs.readFileSync('src/app/notification-settings.tsx', 'utf8');
  const messagePush = fs.readFileSync('supabase/functions/send-message-notification/index.ts', 'utf8');
  const cheersPush = fs.readFileSync('supabase/functions/send-cheers-notification/index.ts', 'utf8');
  assert.match(screen, /notify_messages/);
  assert.match(screen, /notify_cheers/);
  assert.match(screen, /notify_photos/);
  assert.match(messagePush, /message_notifications_disabled/);
  assert.match(messagePush, /photo_notifications_disabled/);
  assert.match(cheersPush, /cheers_notifications_disabled/);
});

test('account safety and public community guidelines are present', () => {
  const safety = fs.readFileSync('src/app/account-safety.tsx', 'utf8');
  const guidelines = fs.readFileSync('website/community-guidelines.html', 'utf8');
  assert.match(safety, /notification-settings/);
  assert.match(safety, /blocked-users/);
  assert.match(safety, /delete-account/);
  assert.match(guidelines, /18\+ only/);
});

test('Founder tools expose app health and campaign attribution controls', () => {
  const founder = fs.readFileSync('website/founder.html', 'utf8');
  const health = fs.readFileSync('website/app-health.html', 'utf8');
  const campaigns = fs.readFileSync('website/campaign-links.html', 'utf8');
  assert.match(founder, /admin-app-config\.html/);
  assert.match(founder, /app-health\.html/);
  assert.match(founder, /campaign-links\.html/);
  assert.match(health, /get_admin_growth_funnel/);
  assert.match(campaigns, /qr-sticker-nuernberg/);
});
