import fs from 'node:fs';
import path from 'node:path';

const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');
const failures = [];

if (!fs.existsSync(migrationsDir)) {
  failures.push('Missing supabase/migrations directory');
} else {
  const versions = new Map();
  for (const file of fs.readdirSync(migrationsDir).filter((name) => name.endsWith('.sql'))) {
    const match = file.match(/^(\d{14})_/);
    if (!match) {
      failures.push(`Migration filename does not start with a 14-digit version: ${file}`);
      continue;
    }

    const version = match[1];
    const existing = versions.get(version);
    if (existing) {
      failures.push(`Duplicate Supabase migration version ${version}: ${existing} and ${file}`);
      continue;
    }
    versions.set(version, file);
  }
}

if (failures.length) {
  failures.forEach((failure) => console.error(`FAIL: ${failure}`));
  console.error(`Migration version audit failed with ${failures.length} blocking issue(s).`);
  process.exit(1);
}

console.log('Migration version audit passed.');
