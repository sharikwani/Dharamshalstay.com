// Production deploy that does not depend on GitHub notifying Vercel (that link was missing pushes in Oct 2026).
// Run only after the owner has said "push":   npm run deploy
// It pushes main to GitHub, then waits up to 90 s for Vercel's GitHub app to start a build for that commit
// (seen as a vercel[bot] deployment on GitHub). Only if none appears does it call the Vercel deploy hook
// (VERCEL_DEPLOY_HOOK in .env.local, never committed), so each commit builds once, not twice.
// The hook URL is never printed.
import { execSync } from 'node:child_process';

process.loadEnvFile?.('.env.local');
const hook = process.env.VERCEL_DEPLOY_HOOK;
if (!hook) { console.error('VERCEL_DEPLOY_HOOK is not set in .env.local (Vercel > Settings > Git > Deploy Hooks).'); process.exit(1); }

execSync('git push origin main', { stdio: 'inherit' });
const sha = execSync('git rev-parse HEAD').toString().trim();

/** True once Vercel's GitHub app has registered a deployment for this commit. Any error counts as "not yet". */
function gitBuildStarted() {
  try {
    const out = execSync(`gh api "repos/{owner}/{repo}/deployments?sha=${sha}" --jq "[.[] | select(.creator.login == \\"vercel[bot]\\")] | length"`,
      { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    return Number(out) > 0;
  } catch { return false; }
}

console.log('Waiting for Vercel to pick up', sha.slice(0, 7), 'from GitHub…');
for (let i = 0; i < 18; i++) {
  if (gitBuildStarted()) {
    console.log('Vercel build started from GitHub for', sha.slice(0, 7), '- live in about 3 minutes. (Deploy hook not needed.)');
    process.exit(0);
  }
  await new Promise((r) => setTimeout(r, 5000));
}

console.log('No build from GitHub after 90 s; starting one with the deploy hook.');
const res = await fetch(hook, { method: 'POST' });
const body = await res.json().catch(() => ({}));
if (!res.ok) { console.error('Vercel did not accept the deploy:', res.status); process.exit(1); }
console.log('Vercel deploy started for main:', body?.job?.id || 'ok', '- live in about 3 minutes.');
