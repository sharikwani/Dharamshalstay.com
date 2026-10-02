import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Users, Sparkles, Navigation, CheckCircle, MessageCircle, Building, ExternalLink, Info } from 'lucide-react';
import { Breadcrumb, HotelCard } from '@/components/ui/Cards';
import InquiryForm from '@/components/forms/InquiryForm';
import type { DirectoryProperty } from '@/data/directory-hotels';
import type { Property } from '@/types';
import { getWhatsAppLink } from '@/lib/utils';

const BAND_LABEL: Record<DirectoryProperty['price_band'], string> = {
  budget: 'Budget',
  'mid-range': 'Mid-range',
  upscale: 'Upscale',
};

/**
 * Page for a real property we list but don't (yet) partner with.
 * Deliberately shows no prices, ratings or property photos we don't own,
 * and says plainly that rates are confirmed on enquiry.
 */
export default function DirectoryListing({ hotel, related }: { hotel: DirectoryProperty; related: Property[] }) {
  const area = hotel.city;
  const img = hotel.images?.[0];

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
        <Breadcrumb items={[
          { label: 'Home', href: '/' },
          { label: 'Hotels', href: '/hotels' },
          { label: area, href: '/destinations/' + hotel.destination_slug },
          { label: hotel.name },
        ]} />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-16 grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="text-xs font-semibold px-2.5 py-1 bg-brand-50 text-brand-700 rounded-full capitalize">{hotel.type}</span>
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full">{BAND_LABEL[hotel.price_band]}</span>
            <span className="text-xs font-semibold px-2.5 py-1 bg-amber-50 text-amber-800 rounded-full">Directory listing</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-bold text-slate-900 mb-2">{hotel.name}</h1>
          <p className="flex items-center gap-1.5 text-slate-600 mb-6">
            <MapPin className="h-4 w-4 text-brand-500" />{hotel.locality}
          </p>

          {img && (
            <figure className="mb-8">
              <div className="relative aspect-[16/9] rounded-2xl overflow-hidden bg-slate-100">
                <Image src={img.url} alt={img.alt} fill className="object-cover" priority sizes="(max-width:1024px) 100vw, 66vw" />
              </div>
              <figcaption className="text-xs text-slate-500 mt-2">
                Photo of the {area} area, not of the property. <Link href="/photo-credits" className="underline">Photo credits</Link>.
              </figcaption>
            </figure>
          )}

          <section className="mb-8">
            <h2 className="text-xl font-heading font-bold text-slate-900 mb-3">About {hotel.name}</h2>
            {hotel.description.split('\n\n').map((para, i) => (
              <p key={i} className="text-slate-600 leading-relaxed mb-3">{para}</p>
            ))}
          </section>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
            {hotel.highlights.length > 0 && (
              <div className="bg-slate-50 rounded-xl p-5">
                <h2 className="font-heading font-semibold text-slate-900 mb-3 flex items-center gap-2"><Sparkles className="h-4 w-4 text-brand-600" />Highlights</h2>
                <ul className="space-y-2 text-sm text-slate-700">
                  {hotel.highlights.map((h) => <li key={h} className="flex gap-2"><CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />{h}</li>)}
                </ul>
              </div>
            )}
            {hotel.nearby.length > 0 && (
              <div className="bg-slate-50 rounded-xl p-5">
                <h2 className="font-heading font-semibold text-slate-900 mb-3 flex items-center gap-2"><Navigation className="h-4 w-4 text-brand-600" />What&apos;s nearby</h2>
                <ul className="space-y-2 text-sm text-slate-700">
                  {hotel.nearby.map((n) => <li key={n}>{n}</li>)}
                </ul>
              </div>
            )}
          </div>

          {hotel.good_for.length > 0 && (
            <div className="mb-8">
              <h2 className="font-heading font-semibold text-slate-900 mb-3 flex items-center gap-2"><Users className="h-4 w-4 text-brand-600" />Good for</h2>
              <div className="flex flex-wrap gap-2">
                {hotel.good_for.map((g) => <span key={g} className="text-sm bg-blue-50 text-brand-800 px-3 py-1.5 rounded-full">{g}</span>)}
              </div>
            </div>
          )}

          {hotel.amenities?.length > 0 && (
            <div className="mb-8">
              <h2 className="font-heading font-semibold text-slate-900 mb-3">Facilities</h2>
              <div className="flex flex-wrap gap-2">
                {hotel.amenities.map((a: string) => <span key={a} className="text-sm bg-slate-100 text-slate-700 px-3 py-1.5 rounded-full">{a}</span>)}
              </div>
            </div>
          )}

          <div className="flex gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900 mb-8">
            <Info className="h-5 w-5 shrink-0 mt-0.5" />
            <p>
              This is an independent directory listing written by our local team. {hotel.name} is not a Dharamshala Stay partner yet,
              so we can&apos;t show live rates. Send an enquiry and we&apos;ll check availability and prices for your dates, or suggest a
              similar <Link href={'/destinations/' + hotel.destination_slug} className="underline font-medium">stay in {area}</Link>.
            </p>
          </div>

          <div className="border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Building className="h-5 w-5 text-brand-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-900">Own or manage {hotel.name}?</p>
                <p className="text-sm text-slate-600">Claim this listing to add your photos, rooms and direct rates -- free.</p>
              </div>
            </div>
            <a href={getWhatsAppLink('Hi! I manage ' + hotel.name + ' and want to claim our listing on Dharamshala Stay.')}
              target="_blank" rel="noopener noreferrer"
              className="shrink-0 text-center bg-brand-600 text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-brand-700 text-sm">
              Claim this listing
            </a>
          </div>
        </div>

        <aside className="lg:sticky lg:top-24 self-start space-y-4">
          <InquiryForm type="hotel" contextNote={'Directory hotel: ' + hotel.name + ', ' + hotel.locality}
            title="Check rates & availability" subtitle={'We\'ll contact ' + hotel.name + ' or suggest similar stays.'} />
          <a href={getWhatsAppLink('Hi! Please check availability at ' + hotel.name + ' (' + hotel.locality + ').')}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-green-500 text-white py-3 rounded-xl font-semibold hover:bg-green-600">
            <MessageCircle className="h-4 w-4" /> Ask on WhatsApp
          </a>
          {hotel.website && (
            <a href={hotel.website} target="_blank" rel="nofollow noopener noreferrer"
              className="flex items-center justify-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
              Official website <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </aside>
      </div>

      {related.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">
          <h2 className="text-2xl font-heading font-bold text-slate-900 mb-6">More stays in {area}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {related.map((h: any) => <HotelCard key={h.id} hotel={h} />)}
          </div>
        </div>
      )}
    </>
  );
}
