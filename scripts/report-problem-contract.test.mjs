import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const reportSource = await readFile(new URL('../src/app/report-problem.tsx', import.meta.url), 'utf8');
const accountSource = await readFile(new URL('../src/app/account-safety.tsx', import.meta.url), 'utf8');

test('account safety links to the in-app problem report screen', () => {
  assert.match(accountSource, /['"]\/report-problem['"]/);
});

test('problem reports require a signed-in user and write only bounded feedback fields', () => {
  assert.match(reportSource, /supabase\.auth\.getSession\(\)/);
  assert.match(reportSource, /supabase\.from\(['"]app_feedback['"]\)\.insert/);
  assert.match(reportSource, /details:\s*clean\.slice\(0,\s*2000\)/);
  assert.match(reportSource, /screen:\s*screen\.trim\(\)\.slice\(0,\s*100\)/);
  assert.match(reportSource, /app_version:/);
  assert.match(reportSource, /build_number:\s*String\(Constants\.nativeBuildVersion/);
  assert.match(reportSource, /platform:/);
});

test('problem report UI explicitly excludes sensitive chat and precise-location diagnostics', () => {
  assert.match(reportSource, /never message content or precise location/i);
  assert.doesNotMatch(reportSource, /latitude\s*:/i);
  assert.doesNotMatch(reportSource, /longitude\s*:/i);
});

test('problem report categories stay limited to the reviewed set', () => {
  assert.match(reportSource, /type Category = 'bug' \| 'performance' \| 'ui' \| 'account' \| 'other'/);
});
