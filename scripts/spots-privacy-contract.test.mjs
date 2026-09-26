import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../src/app/spots.tsx', import.meta.url), 'utf8');

test('Spots is gated behind Premium entitlement', () => {
  assert.match(source, /get_my_premium_entitlement/);
  assert.match(source, /entitlement\?\.is_premium === true/);
  assert.match(source, /if \(!isPremium\)/);
});

test('Spots only requests foreground location', () => {
  assert.match(source, /getForegroundPermissionsAsync/);
  assert.match(source, /requestForegroundPermissionsAsync/);
  assert.doesNotMatch(source, /requestBackgroundPermissionsAsync/);
  assert.doesNotMatch(source, /startLocationUpdatesAsync/);
  assert.doesNotMatch(source, /startGeofencingAsync/);
});

test('Spots does not persist exact coordinates', () => {
  assert.doesNotMatch(source, /supabase\.from\([^)]*location/i);
  assert.doesNotMatch(source, /latitude\s*:/);
  assert.doesNotMatch(source, /longitude\s*:/);
  assert.doesNotMatch(source, /coords\.latitude[^\n]*<Text/);
  assert.doesNotMatch(source, /coords\.longitude[^\n]*<Text/);
});

test('Spots explains privacy before venue-map rollout', () => {
  assert.match(source, /No background tracking and no public user pin/);
  assert.match(source, /Tvoje koordinate ostaju privatne/);
  assert.match(source, /Deine Koordinaten bleiben privat/);
});
