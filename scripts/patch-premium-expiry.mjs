import fs from 'node:fs';
const path = 'src/app/premium.tsx';
let s = fs.readFileSync(path, 'utf8');
if (!s.includes("import { isPremiumActive } from '../lib/premium-status';")) {
  s = s.replace("import { showAlert } from '../lib/notify';", "import { showAlert } from '../lib/notify';\nimport { isPremiumActive } from '../lib/premium-status';");
}
const oldLine = "    const premiumActive = profile?.is_premium === true;";
const newLine = "    const premiumActive = isPremiumActive(profile?.is_premium, profile?.premium_until);";
if (!s.includes(oldLine) && !s.includes(newLine)) throw new Error('Premium status line not found');
s = s.replace(oldLine, newLine);
fs.writeFileSync(path, s);
