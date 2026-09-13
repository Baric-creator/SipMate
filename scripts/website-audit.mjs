import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const websiteDir = path.join(root, 'website');
const failures = [];

const requiredPages = [
  'index.html',
  'founder.html',
  'premium.html',
  'privacy.html',
  'terms.html',
  'delete-account.html',
  'download.html',
  'contact.html',
];

for (const page of requiredPages) {
  if (!fs.existsSync(path.join(websiteDir, page))) failures.push(`Missing website page: ${page}`);
}

const htmlFiles = fs.readdirSync(websiteDir)
  .filter((name) => name.endsWith('.html'))
  .sort();

const scriptRe = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
let checkedScripts = 0;

for (const file of htmlFiles) {
  const fullPath = path.join(websiteDir, file);
  const html = fs.readFileSync(fullPath, 'utf8');

  if (html.includes('\\n  let moderationRows=[];')) {
    failures.push(`${file}: literal \\n escape found before moderation JavaScript`);
  }

  let match;
  let index = 0;
  while ((match = scriptRe.exec(html)) !== null) {
    index += 1;
    const attrs = match[1] || '';
    const body = match[2] || '';
    if (/\bsrc\s*=/.test(attrs)) continue;

    const typeMatch = attrs.match(/\btype\s*=\s*["']([^"']+)["']/i);
    const type = (typeMatch?.[1] || '').toLowerCase();
    if (type && !['module', 'text/javascript', 'application/javascript'].includes(type)) continue;
    if (!body.trim()) continue;

    const tempPath = path.join(os.tmpdir(), `sipmate-${file.replace(/[^a-z0-9]/gi, '-')}-${index}.mjs`);
    fs.writeFileSync(tempPath, body, 'utf8');
    const result = spawnSync(process.execPath, ['--check', tempPath], { encoding: 'utf8' });
    fs.rmSync(tempPath, { force: true });
    checkedScripts += 1;

    if (result.status !== 0) {
      failures.push(`${file} inline script #${index}: ${String(result.stderr || result.stdout).trim()}`);
    }
  }
}

const founder = fs.readFileSync(path.join(websiteDir, 'founder.html'), 'utf8');
for (const marker of ['Founder Dashboard', 'admin-launch-status', 'admin-launch-config', 'admin-moderation']) {
  if (!founder.includes(marker)) failures.push(`founder.html missing critical marker: ${marker}`);
}

const premium = fs.readFileSync(path.join(websiteDir, 'premium.html'), 'utf8');
for (const marker of ['create-checkout-session', 'create-customer-portal', 'premium_subscriptions']) {
  if (!premium.includes(marker)) failures.push(`premium.html missing critical marker: ${marker}`);
}

if (failures.length) {
  failures.forEach((failure) => console.error(`FAIL: ${failure}`));
  console.error(`Website audit failed with ${failures.length} issue(s).`);
  process.exit(1);
}

console.log(`Website audit passed: ${htmlFiles.length} HTML files, ${checkedScripts} inline JavaScript block(s) syntax-checked.`);
