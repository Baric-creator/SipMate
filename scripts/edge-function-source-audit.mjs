import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const srcRoot = path.join(root, 'src');
const failures = [];
const invoked = new Set();

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(?:ts|tsx|js|mjs)$/i.test(entry.name)) {
      const source = fs.readFileSync(full, 'utf8');
      for (const match of source.matchAll(/\.functions\.invoke\(\s*['"]([^'"]+)['"]/g)) {
        invoked.add(match[1]);
      }
    }
  }
}

walk(srcRoot);

for (const functionName of invoked) {
  const sourcePath = path.join(root, 'supabase', 'functions', functionName, 'index.ts');
  if (!fs.existsSync(sourcePath)) {
    failures.push(`App invokes ${functionName}, but ${path.relative(root, sourcePath)} is missing from the repository`);
  }
}

for (const required of [
  'delete-account',
  'create-checkout-session',
  'create-customer-portal',
  'stripe-webhook',
  'register-push-token',
  'send-message-notification',
  'send-cheers-notification',
  'announce-cheers',
  'discord-oauth',
  'join-waitlist',
  'send-welcome-email',
]) {
  const sourcePath = path.join(root, 'supabase', 'functions', required, 'index.ts');
  if (!fs.existsSync(sourcePath)) failures.push(`Release-critical Edge Function source is missing: ${required}`);
}

if (failures.length) {
  for (const failure of failures) console.error(`FAIL: ${failure}`);
  console.error(`Edge Function source audit failed with ${failures.length} blocking issue(s).`);
  process.exit(1);
}

console.log(`Edge Function source audit passed for ${invoked.size} app-invoked function(s).`);
