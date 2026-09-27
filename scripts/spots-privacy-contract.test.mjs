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

test('Spots exposes bounded 1 km, 3 km and 5 km radius controls', () => {
  assert.match(source, /radiusOptions\s*=\s*\[1000,\s*3000,\s*5000\]/);
  assert.match(source, /radiusMeters:\s*radius/);
  assert.match(source, /setRadiusMeters\(nextRadius\)/);
});

test('Spots provides venue detail actions and nearest-place list', () => {
  assert.match(source, /selectedPlace\.website/);
  assert.match(source, /openWebsite/);
  assert.match(source, /navigateToPlace/);
  assert.match(source, /places\.slice\(0,\s*8\)/);
  assert.match(source, /cameraRef\.current\?\.easeTo/);
});

test('venue provider falls back to bounded stale cache when upstream is unavailable', () => {
  assert.match(providerSource, /STALE_CACHE_MAX_AGE_MS\s*=\s*24\s*\*\s*60\s*\*\s*60\s*\*\s*1000/);
  assert.match(providerSource, /staleCacheUsable/);
  assert.match(providerSource, /staleCache\s*=\s*true/);
  assert.match(providerSource, /provider_unavailable/);
});

test('Spots explains privacy and shows OpenStreetMap attribution', () => {
  assert.match(source, /No background tracking and no public user pin/);
  assert.match(source, /Tvoje koordinate ostaju privatne/);
  assert.match(source, /Deine Koordinaten bleiben privat/);
  assert.match(source, /OpenStreetMap/);
});
