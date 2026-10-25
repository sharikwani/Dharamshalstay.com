import { NextRequest, NextResponse } from 'next/server';
import { createTicketBooking, ticketSchema } from '@/lib/parties/tickets';
import { createCheckoutLink } from '@/lib/bookings/checkout';
import { onlinePaymentEnabled } from '@/lib/razorpay';

export const fetchCache = 'force-no-store';

/** POST: buy party tickets. Creates the ticket booking at the party's price and returns the payment link. */
export async function POST(req: NextRequest) {
  try {
    if (!onlinePaymentEnabled()) return NextResponse.json({ error: 'Online payment is not available right now. Please WhatsApp us to book.' }, { status: 503 });
    const parsed = ticketSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Please fill in your name, email, mobile number and tickets.' }, { status: 400 });
    const r = await createTicketBooking(parsed.data);
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
    const link = await createCheckoutLink(r.bookingId).catch((e) => { console.error('Ticket checkout failed:', e); return null; });
    if (!link?.ok) return NextResponse.json({ error: link && !link.ok ? link.error : 'Could not start payment. Please try again.' }, { status: 502 });
    return NextResponse.json({ url: link.url, booking_ref: r.bookingRef, amount: r.amount });
  } catch (e) {
    console.error('Party ticket API error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
