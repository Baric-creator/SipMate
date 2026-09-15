import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const configPath = path.join(root, 'supabase', 'config.toml');
const functionsDir = path.join(root, 'supabase', 'functions');
const failures = [];

if (!fs.existsSync(configPath)) {
  failures.push('supabase/config.toml is missing');
} else {
  const config = fs.readFileSync(configPath, 'utf8');
  const sections = new Map();
  for (const match of config.matchAll(/\[functions\.([^\]]+)\]([\s\S]*?)(?=\n\[functions\.|$)/g)) {
    const verifyMatch = match[2].match(/verify_jwt\s*=\s*(true|false)/);
    sections.set(match[1], verifyMatch ? verifyMatch[1] === 'true' : null);
  }

  const expected = new Map([
    ['create-checkout-session', false],
    ['stripe-webhook', false],
    ['create-customer-portal', false],
    ['discord-oauth', false],
    ['join-waitlist', false],
    ['delete-account', true],
    ['admin-moderation', true],
    ['send-cheers-notification', true],
    ['send-message-notification', true],
    ['register-push-token', true],
    ['announce-cheers', true],
    ['send-welcome-email', true],
  ]);

  for (const [name, verifyJwt] of expected) {
    if (!sections.has(name)) {
      failures.push(`Missing [functions.${name}] in supabase/config.toml`);
      continue;
    }
    if (sections.get(name) !== verifyJwt) {
      failures.push(`${name} verify_jwt must remain ${verifyJwt}`);
    }
  }

  if (fs.existsSync(functionsDir)) {
    const sourceFunctions = fs.readdirSync(functionsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(functionsDir, entry.name, 'index.ts')))
      .map((entry) => entry.name);

    for (const name of sourceFunctions) {
      if (!sections.has(name)) failures.push(`Edge Function source ${name} has no explicit Supabase config section`);
    }
    for (const name of sections.keys()) {
      if (!fs.existsSync(path.join(functionsDir, name, 'index.ts'))) {
        failures.push(`Supabase config references ${name}, but its index.ts source is missing`);
      }
    }
  }
}

if (failures.length) {
  for (const failure of failures) console.error(`FAIL: ${failure}`);
  console.error(`Function config audit failed with ${failures.length} blocking issue(s).`);
  process.exit(1);
}

console.log('Function config audit passed.');
