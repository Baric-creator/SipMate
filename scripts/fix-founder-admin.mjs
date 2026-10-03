import { readFileSync, writeFileSync } from 'node:fs';

const path = new URL('../website/founder.html', import.meta.url);
let source = readFileSync(path, 'utf8');
const before = source;

// The moderation API can return verification_failed metrics even though the current
// founder markup has no cards for them. Never let an optional metric crash the
// entire moderation render.
source = source.replace(
  "document.getElementById('photoVerificationFailed').textContent=safe(ps.verification_failed?.total,0);document.getElementById('photoVerificationFailed7d').textContent=`${safe(ps.verification_failed?.last_7d,0)} in last 7d`;",
  "const photoVerificationFailed=document.getElementById('photoVerificationFailed');if(photoVerificationFailed)photoVerificationFailed.textContent=safe(ps.verification_failed?.total,0);const photoVerificationFailed7d=document.getElementById('photoVerificationFailed7d');if(photoVerificationFailed7d)photoVerificationFailed7d.textContent=`${safe(ps.verification_failed?.last_7d,0)} in last 7d`;"
);

// Add a direct route from the founder control room to the already-existing
// App Health & Problem Reports inbox, without mixing safety reports and app bugs.
if (!source.includes('href="./app-health.html"')) {
  source = source.replace(
    '<div class="hero-actions">',
    '<div class="hero-actions"><a class="btn secondary" href="./app-health.html">🐞 Problem Reports</a>'
  );
}

if (source === before) {
  console.log('Founder dashboard already repaired; no changes needed.');
  process.exit(0);
}

writeFileSync(path, source, 'utf8');
console.log('Founder dashboard repaired: moderation is null-safe and Problem Reports is linked.');
