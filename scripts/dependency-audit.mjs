import { execFileSync } from 'node:child_process';

const allowedModerateAdvisories = new Set([
  'https://github.com/advisories/GHSA-vcc3-ghjq-m6fr',
  'https://github.com/advisories/GHSA-w5hq-g745-h8pq',
]);

// Temporary, narrow exception for the Expo CLI toolchain. As of 2026-10-02,
// node-forge 1.4.0 is still the latest npm release and GHSA-86w9-cpqp-85rv
// has no patched npm version. Keep both the advisory and affected package chain
// pinned so any new high-severity finding still fails CI.
const allowedHighAdvisories = new Set([
  'https://github.com/advisories/GHSA-86w9-cpqp-85rv',
]);
const allowedHighPackages = new Set([
  'node-forge',
  '@expo/code-signing-certificates',
  '@expo/cli',
  'expo',
  '@maplibre/maplibre-react-native',
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
const high = Number(metadata.high ?? 0);
const critical = Number(metadata.critical ?? 0);

const formatVia = (via) => {
  if (typeof via === 'string') return via;
  const parts = [];
  if (via?.title) parts.push(via.title);
  if (via?.url) parts.push(via.url);
  if (via?.range) parts.push(`range ${via.range}`);
  return parts.join(' | ') || 'unknown advisory';
};

const memo = new Map();
const resolveLeafAdvisories = (name, stack = new Set()) => {
  if (memo.has(name)) return memo.get(name);
  if (stack.has(name)) return new Set();

  const vulnerability = vulnerabilities[name];
  if (!vulnerability) return new Set();

  const nextStack = new Set(stack);
  nextStack.add(name);
  const leaves = new Set();

  for (const via of vulnerability.via ?? []) {
    if (typeof via === 'string') {
      for (const url of resolveLeafAdvisories(via, nextStack)) leaves.add(url);
      continue;
    }

    if (via?.url) leaves.add(via.url);
  }

  memo.set(name, leaves);
  return leaves;
};

if (critical > 0) {
  console.error(`Dependency audit failed: ${critical} critical vulnerability finding(s).`);
  process.exit(1);
}

const unexpectedHigh = [];
for (const [name, vulnerability] of Object.entries(vulnerabilities)) {
  if (vulnerability?.severity !== 'high') continue;

  if (!allowedHighPackages.has(name)) {
    unexpectedHigh.push(`${name}: package is not in the reviewed Expo-toolchain exception`);
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
  console.error(`Dependency audit failed: ${high} high vulnerability finding(s), including unexpected chains:`);
  for (const item of unexpectedHigh) console.error(`- ${item}`);
  console.error('High dependency findings:');
  for (const [name, vulnerability] of Object.entries(vulnerabilities)) {
    if (vulnerability?.severity !== 'high') continue;
    const vias = (vulnerability?.via ?? []).map(formatVia).join('; ') || 'no advisory details';
    console.error(`- ${name} | range=${vulnerability?.range ?? 'unknown'} | via=${vias}`);
  }
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
    if (!allowedModerateAdvisories.has(advisory)) {
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
console.log(
  `Dependency audit passed: ${moderate} reviewed moderate meta-finding(s), ${high} reviewed high Expo-toolchain meta-finding(s), 0 critical.`,
);
if (high > 0) {
  console.log('Reviewed temporary high-severity root (no patched npm release yet):');
  for (const advisory of allowedHighAdvisories) console.log(`- ${advisory}`);
}
console.log('Known moderate roots are pinned to reviewed Expo toolchain advisories:');
for (const advisory of allowedModerateAdvisories) console.log(`- ${advisory}`);
