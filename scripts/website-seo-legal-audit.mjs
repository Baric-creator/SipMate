import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const websiteDir = path.join(root, 'website');
const failures = [];
const warnings = [];

function read(name) {
  const file = path.join(websiteDir, name);
  if (!fs.existsSync(file)) {
    failures.push(`Missing website file: ${name}`);
    return '';
  }
  return fs.readFileSync(file, 'utf8');
}

function hasRobots(html, value) {
  const m = html.match(/<meta\s+name=["']robots["']\s+content=["']([^"']+)["']/i)
    || html.match(/<meta\s+content=["']([^"']+)["']\s+name=["']robots["']/i);
  return (m?.[1] || '').toLowerCase().replace(/\s+/g, '') === value.replace(/\s+/g, '');
}

function canonical(html) {
  return html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i)?.[1]
    || html.match(/<link\s+href=["']([^"']+)["']\s+rel=["']canonical["']/i)?.[1]
    || null;
}

const publicPages = [
  ['index.html', 'https://officialsipmate.com/'],
  ['privacy.html', 'https://officialsipmate.com/privacy.html'],
  ['terms.html', 'https://officialsipmate.com/terms.html'],
  ['imprint.html', 'https://officialsipmate.com/imprint.html'],
  ['contact.html', 'https://officialsipmate.com/contact.html'],
  ['delete-account.html', 'https://officialsipmate.com/delete-account.html'],
];

for (const [file, expectedCanonical] of publicPages) {
  const html = read(file);
  if (!html) continue;
  if (!hasRobots(html, 'index,follow')) failures.push(`${file}: expected robots index,follow`);
  const c = canonical(html);
  if (c !== expectedCanonical) failures.push(`${file}: canonical mismatch (${c || 'missing'})`);
  if (!/<meta\s+name=["']description["']/i.test(html)) failures.push(`${file}: missing meta description`);
  if (!/<title(?:\s[^>]*)?>\s*[^<]+\s*<\/title>/i.test(html)) failures.push(`${file}: missing page title`);
}

const privatePages = ['founder.html', 'admin-launch.html', 'forgot-password.html', 'reset-password.html', 'premium.html'];
for (const file of privatePages) {
  const html = read(file);
  if (!html) continue;
  if (!hasRobots(html, 'noindex,nofollow')) failures.push(`${file}: expected robots noindex,nofollow`);
}

const robots = read('robots.txt');
for (const route of ['/founder.html', '/admin-launch.html', '/forgot-password.html', '/reset-password.html', '/premium.html']) {
  if (!robots.includes(`Disallow: ${route}`)) failures.push(`robots.txt: missing Disallow for ${route}`);
}
if (!robots.includes('Sitemap: https://officialsipmate.com/sitemap.xml')) failures.push('robots.txt: missing canonical sitemap URL');

const sitemap = read('sitemap.xml');
for (const [, url] of publicPages) {
  if (!sitemap.includes(`<loc>${url}</loc>`)) failures.push(`sitemap.xml: missing ${url}`);
}
for (const route of ['founder.html', 'admin-launch.html', 'forgot-password.html', 'reset-password.html', 'premium.html']) {
  if (sitemap.includes(route)) failures.push(`sitemap.xml: private page must not be indexed: ${route}`);
}

const terms = read('terms.html');
if (/pre-launch placeholder|final terms will be published/i.test(terms)) warnings.push('terms.html is still a pre-launch placeholder and must be finalized before public commercial launch.');
const imprint = read('imprint.html');
if (/reserved for the legally required|will be added here/i.test(imprint)) warnings.push('imprint.html still lacks final operator/provider details and must be finalized before public commercial launch.');
const contact = read('contact.html');
if (/will be published here once the operating entity/i.test(contact)) warnings.push('contact.html still defers official business/legal contact details until operator details are confirmed.');

if (failures.length) {
  failures.forEach((x) => console.error(`FAIL: ${x}`));
  warnings.forEach((x) => console.warn(`WARN: ${x}`));
  console.error(`Website SEO/legal audit failed with ${failures.length} issue(s).`);
  process.exit(1);
}

warnings.forEach((x) => console.warn(`WARN: ${x}`));
console.log(`Website SEO/legal audit passed with ${warnings.length} launch warning(s).`);
