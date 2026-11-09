/**
 * Thank a customer after a completed taxi, trek or paragliding trip and send the link to rate the partner
 * (template partnerThankYou in lib/email/templates.ts). The booking must be completed and have a partner.
 *
 *   npx tsx scripts/send-partner-thanks.ts TXI-261107-AD456          (preview only: prints and saves the HTML)
 *   npx tsx scripts/send-partner-thanks.ts TXI-261107-AD456 --send   (sends the email through deliver())
 *
 * Owner rule: only send with the owner's OK.
 */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const root = join(__dirname, '..');
for (const l of readFileSync(join(root, '.env.local'), 'utf8').split(/\r?\n/)) {
  const i = l.indexOf('=');
  if (i < 1 || l.startsWith('#')) continue;
  const k = l.slice(0, i).trim();
  if (!process.env[k]) process.env[k] = l.slice(i + 1).trim().replace(/^["']|["']$/g, '');
}

async function main() {
  const ref = process.argv[2];
  const send = process.argv.includes('--send');
  if (!ref) throw new Error('Usage: npx tsx scripts/send-partner-thanks.ts <booking ref or id> [--send]');
  const { serviceClient } = await import('../lib/server-auth');
  const { loadBookingData } = await import('../lib/email/data');
  const { partnerReviewUrl, rateContext, reviewToken } = await import('../lib/partner-reviews');
  const { partnerThankYou } = await import('../lib/email/templates');
  const { renderEmail } = await import('../lib/email/layout');
  const { deliver } = await import('../lib/email/send');

  const col = /^[0-9a-f-]{36}$/i.test(ref) ? 'id' : 'booking_ref';
  const { data: row } = await serviceClient().from('bookings').select('id').eq(col, ref).maybeSingle();
  if (!row) throw new Error('No booking ' + ref);
  const b = await loadBookingData(row.id);
  if (!b) throw new Error('Could not load booking ' + ref);
  if (!b.guest_email) throw new Error('Booking has no email address');
  const ctx = await rateContext(reviewToken(b.id));
  if (!ctx) throw new Error('Booking cannot be rated: it must be completed, with a partner, and be a taxi, trek or paragliding booking');
  if (ctx.alreadyRated) throw new Error('This trip has already been rated');

  const rate_url = partnerReviewUrl(b.id);
  const built = partnerThankYou({ ...b, rate_url, partner_name: ctx.partnerName, vehicle: ctx.vehicle, item: ctx.item });
  const file = join(tmpdir(), `partner-thanks-${b.booking_ref}.html`);
  writeFileSync(file, renderEmail(built.doc));
  console.log(`To:      ${b.guest_email}\nSubject: ${built.subject}\nRate:    ${rate_url}\nPreview: ${file}`);
  if (!send) { console.log('\nPreview only. Add --send to send it.'); return; }
  const r = await deliver({ to: b.guest_email, subject: built.subject, doc: built.doc, kind: 'transactional', template: 'partner_thanks', bookingId: b.id });
  console.log('\nResult:', JSON.stringify(r));
}

main().catch((e) => { console.error(e.message || e); process.exit(1); });
