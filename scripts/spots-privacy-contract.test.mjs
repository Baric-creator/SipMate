import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../src/app/spots.tsx', import.meta.url), 'utf8');
const providerSource = readFileSync(new URL('../supabase/functions/nearby-places/index.ts', import.meta.url), 'utf8');

test('Spots is gated behind Premium entitlement', () => {
  assert.match(source, /get_my_premium_entitlement/);
  assert.match(source, /entitlement\?\.is_premium === true/);
  assert.match(source, /if \(!isPremium\)/);
  assert.match(providerSource, /get_my_premium_entitlement/);
  assert.match(providerSource, /premium_required/);
});

test('Spots only requests foreground location', () => {
  assert.match(source, /getForegroundPermissionsAsync/);
  assert.match(source, /requestForegroundPermissionsAsync/);
  assert.doesNotMatch(source, /requestBackgroundPermissionsAsync/);
  assert.doesNotMatch(source, /startLocationUpdatesAsync/);
  assert.doesNotMatch(source, /startGeofencingAsync/);
});

test('Spots uses exact coordinates only for the authenticated venue lookup and map UI', () => {
  assert.match(source, /functions\.invoke\('nearby-places'/);
  assert.match(source, /latitude:\s*coordinate\[1\]/);
  assert.match(source, /longitude:\s*coordinate\[0\]/);

  // The Spots screen must not persist its search coordinate to user/profile/location tables.
  assert.doesNotMatch(source, /from\(['"]profiles['"]\)[\s\S]{0,250}update\([\s\S]{0,250}(latitude|longitude)/i);
  assert.doesNotMatch(source, /from\(['"][^'"]*location[^'"]*['"]\)[\s\S]{0,250}(insert|update|upsert)\(/i);
  assert.doesNotMatch(source, /coords\.latitude[^\n]*<Text/);
  assert.doesNotMatch(source, /coords\.longitude[^\n]*<Text/);
});

test('venue provider bounds requests and returns venue data only', () => {
  assert.match(providerSource, /MAX_RADIUS\s*=\s*5000/);
  assert.match(providerSource, /MAX_RESULTS\s*=\s*60/);
  assert.match(providerSource, /places_cache/);
  assert.match(providerSource, /source:\s*"openstreetmap"/);
  assert.doesNotMatch(providerSource, /from\(["']profiles["']\).*select\([^)]*(latitude|longitude)/is);
});

test('Spots explains privacy and shows OpenStreetMap attribution', () => {
  assert.match(source, /No background tracking and no public user pin/);
  assert.match(source, /Tvoje koordinate ostaju privatne/);
  assert.match(source, /Deine Koordinaten bleiben privat/);
  assert.match(source, /OpenStreetMap/);
});
