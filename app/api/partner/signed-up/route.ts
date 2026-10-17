import { NextResponse } from 'next/server';
import { z } from 'zod';
import { jsonError, serviceClient } from '@/lib/server-auth';
import { emailAdminPartnerSignedUp } from '@/lib/partners/emails';

export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';

const schema = z.object({ id: z.string().uuid() });

/**
 * Called by the partner register page right after sign-up, so admin hears about a new partner before they
 * confirm their email (many never do). Only a partner created in the last 30 minutes, and only once.
 */
export async function POST(req: Request) {
  try {
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ ok: true });
    const sb = serviceClient();
    const { data: p } = await sb.from('profiles').select('id, role, email, full_name, phone, business_name, partner_type, created_at').eq('id', parsed.data.id).maybeSingle();
    if (!p || p.role !== 'partner' || Date.now() - new Date(p.created_at).getTime() > 30 * 60e3) return NextResponse.json({ ok: true });
    const { count } = await sb.from('email_messages').select('id', { count: 'exact', head: true })
      .eq('template', 'admin_partner_signup').ilike('subject', `%${p.email}%`);
    if (!count) await emailAdminPartnerSignedUp(p);
    return NextResponse.json({ ok: true });
  } catch (e) { return jsonError(e); }
}
