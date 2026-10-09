import { NextResponse } from 'next/server';
import { jsonError } from '@/lib/server-auth';
import { loadOnboarding, requireActivityPartner } from '@/lib/partners/load';
import { agreementFor } from '@/lib/partners/agreement';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { profile } = await requireActivityPartner(req);
    const state = await loadOnboarding(profile.id);
    return NextResponse.json({ ...state, agreement: agreementFor(profile.partner_type) });
  } catch (e) { return jsonError(e); }
}
