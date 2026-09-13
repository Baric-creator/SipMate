import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const websiteDir = path.join(root, 'website');
const failures = [];
const warnings = [];

const files = fs.readdirSync(websiteDir).filter((name) => fs.statSync(path.join(websiteDir, name)).isFile());
const htmlFiles = files.filter((name) => name.endsWith('.html'));
const assetFiles = new Set(files);

const attrRe = /\b(?:href|src)\s*=\s*["']([^"']+)["']/gi;
const ignoredSchemes = ['mailto:', 'tel:', 'javascript:', 'data:'];
let checkedLocalRefs = 0;

function localTarget(fromFile, ref) {
  const raw = ref.split('#')[0].split('?')[0];
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw) || raw.startsWith('//')) return null;
  if (ignoredSchemes.some((scheme) => raw.startsWith(scheme))) return null;
  if (raw.includes('${')) return null;
  const normalized = raw.startsWith('/') ? raw.slice(1) : path.posix.normalize(path.posix.join(path.posix.dirname(fromFile), raw));
  return normalized || 'index.html';
}

for (const file of htmlFiles) {
  const html = fs.readFileSync(path.join(websiteDir, file), 'utf8');
  let match;
  while ((match = attrRe.exec(html)) !== null) {
    const ref = match[1].trim();
    const target = localTarget(file, ref);
    if (!target) continue;
    checkedLocalRefs += 1;
    if (target.endsWith('/')) {
      const indexTarget = path.posix.join(target, 'index.html');
      if (!fs.existsSync(path.join(websiteDir, indexTarget))) failures.push(`${file}: broken local reference ${ref}`);
      continue;
    }
    if (!fs.existsSync(path.join(websiteDir, target))) failures.push(`${file}: broken local reference ${ref} -> ${target}`);
  }
}

const criticalPages = {
  'index.html': ['premium.html', 'privacy.html', 'terms.html', 'contact.html'],
  'premium.html': ['forgot-password.html', 'download.html', 'terms.html', 'privacy.html', 'contact.html'],
  'download.html': ['privacy.html', 'terms.html'],
  'delete-account.html': ['privacy.html'],
};

for (const [file, targets] of Object.entries(criticalPages)) {
  const html = fs.readFileSync(path.join(websiteDir, file), 'utf8');
  for (const target of targets) {
    if (!html.includes(target)) failures.push(`${file}: missing critical CTA/link to ${target}`);
  }
}

const contact = fs.readFileSync(path.join(websiteDir, 'contact.html'), 'utf8');
for (const host of ['instagram.com', 'tiktok.com', 'whatsapp.com', 'discord.com']) {
  if (!contact.includes(host)) failures.push(`contact.html: missing official ${host} link`);
}

const index = fs.readFileSync(path.join(websiteDir, 'index.html'), 'utf8');
for (const id of ['#how', '#preview', '#premium', '#community', '#waitlist']) {
  if (!index.includes(`href="${id}"`) && !index.includes(`href='${id}'`)) warnings.push(`index.html: no direct CTA href for ${id}`);
}

if (failures.length) {
  failures.forEach((failure) => console.error(`FAIL: ${failure}`));
  warnings.forEach((warning) => console.warn(`WARN: ${warning}`));
  console.error(`Website link audit failed with ${failures.length} issue(s).`);
  process.exit(1);
}

warnings.forEach((warning) => console.warn(`WARN: ${warning}`));
console.log(`Website link audit passed: ${htmlFiles.length} HTML pages, ${checkedLocalRefs} local href/src reference(s) checked.`);
