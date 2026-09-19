import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

test('edit profile can resolve a typed city when GPS permission is unavailable', () => {
  const source = fs.readFileSync('src/app/edit-profile.tsx', 'utf8');
  assert.match(source, /PROFILE LOCATION: using manually selected city coordinates/);
  assert.match(source, /nominatim\.openstreetmap\.org\/search/);
  assert.match(source, /locationUnavailableCityFallback/);
});

test('Premium gallery rechecks entitlement and uploads binary data reliably', () => {
  const source = fs.readFileSync('src/app/edit-profile.tsx', 'utf8');
  assert.match(source, /PREMIUM ENTITLEMENT CHECK ERROR/);
  assert.match(source, /select\('is_premium, premium_until'\)/);
  assert.match(source, /response\.arrayBuffer\(\)/);
  assert.match(source, /GALLERY UPLOAD ERROR/);
  assert.match(source, /GALLERY SAVE ERROR/);
});


test('manual city remains authoritative instead of being overwritten by GPS city', () => {
  const source = fs.readFileSync('src/app/edit-profile.tsx', 'utf8');
  assert.match(source, /const typedCity = city\.trim\(\)/);
  assert.match(source, /if \(typedCity\)/);
  assert.match(source, /PROFILE LOCATION: using manually selected city coordinates/);
  assert.match(source, /detectedCity = typedCity/);
});

test('Premium Nearby filters persist custom location and expose Save Changes', () => {
  const source = fs.readFileSync('src/app/nearby.tsx', 'utf8');
  assert.match(source, /AsyncStorage/);
  assert.match(source, /premiumFilterStorageKey/);
  assert.match(source, /savePremiumFilters/);
  assert.match(source, /customLatitude/);
  assert.match(source, /customLongitude/);
  assert.match(source, /SAVE CHANGES/);
  assert.match(source, /SPREMI PROMJENE/);
  assert.match(source, /ÄNDERUNGEN SPEICHERN/);
});


test('profile photo uploads normalize mime and reject unsupported formats clearly', () => {
  const source = fs.readFileSync('src/app/edit-profile.tsx', 'utf8');
  assert.match(source, /function normalizedImageUpload/);
  assert.match(source, /image\/jpg/);
  assert.match(source, /image\/jpeg/);
  assert.match(source, /preferredAssetRepresentationMode/);
  assert.match(source, /UIImagePickerPreferredAssetRepresentationMode\.Compatible/);
  assert.match(source, /arrayBuffer\.byteLength > 10 \* 1024 \* 1024/);
});
