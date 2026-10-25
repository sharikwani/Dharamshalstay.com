import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Download } from 'lucide-react';
import { ticketByCode, ticketCardUrl } from '@/lib/parties/tickets';
import { partyDateLabel } from '@/data/parties';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Your party ticket', robots: { index: false, follow: false } };

/** The buyer's own ticket page (linked from the ticket email and WhatsApp). The code is the key. */
export default async function TicketPage({ params }: { params: { code: string } }) {
  const t = await ticketByCode(decodeURIComponent(params.code).toUpperCase());
  if (!t) notFound();
  const card = ticketCardUrl(t.booking.ticket_code);
  return (
    <div className="min-h-[80vh] bg-[#120a26] px-4 py-10 text-white">
      <div className="mx-auto max-w-md text-center">
        <h1 className="text-2xl font-heading font-bold">Your ticket is confirmed 🎉</h1>
        <p className="mt-2 text-white/75">{t.party.name}<br />{partyDateLabel(t.party)}</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={card} alt={`Party ticket ${t.booking.ticket_code}`} className="mt-6 w-full rounded-2xl shadow-2xl" />
        <a href={card} download={`ticket-${t.booking.ticket_code}.jpg`} className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#f2c46d] px-6 py-3 font-semibold text-[#120a26]">
          <Download className="h-4 w-4" />Save your ticket
        </a>
        <p className="mt-4 text-sm text-white/70">Show this card or the code <strong className="text-white">{t.booking.ticket_code}</strong> at the entry. Booking ref {t.booking.booking_ref}.</p>
        <p className="mt-6 text-sm"><Link href="/new-year-parties" className="underline text-white/80">Christmas and New Year parties in Dharamshala</Link></p>
      </div>
    </div>
  );
}
