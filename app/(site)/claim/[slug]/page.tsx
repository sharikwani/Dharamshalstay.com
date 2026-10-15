import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CheckCircle, ShieldCheck } from 'lucide-react';
import ListingRequestForm from '@/components/listings/ListingRequestForm';
import { loadListingForRequest } from '@/lib/listings/page-data';
import { getWhatsAppLink } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const l = await loadListingForRequest(params.slug);
  return {
    title: l ? 'Claim ' + l.name + ' on Dharamshala Stay' : 'Claim your listing',
    robots: { index: false, follow: false },
    referrer: 'no-referrer',
  };
}

const BENEFITS = [
  'Correct your photos, rooms, phone number and description',
  'Take bookings with live rates and availability -- no listing fee',
  'Get booking alerts on WhatsApp and reply to guest reviews',
  'Show a "Verified property" badge instead of "Directory listing"',
];

export default async function ClaimPage({ params, searchParams }: { params: { slug: string }; searchParams: { t?: string } }) {
  const l = await loadListingForRequest(params.slug);
  if (!l) notFound();

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      <p className="text-sm font-semibold text-brand-700 mb-2">For hotel owners and managers</p>
      <h1 className="text-2xl sm:text-3xl font-heading font-bold text-slate-900 mb-3">Claim {l.name}</h1>
      {l.claimable ? (
        <>
          <p className="text-slate-600 mb-6">
            {l.live ? <>We list <Link href={'/hotels/' + l.slug} className="underline">{l.name}</Link> in our free guide to stays in Dharamshala. </> : null}
            Claim it to manage the listing yourself. It's free.
          </p>
          <ul className="space-y-2 mb-8">
            {BENEFITS.map((b) => <li key={b} className="flex gap-2 text-slate-700"><CheckCircle className="h-5 w-5 text-green-600 shrink-0" />{b}</li>)}
          </ul>
          {searchParams.t && (
            <p className="flex items-center gap-2 text-sm text-green-800 bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-4">
              <ShieldCheck className="h-4 w-4 shrink-0" /> You opened this from our WhatsApp message to the hotel, so we can verify you faster.
            </p>
          )}
          <ListingRequestForm slug={l.slug} hotelName={l.name} kind="claim" token={searchParams.t} />
        </>
      ) : (
        <p className="text-slate-600">This listing is already managed by its owner. If that's not right, <a href={getWhatsAppLink('Hi! About the listing for ' + l.name + '...')} className="underline" target="_blank" rel="noopener noreferrer">WhatsApp us</a>.</p>
      )}
      <p className="text-sm text-slate-500 mt-8">
        Prefer not to be listed? <Link href={'/remove-listing/' + l.slug + (searchParams.t ? '?t=' + encodeURIComponent(searchParams.t) : '')} className="underline">Ask us to remove {l.name}</Link>.
      </p>
    </div>
  );
}
