import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const chats = fs.readFileSync(new URL('../src/app/chats.tsx', import.meta.url), 'utf8');
const editProfile = fs.readFileSync(new URL('../src/app/edit-profile.tsx', import.meta.url), 'utf8');

test('chat list keeps avatar URLs stable between renders', () => {
  assert.match(chats, /source=\{\{ uri: item\.avatar_url \}\}/);
  assert.doesNotMatch(chats, /refresh=\$\{Date\.now\(\)\}/);
});

test('avatar uploads version the persisted URL when the image actually changes', () => {
  assert.match(editProfile, /const publicUrl = `\$\{publicUrlData\.publicUrl\}\?t=\$\{Date\.now\(\)\}`/);
});
