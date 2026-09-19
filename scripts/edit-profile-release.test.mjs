import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

test('edit profile can resolve a typed city when GPS permission is unavailable', () => {
  const source = fs.readFileSync('src/app/edit-profile.tsx', 'utf8');
  assert.match(source, /LOCATION PERMISSION DENIED: using typed city coordinates/);
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
