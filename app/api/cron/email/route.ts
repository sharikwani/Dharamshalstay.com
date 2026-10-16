import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { queueUnpaidReminders, runDueJobs } from '@/lib/email/jobs';
import { runMarketingAutopilot } from '@/lib/email/autopilot';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Email engine heartbeat. Called every 10 minutes by Supabase pg_cron (migration-v31) with
 * "Authorization: Bearer <CRON_SECRET>". Also accepts Vercel Cron's identical header.
 */
function authorised(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const got = Buffer.from((req.headers.get('authorization') || '').replace(/^Bearer\s+/i, ''));
  const want = Buffer.from(secret);
  return got.length === want.length && timingSafeEqual(got, want);
}

async function run(req: NextRequest) {
  if (!authorised(req)) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  const started = Date.now();
  const unpaid = await queueUnpaidReminders().catch((e) => { console.error('unpaid reminders failed:', e); return 0; });
  const jobs = await runDueJobs();
  // Marketing only gets the time left in this run, and never blocks booking emails.
  const marketing = Date.now() - started < 30_000
    ? await runMarketingAutopilot({ deadline: started + 50_000 }).catch((e) => { console.error('marketing autopilot failed:', e); return { error: String(e?.message || e) }; })
    : { skipped: 'out of time' };
  return NextResponse.json({ ok: true, unpaid, jobs, marketing, ms: Date.now() - started });
}

export const GET = run;
export const POST = run;
