import { z } from 'zod';
import { serviceClient, HttpError } from '@/lib/server-auth';
import { adminEmail, escHtml, sendEmail } from '@/lib/email';
import { siteConfig } from '@/lib/config';
import { verifyListingKey } from './links';

export const listingRequestSchema = z.object({
  slug: z.string().min(1).max(200),
  kind: z.enum(['claim', 'removal']),
  token: z.string().max(100).optional().nullable(),
  name: z.string().trim().min(2, 'Please enter your name').max(120),
  phone: z.string().trim().regex(/^[+\d][\d\s-]{8,18}$/, 'Please enter a valid phone number'),
  email: z.string().trim().email('Please enter a valid email').max(200).optional().or(z.literal('')),
  role: z.string().trim().max(80).optional(),
  message: z.string().trim().max(1500).optional(),
  // Honeypot: real people never fill it.
  website: z.string().max(0).optional(),
});
export type ListingRequestInput = z.infer<typeof listingRequestSchema>;

const RATE_LIMIT = 5;
const HOUR_MS = 3600e3;

export type RequestOutcome = { kind: 'claim' | 'removal'; verified: boolean; removed: boolean; name: string };

/**
 * Save a claim or removal request. A removal sent through the hotel's own keyed
 * link takes the listing off the site at once; everything else waits for an admin.
 */
export async function submitListingRequest(input: ListingRequestInput, ipHash: string): Promise<RequestOutcome> {
  const sb = serviceClient();
  if (input.kind === 'claim' && !input.email) throw new HttpError(400, 'Please enter your email so we can set up your partner login');

  const since = new Date(Date.now() - HOUR_MS).toISOString();
  const { count } = await sb.from('listing_requests').select('id', { count: 'exact', head: true }).eq('ip_hash', ipHash).gte('created_at', since);
  if ((count || 0) >= RATE_LIMIT) throw new HttpError(429, 'Too many requests. Please try again in an hour or WhatsApp us.');

  const { data: p } = await sb.from('properties').select('id, name, slug, status, listing_type').eq('slug', input.slug).maybeSingle();
  if (!p) throw new HttpError(404, 'Listing not found');

  const verified = verifyListingKey(p.id, input.token);
  const removeNow = input.kind === 'removal' && verified && p.status === 'published';

  const { error } = await sb.from('listing_requests').insert({
    property_id: p.id, kind: input.kind, name: input.name, phone: input.phone,
    email: input.email || null, role: input.role || null, message: input.message || null,
    verified, status: removeNow ? 'done' : 'pending', ip_hash: ipHash,
    admin_note: removeNow ? 'Removed automatically: request came through the link sent to the hotel' : null,
  });
  if (error) throw new Error('Could not save listing request: ' + error.message);

  if (removeNow) {
    const { error: upErr } = await sb.from('properties')
      .update({ status: 'suspended', updated_at: new Date().toISOString() })
      .eq('id', p.id).eq('status', 'published');
    if (upErr) throw new Error('Could not unpublish listing: ' + upErr.message);
  }

  await notifyAdmin(p.name, input, verified, removeNow);
  return { kind: input.kind, verified, removed: removeNow, name: p.name };
}

async function notifyAdmin(hotel: string, r: ListingRequestInput, verified: boolean, removed: boolean) {
  const what = r.kind === 'claim' ? 'Claim request' : removed ? 'Listing removed on request' : 'Removal request';
  try {
    await sendEmail({
      to: adminEmail(),
      subject: `${what}: ${hotel}`,
      html: `
        <h2>${escHtml(what)}</h2>
        <p><strong>${escHtml(hotel)}</strong>${verified ? ' (sent from the link we WhatsApped to the hotel)' : ' (from the public page, not verified)'}</p>
        <p>${escHtml(r.name)}${r.role ? ' · ' + escHtml(r.role) : ''} · ${escHtml(r.phone)}${r.email ? ' · ' + escHtml(r.email) : ''}</p>
        ${r.message ? '<p>' + escHtml(r.message).replace(/\n/g, '<br>') + '</p>' : ''}
        <p><a href="${siteConfig.url}/admin/listing-requests">Open listing requests</a></p>
      `,
    });
  } catch (e) {
    console.error('Listing request email failed:', e);
  }
}
