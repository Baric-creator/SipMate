import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync('supabase/functions/delete-account/index.ts', 'utf8');

test('account deletion removes device push tokens before auth user deletion', () => {
  assert.match(source, /from\('device_push_tokens'\)\.delete\(\)\.eq\('user_id', uid\)/);
  assert.match(source, /auth\.admin\.deleteUser\(uid\)/);
  assert.ok(
    source.indexOf("from('device_push_tokens').delete()") < source.indexOf('auth.admin.deleteUser(uid)'),
    'push tokens must be deleted before the auth user is removed'
  );
});

test('account deletion removes root avatar and nested Premium gallery files', () => {
  assert.match(source, /avatarBucket\.list\(uid, \{ limit: 1000 \}\)/);
  assert.match(source, /avatarBucket\.list\(`\$\{uid\}\/gallery`, \{ limit: 1000 \}\)/);
  assert.match(source, /`\$\{uid\}\/gallery\/\$\{object\.name\}`/);
  assert.match(source, /avatarBucket\.remove\(storagePaths\)/);

  const storageDeleteAt = source.indexOf('avatarBucket.remove(storagePaths)');
  const authDeleteAt = source.indexOf('auth.admin.deleteUser(uid)');
  assert.ok(storageDeleteAt >= 0 && authDeleteAt > storageDeleteAt, 'storage cleanup must complete before Auth identity deletion');
});

test('account deletion still removes user-owned social and profile data', () => {
  for (const table of [
    'premium_subscriptions',
    'reports',
    'blocks',
    'skipped_profiles',
    'cheers',
    'discord_oauth_states',
    'discord_cheers_announcements',
    'user_action_rate_limits',
    'profile_photos',
  ]) {
    assert.ok(source.includes(`from('${table}')`), `missing cleanup for ${table}`);
  }
  assert.match(source, /from\('profiles'\)\.delete\(\)\.eq\('id', uid\)/);
});
