import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Users, Sparkles, Navigation, CheckCircle, MessageCircle, Building, ExternalLink, Info, Clock, BedDouble, Shield } from 'lucide-react';
import { Breadcrumb, HotelCard, FAQSection } from '@/components/ui/Cards';
import PhotoGallery from '@/components/ui/PhotoGallery';
import InquiryForm from '@/components/forms/InquiryForm';
import { directoryView, type DirectoryProperty } from '@/lib/listing';
import type { Property } from '@/types';
import { getWhatsAppLink } from '@/lib/utils';
import { serverT } from '@/lib/i18n/server';
import { fmt } from '@/lib/i18n/dict';
import type { Lang } from '@/lib/i18n/core';


/**
 * Page for a real property we list but don't (yet) partner with. Shows the
 * property's own photos (credited) like a partner page, but no prices or
 * ratings, and says plainly that rates are confirmed on enquiry.
 */
export default function DirectoryListing({ hotel, related, lang = 'en' }: { hotel: DirectoryProperty; related: Property[]; lang?: Lang }) {
  const v = directoryView(hotel);
  const { t } = serverT(lang);
  const d = t.directory;
  const area = t.places[hotel.destination_slug] || v.area;

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
        <Breadcrumb lang={lang} items={[
          { label: t.common.home, href: '/' },
          { label: t.common.hotels, href: '/hotels' },
          { label: area, href: '/destinations/' + hotel.destination_slug },
          { label: hotel.name },
        ]} />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-16 grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="text-xs font-semibold px-2.5 py-1 bg-brand-50 text-brand-700 rounded-full ">{t.common.propertyTypes[hotel.type] || hotel.type}</span>
            {hotel.price_band && <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full">{t.common.priceBand[hotel.price_band] || hotel.price_band}</span>}
            <span className="text-xs font-semibold px-2.5 py-1 bg-amber-50 text-amber-800 rounded-full">{d.badge}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-bold text-slate-900 mb-2">{hotel.name}</h1>
          <p className="flex items-center gap-1.5 text-slate-600 mb-6"><MapPin className="h-4 w-4 text-brand-500" />{v.locality}</p>

          {v.hasOwnPhotos ? (
            <figure className="mb-8">
              <PhotoGallery images={v.images} hotelName={hotel.name} />
              <figcaption className="text-xs text-slate-500 mt-2">
                {d.photos}: {hotel.name}{hotel.photo_source && (<> (<a href={hotel.photo_source} target="_blank" rel="nofollow noopener noreferrer" className="underline">{d.source}</a>)</>)}.
              </figcaption>
            </figure>
          ) : (
            <figure className="mb-8">
              <div className="relative aspect-[16/9] rounded-2xl overflow-hidden bg-slate-100">
                <Image src={v.images[0].url} alt={v.images[0].alt} fill className="object-cover" priority sizes="(max-width:1024px) 100vw, 66vw" />
              </div>
              <figcaption className="text-xs text-slate-500 mt-2">
                {fmt(d.areaPhoto, { place: area })} <Link href="/photo-credits" className="underline">{t.footer.photoCredits}</Link>.
              </figcaption>
            </figure>
          )}

          {hotel.description && (
            <section className="mb-8">
              <h2 className="text-xl font-heading font-bold text-slate-900 mb-3">{fmt(t.hotel.about, { name: hotel.name })}</h2>
              {hotel.description.split(/\n\s*\n/).map((para, i) => <p key={i} className="text-slate-600 leading-relaxed mb-3">{para}</p>)}
            </section>
          )}

          {(v.highlights.length > 0 || v.nearby.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
              {v.highlights.length > 0 && (
                <div className="bg-slate-50 rounded-xl p-5">
                  <h2 className="font-heading font-semibold text-slate-900 mb-3 flex items-center gap-2"><Sparkles className="h-4 w-4 text-brand-600" />{d.highlights}</h2>
                  <ul className="space-y-2 text-sm text-slate-700">
                    {v.highlights.map((h) => <li key={h} className="flex gap-2"><CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />{h}</li>)}
                  </ul>
                </div>
              )}
              {v.nearby.length > 0 && (
                <div className="bg-slate-50 rounded-xl p-5">
                  <h2 className="font-heading font-semibold text-slate-900 mb-3 flex items-center gap-2"><Navigation className="h-4 w-4 text-brand-600" />{d.nearby}</h2>
                  <ul className="space-y-2 text-sm text-slate-700">{v.nearby.map((n) => <li key={n}>{n}</li>)}</ul>
                </div>
              )}
            </div>
          )}

          {v.goodFor.length > 0 && (
            <div className="mb-8">
              <h2 className="font-heading font-semibold text-slate-900 mb-3 flex items-center gap-2"><Users className="h-4 w-4 text-brand-600" />{d.goodFor}</h2>
              <div className="flex flex-wrap gap-2">{v.goodFor.map((g) => <span key={g} className="text-sm bg-brand-50 text-brand-800 px-3 py-1.5 rounded-full">{g}</span>)}</div>
            </div>
          )}

          {hotel.amenities?.length > 0 && (
            <div className="mb-8">
              <h2 className="font-heading font-semibold text-slate-900 mb-3">{d.facilities}</h2>
              <div className="flex flex-wrap gap-2">{hotel.amenities.map((a: string) => <span key={a} className="text-sm bg-slate-100 text-slate-700 px-3 py-1.5 rounded-full">{t.amenities[a] || a}</span>)}</div>
            </div>
          )}

          {v.roomTypes.length > 0 && (
            <section className="mb-8">
              <h2 className="text-xl font-heading font-bold text-slate-900 mb-3">{d.roomTypes}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {v.roomTypes.map((r: any) => (
                  <div key={r.name} className="border border-slate-200 rounded-xl p-4">
                    <p className="font-semibold text-slate-900 flex items-center gap-2"><BedDouble className="h-4 w-4 text-brand-600" />{r.name}</p>
                    {r.description && <p className="text-sm text-slate-600 mt-1">{r.description}</p>}
                    <p className="text-xs text-slate-500 mt-2">
                      {[r.bed_type && fmt(d.bed, { type: r.bed_type }), r.max_occupancy && fmt(d.upTo, { n: r.max_occupancy }), d.ratesOnRequest].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {(hotel.check_in_time || hotel.pet_policy || hotel.smoking_policy || hotel.cancellation_policy) && (
            <section className="bg-slate-50 rounded-2xl p-6 mb-8">
              <h2 className="text-xl font-heading font-bold text-slate-900 mb-4">{t.hotel.policies}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                {hotel.check_in_time && <Policy icon={Clock} label={t.hotel.checkInOut} value={hotel.check_in_time + (hotel.check_out_time ? ' / ' + hotel.check_out_time : '')} />}
                {hotel.cancellation_policy && <Policy icon={Shield} label={t.hotel.cancellation} value={hotel.cancellation_policy} />}
                {hotel.pet_policy && <Policy icon={Shield} label={d.pets} value={hotel.pet_policy} />}
                {hotel.smoking_policy && <Policy icon={Shield} label={d.smoking} value={hotel.smoking_policy} />}
              </div>
            </section>
          )}

          {hotel.faqs?.length > 0 && (
            <section className="mb-8">
              <h2 className="text-xl font-heading font-bold text-slate-900 mb-3">{t.common.faqs}</h2>
              <FAQSection faqs={hotel.faqs} />
            </section>
          )}

          <div className="flex gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900 mb-8">
            <Info className="h-5 w-5 shrink-0 mt-0.5" />
            <p>
              {fmt(d.notice, { name: hotel.name })}{' '}
              <Link href={(lang === 'hi' ? '/hi' : '') + '/destinations/' + hotel.destination_slug} className="underline font-medium">{fmt(d.similarStay, { place: area })}</Link>
            </p>
          </div>

          <div className="border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Building className="h-5 w-5 text-brand-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-900">{fmt(d.ownTitle, { name: hotel.name })}</p>
                <p className="text-sm text-slate-600">{d.ownText}</p>
              </div>
            </div>
            <a href={getWhatsAppLink('Hi! I manage ' + hotel.name + ' and want to claim our listing on Dharamshala Stay.')}
              target="_blank" rel="noopener noreferrer"
              className="shrink-0 text-center bg-brand-600 text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-brand-700 text-sm">
              {d.claim}
            </a>
          </div>
        </div>

        <aside className="lg:sticky lg:top-24 self-start space-y-4">
          <InquiryForm type="hotel" propertyId={hotel.id} contextNote={'Directory hotel: ' + hotel.name}
            title={d.checkRates} subtitle={fmt(d.checkRatesSub, { name: hotel.name })} />
          <a href={getWhatsAppLink('Hi! Please check availability at ' + hotel.name + ' (' + v.locality + ').')}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-green-700 text-white py-3 rounded-xl font-semibold hover:bg-green-800">
            <MessageCircle className="h-4 w-4" /> {t.common.askWhatsApp}
          </a>
          {hotel.website && (
            <a href={hotel.website} target="_blank" rel="nofollow noopener noreferrer"
              className="flex items-center justify-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
              {d.officialSite} <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </aside>
      </div>

      {related.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">
          <h2 className="text-2xl font-heading font-bold text-slate-900 mb-6">{fmt(d.moreStays, { place: area })}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {related.map((h: any) => <HotelCard key={h.id} hotel={h} lang={lang} />)}
          </div>
        </div>
      )}
    </>
  );
}

function Policy({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3"><Icon className="h-5 w-5 text-brand-500 shrink-0" />
      <div><p className="font-medium text-slate-800">{label}</p><p className="text-slate-600">{value}</p></div></div>
  );
}
