import { execFileSync } from 'node:child_process';

const allowedModerateAdvisories = new Set([
  'https://github.com/advisories/GHSA-vcc3-ghjq-m6fr',
  'https://github.com/advisories/GHSA-w5hq-g745-h8pq',
]);

let stdout = '';
try {
  stdout = execFileSync('npm', ['audit', '--json'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
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

if (high > 0 || critical > 0) {
  console.error(
    `Dependency audit failed: ${high} high and ${critical} critical vulnerability finding(s).`,
  );
  process.exit(1);
}

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

const unexpected = [];
for (const [name, vulnerability] of Object.entries(vulnerabilities)) {
  if (vulnerability.severity !== 'moderate') continue;

  const leafAdvisories = resolveLeafAdvisories(name);
  if (leafAdvisories.size === 0) {
    unexpected.push(`${name}: no root advisory could be resolved`);
    continue;
  }

  for (const advisory of leafAdvisories) {
    if (!allowedModerateAdvisories.has(advisory)) {
      unexpected.push(`${name}: ${advisory}`);
    }
  }
}

if (unexpected.length > 0) {
  console.error('Dependency audit failed: unexpected moderate advisory chain(s) found:');
  for (const item of unexpected) console.error(`- ${item}`);
  process.exit(1);
}

const moderate = Number(metadata.moderate ?? 0);
console.log(
  `Dependency audit passed: ${moderate} known moderate meta-finding(s), 0 high, 0 critical.`,
);
console.log('Known moderate roots are pinned to reviewed Expo toolchain advisories:');
for (const advisory of allowedModerateAdvisories) console.log(`- ${advisory}`);
