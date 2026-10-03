import { execFileSync } from 'node:child_process';

const allowedModerateAdvisories = new Set([
  'https://github.com/advisories/GHSA-vcc3-ghjq-m6fr',
]);

const allowedHighAdvisories = new Set([
  // Reviewed upstream Expo SDK 57 toolchain advisories. Keep exceptions
  // pinned to exact advisories; every other HIGH/CRITICAL still fails CI.
  'https://github.com/advisories/GHSA-86w9-cpqp-85rv',
  'https://github.com/advisories/GHSA-vfj7-8cjw-p6xm',
  // npm propagates this reviewed uuid advisory as HIGH through @expo/cli
  // and expo even though the root advisory is MODERATE.
  'https://github.com/advisories/GHSA-w5hq-g745-h8pq',
]);

let stdout = '';
try {
  const npmExecPath = process.env.npm_execpath;
  if (npmExecPath) {
    stdout = execFileSync(process.execPath, [npmExecPath, 'audit', '--json'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } else {
    const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    stdout = execFileSync(npmCommand, ['audit', '--json'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  }
} catch (error) {
  // npm audit exits non-zero whenever findings meet its default threshold.
  // The JSON report is still the source of truth for our policy below.
  stdout = error?.stdout?.toString?.() ?? '';
}

if (!stdout.trim()) {
  console.error('Dependency audit failed: npm audit returned no JSON report.');
  process.exit(1);
}

let report;
try {
  report = JSON.parse(stdout);
} catch {
  console.error('Dependency audit failed: npm audit returned invalid JSON.');
  process.exit(1);
}

const vulnerabilities = report?.vulnerabilities ?? {};
const metadata = report?.metadata?.vulnerabilities ?? {};

const advisoryMap = new Map();

for (const [name, vulnerability] of Object.entries(vulnerabilities)) {
  const advisories = new Set();

  for (const via of vulnerability.via ?? []) {
    if (typeof via !== 'string' && via?.url) {
      advisories.add(via.url);
    }
  }

  advisoryMap.set(name, advisories);
}

let changed = true;
while (changed) {
  changed = false;

  for (const [name, vulnerability] of Object.entries(vulnerabilities)) {
    const advisories = advisoryMap.get(name) ?? new Set();
    const before = advisories.size;

    for (const via of vulnerability.via ?? []) {
      if (typeof via !== 'string') continue;

      for (const advisory of advisoryMap.get(via) ?? []) {
        advisories.add(advisory);
      }
    }

    advisoryMap.set(name, advisories);

    if (advisories.size !== before) {
      changed = true;
    }
  }
}

const resolveLeafAdvisories = (name) =>
  advisoryMap.get(name) ?? new Set();
const unexpectedHigh = [];
for (const [name, vulnerability] of Object.entries(vulnerabilities)) {
  if (vulnerability.severity !== 'high' && vulnerability.severity !== 'critical') continue;

  if (vulnerability.severity === 'critical') {
    unexpectedHigh.push(`${name}: critical vulnerability`);
    continue;
  }

  const leafAdvisories = resolveLeafAdvisories(name);
  if (leafAdvisories.size === 0) {
    unexpectedHigh.push(`${name}: no root advisory could be resolved`);
    continue;
  }

  for (const advisory of leafAdvisories) {
    if (!allowedHighAdvisories.has(advisory)) {
      unexpectedHigh.push(`${name}: ${advisory}`);
    }
  }
}

if (unexpectedHigh.length > 0) {
  console.error('Dependency audit failed: unexpected high/critical advisory chain(s) found:');
  for (const item of unexpectedHigh) console.error(`- ${item}`);
  process.exit(1);
}

const unexpectedModerate = [];
for (const [name, vulnerability] of Object.entries(vulnerabilities)) {
  if (vulnerability.severity !== 'moderate') continue;

  const leafAdvisories = resolveLeafAdvisories(name);
  if (leafAdvisories.size === 0) {
    unexpectedModerate.push(`${name}: no root advisory could be resolved`);
    continue;
  }

  for (const advisory of leafAdvisories) {
    if (!allowedModerateAdvisories.has(advisory) && !allowedHighAdvisories.has(advisory)) {
      unexpectedModerate.push(`${name}: ${advisory}`);
    }
  }
}

if (unexpectedModerate.length > 0) {
  console.error('Dependency audit failed: unexpected moderate advisory chain(s) found:');
  for (const item of unexpectedModerate) console.error(`- ${item}`);
  process.exit(1);
}

const moderate = Number(metadata.moderate ?? 0);
const high = Number(metadata.high ?? 0);
console.log(
  `Dependency audit passed: ${moderate} reviewed moderate meta-finding(s), ${high} reviewed high meta-finding(s), 0 critical.`,
);
console.log('Reviewed moderate roots:');
for (const advisory of allowedModerateAdvisories) console.log(`- ${advisory}`);
console.log('Reviewed high roots:');
for (const advisory of allowedHighAdvisories) console.log(`- ${advisory}`);
