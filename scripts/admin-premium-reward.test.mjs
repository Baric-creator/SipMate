import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync('supabase/functions/admin-premium-reward/index.ts', 'utf8');
const config = fs.readFileSync('supabase/config.toml', 'utf8');

test('admin Premium rewards require an authenticated allowlisted administrator', () => {
  assert.match(source, /authClient\.auth\.getUser\(token\)/);
  assert.match(source, /ADMIN_EMAILS\.has\(email\)/);
  assert.match(source, /error: "forbidden"/);
  assert.match(config, /\[functions\.admin-premium-reward\][\s\S]*?verify_jwt = true/);
});

test('admin Premium reward input is bounded and reward source is allowlisted', () => {
  assert.match(source, /const MAX_BODY_BYTES = 8_192/);
  assert.match(source, /request_too_large/);
  assert.match(source, /UUID_PATTERN\.test\(userId\)/);
  assert.match(source, /ALLOWED_SOURCES\.has\(source\)/);
  assert.match(source, /durationDays < 1 \|\| durationDays > 3650/);
  assert.match(source, /externalReference\.length < 1 \|\| externalReference\.length > 160/);
});

test('admin Premium reward delegates entitlement changes to the audited service-role RPC', () => {
  assert.match(source, /createClient\(supabaseUrl, serviceKey/);
  assert.match(source, /sb\.rpc\("grant_premium_reward"/);
  assert.match(source, /p_external_reference: externalReference/);
  assert.match(source, /granted_by_user_id: adminUser\.id/);
  assert.doesNotMatch(source, /\.from\(["']profiles["']\)[\s\S]{0,200}?\.update\(/);
});
