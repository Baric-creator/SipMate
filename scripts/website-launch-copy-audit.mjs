import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const websiteDir = path.join(root, 'website');
const failures = [];
const warnings = [];

const read = (name) => fs.readFileSync(path.join(websiteDir, name), 'utf8');
const index = read('index.html');
const download = read('download.html');
const contact = read('contact.html');
const terms = read('terms.html');
const imprint = read('imprint.html');

// Current public phase is pre-launch/waitlist. Public static pages must not claim the app is already live.
const staticPublicPages = {
  'index.html': index,
  'contact.html': contact,
  'terms.html': terms,
  'imprint.html': imprint,
};
const forbiddenLiveClaims = [
  /\bNOW LIVE\b/i,
  /\bJETZT VERF(?:Ü|U)GBAR\b/i,
  /\bSADA DOSTUPNO\b/i,
  /SipMate is live\b/i,
  /SipMate ist live\b/i,
  /SipMate je stigao\b/i,
];
for (const [file, html] of Object.entries(staticPublicPages)) {
  for (const re of forbiddenLiveClaims) {
    if (re.test(html)) failures.push(`${file}: contains live-launch wording while static public site is still pre-launch`);
  }
}

// Homepage should consistently communicate pre-launch and still expose the waitlist.
for (const marker of ['COMING SOON', 'Join waitlist', '#waitlist', 'GERMANY FIRST']) {
  if (!index.includes(marker)) failures.push(`index.html: missing current pre-launch marker: ${marker}`);
}
if (!/BETA PREPARATION|COMING SOON/i.test(index)) failures.push('index.html: missing visible pre-launch status label');

// Contact page must not contradict the homepage.
if (!/preparing for launch|bereitet sich derzeit auf den Start vor|priprema za lansiranje/i.test(contact)) {
  warnings.push('contact.html: launch-state wording is neutral or has changed; review together with homepage before release phase changes.');
}

// Download page is the one public page allowed to contain all launch phases because it renders from public-launch-status.
for (const marker of ['public-launch-status', "phase:'waitlist'", "p==='preregister'", "p==='live'", 'COMING SOON', 'PRE-REGISTER', 'NOW LIVE']) {
  if (!download.includes(marker)) failures.push(`download.html: missing dynamic launch marker: ${marker}`);
}
if (!/play_store_url/.test(download)) failures.push('download.html: missing Play Store URL launch handling');
if (!/btn\.classList\.add\('show'\)/.test(download)) failures.push('download.html: missing conditional Play Store CTA display');

// Do not accidentally hard-code a fake/public Play link before launch config provides one.
const hardcodedPlayUrls = download.match(/https?:\/\/play\.google\.com\/[^"'\s<]+/gi) || [];
if (hardcodedPlayUrls.length) failures.push('download.html: hard-coded Google Play URL found; use public launch config instead');

// Pre-launch legal copy must not imply completed commercial launch.
if (!/pre-launch placeholder|before SipMate becomes publicly available/i.test(terms)) {
  warnings.push('terms.html no longer looks like a pre-launch draft; verify final Terms are intentionally published.');
}
if (!/public launch|before launch|will be added here/i.test(imprint)) {
  warnings.push('imprint.html no longer looks like a pre-launch placeholder; verify final provider details are intentional.');
}

if (failures.length) {
  failures.forEach((x) => console.error(`FAIL: ${x}`));
  warnings.forEach((x) => console.warn(`WARN: ${x}`));
  console.error(`Website launch wording audit failed with ${failures.length} issue(s).`);
  process.exit(1);
}

warnings.forEach((x) => console.warn(`WARN: ${x}`));
console.log(`Website launch wording audit passed with ${warnings.length} warning(s).`);
