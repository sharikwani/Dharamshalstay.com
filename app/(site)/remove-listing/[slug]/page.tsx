import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ListingRequestForm from '@/components/listings/ListingRequestForm';
import { loadListingForRequest } from '@/lib/listings/page-data';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store'; // always live data, never a cached Supabase read

export const metadata: Metadata = {
  title: 'Remove a listing',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default async function RemoveListingPage({ params, searchParams }: { params: { slug: string }; searchParams: { t?: string } }) {
  const l = await loadListingForRequest(params.slug);
  if (!l) notFound();

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      <h1 className="text-2xl sm:text-3xl font-heading font-bold text-slate-900 mb-3">Remove {l.name} from Dharamshala Stay</h1>
      {l.live ? (
        <>
          <p className="text-slate-600 mb-2">
            We wrote a free guide entry for {l.name} so travellers can find it. If you own or manage it and would rather not be listed, send this form and we'll take it down.
          </p>
          <p className="text-slate-600 mb-6">
            {searchParams.t
              ? 'Because you opened this from our WhatsApp message to the hotel, the listing is removed as soon as you send the form.'
              : "We'll quickly confirm you're from the hotel first, then remove it, normally within 48 hours."}
          </p>
          <ListingRequestForm slug={l.slug} hotelName={l.name} kind="removal" token={searchParams.t} />
          <p className="text-sm text-slate-500 mt-8">
            Only want to fix something, like photos or the phone number? <Link href={'/claim/' + l.slug + (searchParams.t ? '?t=' + encodeURIComponent(searchParams.t) : '')} className="underline">Claim the listing instead</Link>, it's free.
          </p>
        </>
      ) : (
        <p className="text-slate-600">This listing has already been removed from the site.</p>
      )}
    </div>
  );
}
