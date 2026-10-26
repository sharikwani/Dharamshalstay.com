import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { queueUnpaidReminders, runDueJobs } from '@/lib/email/jobs';
import { runMarketingAutopilot } from '@/lib/email/autopilot';
import { runSocialAutopilot } from '@/lib/social/autopilot';
import { runStoriesAutopilot } from '@/lib/stories/feature';
import { runTripReminders } from '@/lib/booking-whatsapp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store'; // Next 14 caches GET fetches (Supabase reads) in route handlers otherwise
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
  // Evening before a trip: WhatsApp reminder with who to call (5-9 pm IST only, once per booking).
  const reminders = await runTripReminders().catch((e) => { console.error('trip reminders failed:', e); return 0; });
  // Instagram/Facebook: publish what is due, or write the next post. Gets the time booking emails left.
  const social = Date.now() - started < 15_000
    ? await runSocialAutopilot({ deadline: started + 55_000 }).catch((e) => { console.error('social autopilot failed:', e); return { error: String(e?.message || e) }; })
    : { skipped: 'out of time' };
  // Stories: screen new ones, retry the Instagram story, suggest today's pick to the owner.
  const stories = Date.now() - started < 25_000
    ? await runStoriesAutopilot({ deadline: started + 55_000 }).catch((e) => { console.error('stories autopilot failed:', e); return { error: String(e?.message || e) }; })
    : { skipped: 'out of time' };
  // Marketing emails only get what is left, and never block booking emails.
  const marketing = Date.now() - started < 30_000
    ? await runMarketingAutopilot({ deadline: started + 55_000 }).catch((e) => { console.error('marketing autopilot failed:', e); return { error: String(e?.message || e) }; })
    : { skipped: 'out of time' };
  return NextResponse.json({ ok: true, unpaid, jobs, reminders, social, stories, marketing, ms: Date.now() - started });
}

export const GET = run;
export const POST = run;
