import { config } from 'dotenv';
import { execSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
config({ path: join(root, '.env') });

const directUrl = process.env.DIRECT_URL?.trim();
if (!directUrl) {
  console.error('DIRECT_URL is not set in apps/api/.env');
  console.error('Add your Supabase session/direct connection (port 5432), not the pooler on 6543.');
  process.exit(1);
}

const hostMatch = directUrl.match(/@([^/:]+)/);
const maxAttempts = 3;

for (let attempt = 1; attempt <= maxAttempts; attempt++) {
  console.log(
    attempt === 1
      ? `Running migrations via ${hostMatch?.[1] ?? 'direct URL'}…`
      : `Retrying migration (attempt ${attempt}/${maxAttempts})…`,
  );

  try {
    execSync('pnpm exec prisma migrate deploy', {
      cwd: root,
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: directUrl },
    });
    process.exit(0);
  } catch {
    if (attempt < maxAttempts) {
      await sleep(attempt * 3000);
    }
  }
}

console.error('\nMigration failed after retries. Common fixes:');
console.error('- Confirm Supabase project is not paused (Dashboard → Project Settings)');
console.error('- Use DIRECT_URL with port 5432 (session/direct), not 6543 (pooler)');
console.error('- Retry on a stable network; disable VPN if connection is blocked');
process.exit(1);
