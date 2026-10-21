import { NextResponse } from 'next/server';
import { partnerServices } from '@/lib/partners/types';
import { jsonError } from '@/lib/server-auth';
import { loadOnboarding, requireActivityPartner } from '@/lib/partners/load';
import { agreementFor } from '@/lib/partners/agreement';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store'; // Next 14 caches GET fetches (Supabase reads) in route handlers otherwise

export async function GET(req: Request) {
  try {
    const { profile } = await requireActivityPartner(req);
    const state = await loadOnboarding(profile.id);
    return NextResponse.json({ ...state, agreement: agreementFor(partnerServices(profile)) });
  } catch (e) { return jsonError(e); }
}
