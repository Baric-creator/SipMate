import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const workflowsDir = path.join(root, '.github', 'workflows');
const failures = [];

const fail = (message) => failures.push(message);
const assert = (condition, message) => { if (!condition) fail(message); };

if (!fs.existsSync(workflowsDir)) {
  fail('.github/workflows is missing');
} else {
  const workflowFiles = fs.readdirSync(workflowsDir)
    .filter((name) => /\.ya?ml$/i.test(name))
    .sort();

  assert(workflowFiles.length > 0, 'No GitHub Actions workflows found');

  for (const name of workflowFiles) {
    const relative = `.github/workflows/${name}`;
    const content = fs.readFileSync(path.join(workflowsDir, name), 'utf8');

    assert(!/\bpull_request_target\s*:/m.test(content), `${relative} uses pull_request_target; review the privilege boundary explicitly`);
    assert(!/^\s*permissions\s*:\s*write-all\s*$/m.test(content), `${relative} grants write-all permissions`);

    for (const match of content.matchAll(/^\s*-?\s*uses:\s*([^\s#]+)(?:\s*#.*)?$/gm)) {
      const action = match[1];
      if (action.startsWith('./') || action.startsWith('docker://')) continue;

      const at = action.lastIndexOf('@');
      assert(at > 0, `${relative} contains an unversioned action: ${action}`);
      if (at <= 0) continue;

      const ref = action.slice(at + 1);
      assert(/^[0-9a-f]{40}$/i.test(ref), `${relative} action is not pinned to an immutable commit SHA: ${action}`);
    }
  }

  const checkPath = path.join(workflowsDir, 'check.yml');
  if (fs.existsSync(checkPath)) {
    const check = fs.readFileSync(checkPath, 'utf8');
    assert(/permissions:\s*\n\s+contents:\s*read/m.test(check), 'check.yml must explicitly use read-only repository contents permission');
    assert(/cancel-in-progress:\s*true/m.test(check), 'check.yml must cancel superseded runs');
    assert(/timeout-minutes:\s*\d+/m.test(check), 'check.yml must have a job timeout');
  }

  const deployPath = path.join(workflowsDir, 'deploy-website.yml');
  if (fs.existsSync(deployPath)) {
    const deploy = fs.readFileSync(deployPath, 'utf8');
    assert(/contents:\s*read/m.test(deploy), 'deploy-website.yml must keep contents read-only');
    assert(/pages:\s*write/m.test(deploy), 'deploy-website.yml is missing the required Pages write permission');
    assert(/id-token:\s*write/m.test(deploy), 'deploy-website.yml is missing the required OIDC permission');
    assert(/timeout-minutes:\s*\d+/m.test(deploy), 'deploy-website.yml must have a job timeout');
  }
}

if (failures.length) {
  for (const message of failures) console.error(`FAIL: ${message}`);
  console.error(`Workflow audit failed with ${failures.length} blocking issue(s).`);
  process.exit(1);
}

console.log('Workflow audit passed: external actions are immutable-pinned and workflow privileges are bounded.');
