import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync(new URL('../src/app/register.tsx', import.meta.url), 'utf8');

test('registration blocks duplicate submissions synchronously', () => {
  assert.match(source, /const registrationInFlightRef = useRef\(false\)/);
  assert.match(source, /if \(registrationInFlightRef\.current\) return/);
  assert.match(source, /registrationInFlightRef\.current = true/);
  assert.match(source, /registrationInFlightRef\.current = false/);
});

test('registration freezes editable identity fields while creating the account', () => {
  assert.match(source, /editable=\{!loading\}/);
  assert.match(source, /disabled=\{loading\}/);
});

test('registration normalizes identity values once before async work', () => {
  assert.match(source, /const cleanEmail = email\.trim\(\)\.toLowerCase\(\)/);
  assert.match(source, /const cleanName = name\.trim\(\)/);
  assert.match(source, /name: cleanName/);
});
