// lib/offers/paid.ts
import { adminEmail, sendEmail } from '@/lib/email';
import { attachPaidOffer } from './store';

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** Email the owner; failures are only logged. */
export async function emailOwner(subject: string, html: string, where: string): Promise<void> {
  try { await sendEmail({ to: adminEmail(), subject, html }); } catch (e) { console.error(`${where}: owner email failed:`, e); }
}

/**
 * A booking was just paid: a WhatsApp offer booking paid late (after its code was released) takes its code back.
 * On a conflict, or when the check itself fails, the owner is emailed. Never throws.
 */
export async function settlePaidOffer(booking: { id: string; booking_ref: string }, where: string): Promise<void> {
  const ref = esc(booking.booking_ref);
  let result: Awaited<ReturnType<typeof attachPaidOffer>>;
  try {
    result = await attachPaidOffer(booking.id);
  } catch (e) {
    console.error(`${where}: offer code attach failed:`, e);
    await emailOwner(`Offer code check failed for paid booking ${booking.booking_ref}`,
      `<p>Offer code check failed for paid booking <b>${ref}</b> – check the code in Admin → Offers.</p>`, where);
    return;
  }
  if (result === 'conflict') {
    await emailOwner(`Offer code conflict on paid booking ${booking.booking_ref}`,
      `<p>Booking <b>${ref}</b> was paid at the WhatsApp offer price, but its offer code was already used, cancelled or linked to another booking. Check it in Admin → WhatsApp offers.</p>`, where);
  }
}
