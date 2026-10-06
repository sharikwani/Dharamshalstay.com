import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Star, MapPin, Clock, Tag, Shield, Phone, CheckCircle } from 'lucide-react';
import { Breadcrumb, FAQSection, HotelCard } from '@/components/ui/Cards';
import PhotoGallery from '@/components/ui/PhotoGallery';
import HotelBooking from '@/components/hotels/HotelBooking';
import DirectoryListing from '@/components/hotels/DirectoryListing';
import JsonLd from '@/components/seo/JsonLd';
import { isDirectoryListing, areaName } from '@/lib/listing';
import { getPropertyBySlug, getPropertiesByDestination } from '@/lib/db';
import { generateHotelSEO, generateSEO, hotelSchemaFull, breadcrumbSchema, faqSchema } from '@/lib/seo';
import { formatPrice } from '@/lib/utils';
import { normalizeImages } from '@/lib/images';
import { serverT } from '@/lib/i18n/server';
import { fmt } from '@/lib/i18n/dict';
import { localizeHotel } from '@/lib/i18n/content';
import type { Lang } from '@/lib/i18n/core';

export async function hotelMetadata(slug: string, lang: Lang): Promise<Metadata> {
  const raw = await getPropertyBySlug(slug);
  if (!raw) return {};
  const h = localizeHotel(raw, lang);
  if (lang === 'hi') return generateHotelSEO(h, 'hi');
  if (isDirectoryListing(h)) {
    const typeLabel = h.type.charAt(0).toUpperCase() + h.type.slice(1);
    return generateSEO({
      title: h.meta_title || (h.name + ', ' + areaName(h.destination_slug) + ' - ' + typeLabel + ' Guide & Enquiries'),
      description: h.meta_description || ((h.short_description || '') + ' Location, photos, nearby sights and who it suits. Enquire for rates.').trim().slice(0, 158),
      path: '/hotels/' + h.slug,
      image: (h.images?.[0] as any)?.url,
      keywords: [h.name, h.name + ' ' + areaName(h.destination_slug), typeLabel.toLowerCase() + ' in ' + areaName(h.destination_slug), 'where to stay in ' + areaName(h.destination_slug)],
    });
  }
  return generateHotelSEO(h);
}

