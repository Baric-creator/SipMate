import { execFileSync } from 'node:child_process';

const allowedModerateAdvisories = new Set([
  'https://github.com/advisories/GHSA-vcc3-ghjq-m6fr',
  'https://github.com/advisories/GHSA-w5hq-g745-h8pq',
]);

// Temporary, narrow exceptions for the reviewed Expo toolchain only.
// Any new high/critical advisory or affected package still fails CI.
const allowedHighAdvisories = new Set([
  'https://github.com/advisories/GHSA-86w9-cpqp-85rv',
  'https://github.com/advisories/GHSA-w5hq-g745-h8pq',
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
    } else if (via?.url) {
      leaves.add(via.url);
    }
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
    if (!allowedHighAdvisories.has(advisory)) unexpectedHigh.push(`${name}: ${advisory}`);
  }
}

if (unexpectedHigh.length > 0) {
  console.error(`Dependency audit failed: ${high} high vulnerability finding(s), including unexpected chains:`);
  for (const item of unexpectedHigh) console.error(`- ${item}`);
  process.exit(1);
}

const unexpectedModerate = [];
for (const [name, vulnerability] of Object.entries(vulnerabilities)) {
  if (vulnerability?.severity !== 'moderate') continue;

  const leafAdvisories = resolveLeafAdvisories(name);
  if (leafAdvisories.size === 0) {
    unexpectedModerate.push(`${name}: no root advisory could be resolved`);
    continue;
  }

  for (const advisory of leafAdvisories) {
    if (!allowedModerateAdvisories.has(advisory)) unexpectedModerate.push(`${name}: ${advisory}`);
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
