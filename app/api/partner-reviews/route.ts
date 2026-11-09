// app/api/partner-reviews/route.ts — a customer rates the partner who ran their taxi, trek or paragliding booking.
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { jsonError } from '@/lib/server-auth';
import { adminEmail, escHtml, sendEmail } from '@/lib/email';
import { siteConfig } from '@/lib/config';
import { submitPartnerReview } from '@/lib/partner-reviews';
import { TRAVEL_PARTNERS } from '@/data/travel-partners';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  token: z.string().min(20).max(80),
  rating: z.number().int().min(1).max(5),
  name: z.string().trim().min(1).max(60),
  body: z.string().max(1500).optional().nullable(),
});

export async function POST(req: Request) {
  try {
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Please choose 1 to 5 stars and add your name.' }, { status: 400 });
    const r = parsed.data;
    const { partnerId } = await submitPartnerReview(r);
    const profile = TRAVEL_PARTNERS.find((p) => p.partnerId === partnerId);
    if (profile) {
      for (const path of ['/travel-partners/' + profile.slug, '/travel-partners']) {
        try { revalidatePath(path); } catch (e) { console.error('Revalidate failed:', path, e); }
      }
    }
    try {
      await sendEmail({
        to: adminEmail(),
        subject: `New ${r.rating}★ rating${profile ? ' for ' + profile.name : ''}`,
        html: `<h2>New partner rating: ${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</h2>
          <p>By ${escHtml(r.name)}${profile ? ' for <strong>' + escHtml(profile.name) + '</strong>' : ''}</p>
          <p>${escHtml(r.body || '(no comment)').replace(/\n/g, '<br>')}</p>
          ${profile ? `<p><a href="${siteConfig.url}/travel-partners/${profile.slug}">See it on the profile</a></p>` : ''}
          <p>It is live now. To hide it, set status = 'hidden' on the row in partner_reviews.</p>`,
      });
    } catch (e) { console.error('Partner review email failed:', e); }
    return NextResponse.json({ ok: true, profile: profile ? '/travel-partners/' + profile.slug : null });
  } catch (e) { return jsonError(e); }
}