export default async function HotelDetailView({ slug, lang }: { slug: string; lang: Lang }) {
  const raw = await getPropertyBySlug(slug);
  if (!raw) notFound();
  const hotel = localizeHotel(raw, lang);
  const { t } = serverT(lang);

  const related = (await getPropertiesByDestination(hotel.destination_slug))
    .filter(h => h.slug !== hotel.slug).slice(0, 3)
    .map((h) => localizeHotel(h, lang));

  const crumbs = [
    { name: t.common.home, href: '/' },
    { name: t.common.hotels, href: '/hotels' },
    { name: hotel.name, href: '/hotels/' + hotel.slug },
  ];

  if (isDirectoryListing(hotel)) {
    return (
      <>
        <JsonLd data={[
          hotelSchemaFull({ ...hotel, rating: 0, review_count: 0 }),
          breadcrumbSchema(crumbs, lang),
          ...(hotel.faqs?.length ? [faqSchema(hotel.faqs)] : []),
        ]} />
        <DirectoryListing hotel={hotel} related={related} lang={lang} />
      </>
    );
  }

  const area = t.places[hotel.destination_slug] || areaName(hotel.destination_slug);
  const images = normalizeImages(hotel.images);
  const allImages = [...images];
  (hotel.rooms || []).forEach((room: any) => {
    if (room.images && Array.isArray(room.images)) {
      room.images.forEach((img: any) => {
        const url = typeof img === 'string' ? img : img?.url;
        if (url && !allImages.find(i => i.url === url)) {
          allImages.push({ url, alt: room.name || 'Room', category: 'room', is_primary: false, sort_order: allImages.length });
        }
      });
    }
  });
  const p = t.hotel;

  return (
    <>
      <JsonLd data={[
        hotelSchemaFull(hotel),
        breadcrumbSchema(crumbs, lang),
        ...(hotel.faqs?.length ? [faqSchema(hotel.faqs)] : []),
      ]} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
        <Breadcrumb lang={lang} items={[
          { label: t.common.home, href: '/' },
          { label: t.common.hotels, href: '/hotels' },
          { label: area, href: '/destinations/' + hotel.destination_slug },
          { label: hotel.name },
        ]} />
      </div>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 mb-8">
        <PhotoGallery images={allImages} hotelName={hotel.name} />
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">
        <div className="mb-8">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="text-xs font-semibold px-2.5 py-1 bg-brand-50 text-brand-700 rounded-full">{t.common.propertyTypes[hotel.type] || hotel.type}</span>
            {hotel.star_rating && (
              <span className="text-xs font-semibold px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full">{fmt(p.stars, { n: hotel.star_rating })}</span>
            )}
            <span className="text-xs font-semibold px-2.5 py-1 bg-green-50 text-green-700 rounded-full flex items-center gap-1">
              <Tag className="h-3 w-3" /> {t.common.discountNote}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-bold text-slate-900 mb-3">{hotel.name}</h1>

          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600 mb-4">
            {hotel.address_line1 && (
              <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-brand-500" />{hotel.address_line1}{hotel.city ? ', ' + hotel.city : ''}</span>
            )}
            {hotel.rating > 0 && (
              <span className="flex items-center gap-1 bg-green-700 text-white text-sm font-bold px-2 py-1 rounded-lg">
                <Star className="h-3.5 w-3.5 fill-white" />{hotel.rating}
                {hotel.review_count > 0 && <span className="font-normal text-xs ml-1 text-green-100">({hotel.review_count})</span>}
              </span>
            )}
          </div>

          {hotel.price_min > 0 && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl px-5 py-4 flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-green-700">{formatPrice(hotel.price_min)}</span>
                  <span className="text-slate-500 text-sm">{t.common.nightOnwards}</span>
                </div>
                <p className="text-xs text-green-600 mt-0.5 font-medium">{t.common.discountNote}</p>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3 mb-10">
          {[
            { icon: Tag, text: p.trustDiscount },
            { icon: Shield, text: p.trustVerified },
            { icon: Phone, text: p.trustSupport },
          ].map(item => (
            <div key={item.text} className="flex items-center gap-2 bg-brand-50 rounded-xl px-3 py-2.5">
              <item.icon className="h-4 w-4 text-brand-600 shrink-0" />
              <span className="text-xs font-medium text-brand-800">{item.text}</span>
            </div>
          ))}
        </div>

        {hotel.description && (
          <div className="mb-10">
            <h2 className="text-xl font-heading font-bold text-slate-900 mb-3">{fmt(p.about, { name: hotel.name })}</h2>
            <div className="text-slate-600 leading-relaxed whitespace-pre-line text-[15px]">{hotel.description}</div>
          </div>
        )}

        {hotel.amenities?.length > 0 && (
          <div className="mb-10">
            <h2 className="text-xl font-heading font-bold text-slate-900 mb-4">{p.amenities}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {hotel.amenities.map((a: string) => (
                <div key={a} className="flex items-center gap-2.5 text-sm text-slate-700 bg-slate-50 px-4 py-2.5 rounded-xl">
                  <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />{t.amenities[a] || a}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mb-10">
          <HotelBooking hotel={hotel} />
        </div>

        {(hotel.check_in_time || hotel.cancellation_policy) && (
          <div className="bg-slate-50 rounded-2xl p-6 mb-10">
            <h2 className="text-xl font-heading font-bold text-slate-900 mb-4">{p.policies}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {hotel.check_in_time && (
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-brand-500 mt-0.5 shrink-0" />
                  <div><p className="font-medium text-slate-800 text-sm">{p.checkInOut}</p><p className="text-sm text-slate-600">{hotel.check_in_time} / {hotel.check_out_time || '11:00'}</p></div>
                </div>
              )}
              {hotel.cancellation_policy && (
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-brand-500 mt-0.5 shrink-0" />
                  <div><p className="font-medium text-slate-800 text-sm">{p.cancellation}</p><p className="text-sm text-slate-600">{hotel.cancellation_policy}</p></div>
                </div>
              )}
            </div>
          </div>
        )}

        {hotel.faqs?.length > 0 && (
          <div className="mb-10">
            <h2 className="text-xl font-heading font-bold text-slate-900 mb-4">{t.common.faqs}</h2>
            <FAQSection faqs={hotel.faqs} />
          </div>
        )}

        {related.length > 0 && (
          <div className="mt-16 pt-10 border-t border-slate-200">
            <h2 className="text-2xl font-heading font-bold text-slate-900 mb-6">{fmt(p.similar, { place: area })}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {related.map((h: any) => <HotelCard key={h.id} hotel={h} lang={lang} />)}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
