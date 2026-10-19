// Makes a new CRON_SECRET, saves it in Vercel (production, sensitive) and .env.local, and copies the
// matching Supabase pg_cron SQL to the clipboard. The secret is never printed.
// Run: node scripts/rotate-cron-secret.mjs   then paste the clipboard into the Supabase SQL editor and redeploy.
import { randomBytes } from 'crypto';
import { spawnSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';

const secret = randomBytes(32).toString('hex');

const r = spawnSync('npx', ['--no-install', 'vercel', 'env', 'add', 'CRON_SECRET', 'production', '--sensitive', '--force', '--yes'],
  { input: secret, encoding: 'utf8', shell: true });
if (r.status !== 0) { console.error('Vercel did not save it:', (r.stderr || r.stdout).replace(secret, '***')); process.exit(1); }
console.log('Vercel: CRON_SECRET replaced (production, sensitive)');

const envFile = '.env.local';
const env = readFileSync(envFile, 'utf8');
writeFileSync(envFile, /^CRON_SECRET=.*$/m.test(env) ? env.replace(/^CRON_SECRET=.*$/m, 'CRON_SECRET=' + secret) : env + '\nCRON_SECRET=' + secret + '\n');
console.log('.env.local: updated');

const sql = `SELECT cron.unschedule('email-engine') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'email-engine');
SELECT cron.schedule(
  'email-engine',
  '*/10 * * * *',
  $$ SELECT net.http_post(
       url := 'https://www.dharamshalastay.com/api/cron/email',
       headers := jsonb_build_object('Authorization', 'Bearer ${secret}', 'Content-Type', 'application/json'),
       body := '{}'::jsonb,
       timeout_milliseconds := 55000
     ) $$
);
`;
const c = spawnSync('clip', { input: sql, shell: true });
console.log(c.status === 0 ? 'Supabase SQL: copied to your clipboard. Paste it into the SQL editor and Run.' : 'Could not copy to the clipboard.');
