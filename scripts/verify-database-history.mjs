import { spawnSync } from 'node:child_process';

const KNOWN_BASELINE_SIGNATURE = 'relation "public.blocks" does not exist';

const result = spawnSync('supabase', ['db', 'start'], {
  encoding: 'utf8',
  shell: process.platform === 'win32',
});

const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
process.stdout.write(output);

if (result.error) {
  console.error(`Unable to execute Supabase CLI: ${result.error.message}`);
  process.exit(1);
}

if (result.status === 0) {
  console.log('MIGRATION_REPLAY_OK=true');
  process.exit(0);
}

if (output.includes(KNOWN_BASELINE_SIGNATURE)) {
  console.log('MIGRATION_REPLAY_OK=false');
  console.log('KNOWN_BASELINE_GAP=true');
  console.log(
    'Historical SipMate production tables predate the committed migration history; pgTAP must not be reported as executed.'
  );
  process.exit(2);
}

console.error('MIGRATION_REPLAY_OK=false');
console.error('KNOWN_BASELINE_GAP=false');
console.error('Unexpected database replay failure.');
process.exit(result.status || 1);
