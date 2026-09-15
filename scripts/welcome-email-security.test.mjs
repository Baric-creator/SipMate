import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync('supabase/functions/send-welcome-email/index.ts', 'utf8');

test('welcome email recipient comes from authenticated identity, not request body', () => {
  assert.match(source, /auth\.getUser\(token\)/);
  assert.match(source, /if \(userError \|\| !user\?\.email\)/);
  assert.match(source, /to: \[user\.email\]/);
  assert.doesNotMatch(source, /to:\s*\[?body\.?email/);
});

test('welcome email uses bounded provider latency and fail-closed server configuration', () => {
  assert.match(source, /const EMAIL_PROVIDER_TIMEOUT_MS = 8_000/);
  assert.match(source, /signal: AbortSignal\.timeout\(EMAIL_PROVIDER_TIMEOUT_MS\)/);
  assert.match(source, /!resendApiKey \|\| !fromEmail/);
  assert.match(source, /temporarily_unavailable/);
  assert.match(source, /temporarily_unavailable["']?\s*\}\s*,\s*503/);
});

test('welcome email browser access uses an explicit origin allowlist', () => {
  assert.match(source, /const ALLOWED_ORIGINS = new Set/);
  assert.match(source, /origin && !ALLOWED_ORIGINS\.has\(origin\)/);
  assert.match(source, /origin_not_allowed/);
  assert.doesNotMatch(source, /Access-Control-Allow-Origin["']?:\s*["']\*["']/);
});

test('profile name is escaped before interpolation into welcome HTML', () => {
  assert.match(source, /function escapeHtml\(value: string\)/);
  assert.match(source, /escapeHtml\(rawName\)/);
  assert.match(source, /escapeHtml\(text\.heading\)/);
  assert.match(source, /escapeHtml\(text\.body\)/);
});
