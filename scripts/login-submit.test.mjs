import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync(new URL('../src/app/login.tsx', import.meta.url), 'utf8');

test('login blocks duplicate submissions synchronously', () => {
  assert.match(source, /const loginInFlightRef = useRef\(false\)/);
  assert.match(source, /if \(loginInFlightRef\.current\) return/);
  assert.match(source, /loginInFlightRef\.current = true/);
  assert.match(source, /loginInFlightRef\.current = false/);
});

test('secondary auth navigation is disabled while login is in progress', () => {
  assert.match(source, /forgotButton[^\n]*onPress=\{\(\) => router\.push\('\/forgot-password'\)\} disabled=\{loading\}/);
  assert.match(source, /registerButton[^\n]*onPress=\{\(\) => router\.push\('\/register'\)\} disabled=\{loading\}/);
});
