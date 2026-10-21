import { NextResponse } from 'next/server';
import { jsonError, serviceClient } from '@/lib/server-auth';
import { jsonBody } from '@/lib/stories/request';
import { sendSetPasswordEmail } from '@/lib/partners/accounts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

/**
 * "Forgot password?" for partner accounts. Always answers the same way, so it never reveals whether an email
 * has an account; the link only goes to the account's own email.
 */
export async function POST(req: Request) {
  try {
    const b = await jsonBody(req);
    const email = String(b.email || '').trim().toLowerCase();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      const { data: p } = await serviceClient().from('profiles').select('id, full_name, legal_name, role').eq('email', email).maybeSingle();
      if (p && (p.role === 'partner' || p.role === 'admin')) {
        await sendSetPasswordEmail(email, p.legal_name || p.full_name || '', 'reset').catch((e) => console.error('Password reset email failed:', e));
      }
    }
    return NextResponse.json({ ok: true });
  } catch (e) { return jsonError(e); }
}
