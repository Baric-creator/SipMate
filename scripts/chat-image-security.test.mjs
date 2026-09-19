import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const chat = fs.readFileSync('src/app/chat.tsx', 'utf8');
const sendImage = fs.readFileSync('supabase/functions/send-chat-image/index.ts', 'utf8');
const imageUrl = fs.readFileSync('supabase/functions/chat-image-url/index.ts', 'utf8');
const migration = fs.readFileSync('supabase/migrations/20260918064500_add_chat_image_reports.sql', 'utf8');

test('verified chat photos require both Premium users and mutual Cheers server-side', () => {
  assert.match(sendImage, /both_premium_required/);
  assert.match(sendImage, /mutual_cheers_required/);
  assert.match(sendImage, /premiumActive\(mine\)/);
  assert.match(sendImage, /premiumActive\(other\)/);
});

test('verified chat photos are AI and safety checked before becoming messages', () => {
  assert.match(sendImage, /models", "genai,nudity-2\.1"/);
  assert.match(sendImage, /aiScore >= 0\.70/);
  assert.match(sendImage, /nsfwScore >= 0\.65/);
  assert.match(sendImage, /AbortSignal\.timeout\(12000\)/);
  assert.match(sendImage, /image_moderation_status: "approved"/);
});

test('chat photos stay private and are served with short-lived signed URLs', () => {
  assert.match(imageUrl, /createSignedUrl\(message\.image_path,300\)/);
  assert.match(imageUrl, /is_blocked_between/);
  assert.match(imageUrl, /UUID_RE\.test\(messageId\)/);
});

test('chat UI exposes reporting only for received image messages', () => {
  assert.match(chat, /!mine && \(/);
  assert.match(chat, /reportChatImage\(item\)/);
  assert.match(chat, /report_kind: 'chat_image'/);
  assert.match(chat, /reported_message_id: String\(message\.id\)/);
});

test('chat image reports keep message linkage and prevent duplicate reports per reporter', () => {
  assert.match(migration, /reported_message_id uuid references public\.messages\(id\) on delete set null/);
  assert.match(migration, /reports_unique_chat_image_reporter_idx/);
  assert.match(migration, /where report_kind = 'chat_image'/);
});


test('moderation can remove a reported photo and mark it rejected', () => {
  const moderation = fs.readFileSync('supabase/functions/admin-moderation/index.ts', 'utf8');
  assert.match(moderation, /action === "remove_image"/);
  assert.match(moderation, /storage\.from\("chat-images"\)\.remove/);
  assert.match(moderation, /image_moderation_status: "rejected"/);
  assert.match(moderation, /Photo removed by moderation/);
});


test('moderation decisions are written to an audit trail', () => {
  const moderation = fs.readFileSync('supabase/functions/admin-moderation/index.ts', 'utf8');
  assert.match(moderation, /from\("moderation_actions"\)\.insert/);
  assert.match(moderation, /action: "photo_removed"/);
  assert.match(moderation, /auditAction = status === "reviewed"/);
  assert.match(moderation, /select\("id,report_id,action,admin_user_id,reported_user_id,reported_message_id,resolution_reason,note,created_at"\)/);
});


test('chat image reports have a dedicated daily abuse limit', () => {
  const migration = fs.readFileSync('supabase/migrations/20260918073000_tighten_chat_image_report_rate_limit.sql', 'utf8');
  assert.match(migration, /chat_image_report/);
  assert.match(migration, /consume_action_quota\('chat_image_report', 10, 86400\)/);
  assert.match(migration, /consume_action_quota\('report', 20, 86400\)/);
});


test('chat image report reason is accepted by database constraints', () => {
  const migration = fs.readFileSync('supabase/migrations/20260918073500_allow_chat_image_report_reason.sql', 'utf8');
  assert.match(migration, /'inappropriate_image'::text/);
  assert.match(migration, /reports_valid_reason/);
});


test('expired signed image URLs fall back to retry state', () => {
  const chat = fs.readFileSync('src/app/chat.tsx', 'utf8');
  assert.match(chat, /onError=\{\(\) => \{/);
  assert.match(chat, /delete next\[id\]/);
  assert.match(chat, /\[id\]: 'error'/);
});


test('chat photo reports capture a structured safety category', () => {
  const chat = fs.readFileSync('src/app/chat.tsx', 'utf8');
  const migration = fs.readFileSync('supabase/migrations/20260918113500_add_chat_image_report_categories.sql', 'utf8');
  assert.match(chat, /chooseOption\(/);
  assert.match(chat, /photo_sexual_content/);
  assert.match(chat, /photo_harassment/);
  assert.match(chat, /photo_spam_scam/);
  assert.match(chat, /photo_other/);
  assert.match(migration, /'photo_sexual_content'::text/);
  assert.match(migration, /'photo_harassment'::text/);
  assert.match(migration, /'photo_spam_scam'::text/);
  assert.match(migration, /'photo_other'::text/);
});


test('moderation assigns report severity and surfaces high-priority counts', () => {
  const moderation = fs.readFileSync('supabase/functions/admin-moderation/index.ts', 'utf8');
  assert.match(moderation, /function reportSeverity/);
  assert.match(moderation, /case "photo_sexual_content":/);
  assert.match(moderation, /case "photo_harassment":/);
  assert.match(moderation, /return "high"/);
  assert.match(moderation, /pending_high:/);
});


test('Founder moderation has severity quick filters', () => {
  const founder = fs.readFileSync('website/founder.html', 'utf8');
  assert.match(founder, /data-severity-filter="high"/);
  assert.match(founder, /data-severity-filter="medium"/);
  assert.match(founder, /data-severity-filter="low"/);
  assert.match(founder, /severityFilter='all'/);
  assert.match(founder, /statusRows\.filter\(x=>x\.severity===severityFilter\)/);
});


test('Founder moderation filters show live counters', () => {
  const founder = fs.readFileSync('website/founder.html', 'utf8');
  assert.match(founder, /data-status-count="pending"/);
  assert.match(founder, /data-status-count="reviewed"/);
  assert.match(founder, /data-severity-count="high"/);
  assert.match(founder, /data-severity-count="medium"/);
  assert.match(founder, /function updateModerationFilterCounts/);
});


test('Founder moderation shows pending report age and queue health', () => {
  const founder = fs.readFileSync('website/founder.html', 'utf8');
  assert.match(founder, /id="oldestPendingAge"/);
  assert.match(founder, /id="queueHealth"/);
  assert.match(founder, /function formatAge/);
  assert.match(founder, /age-danger/);
  assert.match(founder, /older than 24h/);
  assert.match(founder, /older than 2h/);
});


test('Founder moderation supports queue age filters and oldest-first ordering', () => {
  const founder = fs.readFileSync('website/founder.html', 'utf8');
  assert.match(founder, /data-age-filter="fresh"/);
  assert.match(founder, /data-age-filter="watch"/);
  assert.match(founder, /data-age-filter="urgent"/);
  assert.match(founder, /function ageBucket/);
  assert.match(founder, /ageFilter='all'/);
  assert.match(founder, /new Date\(a\.created_at\|\|0\)-new Date\(b\.created_at\|\|0\)/);
});


test('Founder moderation auto refresh pauses when hidden', () => {
  const founder = fs.readFileSync('website/founder.html', 'utf8');
  assert.match(founder, /id="moderationLive"/);
  assert.match(founder, /setInterval\(\(\)=>\{/);
  assert.match(founder, /60000/);
  assert.match(founder, /document\.visibilityState==='visible'/);
  assert.match(founder, /PAUSED · tab hidden/);
});


test('moderation records resolution reasons and notes', () => {
  const moderation = fs.readFileSync('supabase/functions/admin-moderation/index.ts', 'utf8');
  const founder = fs.readFileSync('website/founder.html', 'utf8');
  assert.match(moderation, /ALLOWED_RESOLUTIONS/);
  assert.match(moderation, /resolution_reason/);
  assert.match(moderation, /moderator_note/);
  assert.match(founder, /askResolution/);
  assert.match(founder, /moderationEscalation/);
  assert.match(founder, /photoVerificationFailed/);
  assert.match(founder, /modAvgHandling/);
});

test('account deletion removes private chat images before deleting messages', () => {
  const fn = fs.readFileSync('supabase/functions/delete-account/index.ts', 'utf8');
  assert.match(fn, /from\('chat-images'\)\.remove\(imagePaths\)/);
  assert.match(fn, /select\('image_path'\)/);
});

test('verified photo signed URLs auto-refresh once after an image error', () => {
  const chat = fs.readFileSync('src/app/chat.tsx', 'utf8');
  assert.match(chat, /imageRefreshAttemptRef/);
  assert.match(chat, /loadImageUrl\(item, true\)/);
  assert.match(chat, /async function loadImageUrl\(message: Message, force = false\)/);
});

test('verified photo push text is localized from recipient preference', () => {
  const notify = fs.readFileSync('supabase/functions/send-message-notification/index.ts', 'utf8');
  const language = fs.readFileSync('src/app/language.tsx', 'utf8');
  assert.match(notify, /verifiedPhotoText/);
  assert.match(notify, /preferred_language/);
  assert.match(notify, /Verifiziertes Foto/);
  assert.match(notify, /Verificirana fotografija/);
  assert.match(language, /preferred_language: language/);
});
