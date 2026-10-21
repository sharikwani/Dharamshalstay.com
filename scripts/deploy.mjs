// Production deploy that does not depend on GitHub notifying Vercel (that link has been missing pushes).
// Run only after the owner has said "push":   npm run deploy
// It pushes main to GitHub, then calls the Vercel deploy hook for main (VERCEL_DEPLOY_HOOK in .env.local,
// never committed). The hook URL is never printed.
import { execSync } from 'node:child_process';

process.loadEnvFile?.('.env.local');
const hook = process.env.VERCEL_DEPLOY_HOOK;
if (!hook) { console.error('VERCEL_DEPLOY_HOOK is not set in .env.local (Vercel > Settings > Git > Deploy Hooks).'); process.exit(1); }

execSync('git push origin main', { stdio: 'inherit' });
const res = await fetch(hook, { method: 'POST' });
const body = await res.json().catch(() => ({}));
if (!res.ok) { console.error('Vercel did not accept the deploy:', res.status); process.exit(1); }
console.log('Vercel deploy started for main:', body?.job?.id || 'ok', '- live in about 3 minutes.');
