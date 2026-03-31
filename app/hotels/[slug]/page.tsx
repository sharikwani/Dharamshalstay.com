import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Star, MapPin, Clock, Tag, Shield, Phone, CheckCircle } from 'lucide-react';
import { Breadcrumb, FAQSection, HotelCard } from '@/components/ui/Cards';
import PhotoGallery from '@/components/ui/PhotoGallery';
import HotelBooking from '@/components/hotels/HotelBooking';
import JsonLd from '@/components/seo/JsonLd';
import { getPropertyBySlug, getPropertiesByDestination, getAllPublishedSlugs } from '@/lib/db';
import { generateHotelSEO, hotelSchemaFull, breadcrumbSchema, faqSchema } from '@/lib/seo';
import { formatPrice, getWhatsAppLink } from '@/lib/utils';
import { siteConfig } from '@/lib/config';
import { normalizeImages, getRoomImageUrl, FALLBACK_IMG } from '@/lib/images';

export const revalidate = 60;
export const dynamicParams = true;

interface Props { params: { slug: string } }

export async function generateStaticParams() {
  const slugs = await getAllPublishedSlugs();
  return slugs.map(slug => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const h = await getPropertyBySlug(params.slug);
  if (!h) return {};
  return generateHotelSEO(h);
}

const PRICE_DISCOUNT = 500;
function discountedPrice(price: number): number {
  if (!price || price <= PRICE_DISCOUNT) return price;
  return price - PRICE_DISCOUNT;
}

export default async function HotelDetailPage({ params }: Props) {
  const hotel = await getPropertyBySlug(params.slug);
  if (!hotel) notFound();

  const related = (await getPropertiesByDestination(hotel.destination_slug))
    .filter(h => h.slug !== hotel.slug).slice(0, 3);

  const dest = hotel.destination_slug?.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) || '';
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

  return (
    <>
      <JsonLd data={[
        hotelSchemaFull(hotel),
        breadcrumbSchema([
          { name: 'Home', href: '/' },
          { name: 'Hotels', href: '/hotels' },
          { name: hotel.name, href: '/hotels/' + hotel.slug },
        ]),
        ...(hotel.faqs?.length ? [faqSchema(hotel.faqs)] : []),
      ]} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
        <Breadcrumb items={[
          { label: 'Home', href: '/' },
          { label: 'Hotels', href: '/hotels' },
          { label: dest, href: '/destinations/' + hotel.destination_slug },
          { label: hotel.name },
        ]} />
      </div>

      {/* Photo Gallery */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 mb-8">
        <PhotoGallery images={allImages} hotelName={hotel.name} />
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">
        {/* Hotel Header */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="text-xs font-semibold px-2.5 py-1 bg-brand-50 text-brand-700 rounded-full capitalize">{hotel.type}</span>
            {hotel.star_rating && (
              <span className="text-xs font-semibold px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full">
                {'*'.repeat(hotel.star_rating)} {hotel.star_rating}-Star
              </span>
            )}
            <span className="text-xs font-semibold px-2.5 py-1 bg-green-50 text-green-700 rounded-full flex items-center gap-1">
              <Tag className="h-3 w-3" /> Rs.{PRICE_DISCOUNT} less than MakeMyTrip
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-bold text-slate-900 mb-3">{hotel.name}</h1>

          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600 mb-4">
            {hotel.address_line1 && (
              <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-brand-500" />{hotel.address_line1}{hotel.city ? ', ' + hotel.city : ''}</span>
            )}
            {hotel.rating > 0 && (
              <span className="flex items-center gap-1 bg-green-600 text-white text-sm font-bold px-2 py-1 rounded-lg">
                <Star className="h-3.5 w-3.5 fill-white" />{hotel.rating}
                {hotel.review_count > 0 && <span className="font-normal text-xs ml-1 text-green-100">({hotel.review_count})</span>}
              </span>
            )}
          </div>

          {/* Price highlight */}
          {hotel.price_min > 0 && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl px-5 py-4 flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-slate-400 line-through text-sm">{formatPrice(hotel.price_min)}</span>
                  <span className="text-3xl font-bold text-green-700">{formatPrice(discountedPrice(hotel.price_min))}</span>
                  <span className="text-slate-500 text-sm">/ night onwards</span>
                </div>
                <p className="text-xs text-green-600 mt-0.5 font-medium">You save Rs.{PRICE_DISCOUNT} per night vs MakeMyTrip</p>
              </div>
            </div>
          )}
        </div>

        {/* Trust strip */}
        <div className="grid grid-cols-3 gap-3 mb-10">
          {[
            { icon: Tag, text: 'Rs.' + PRICE_DISCOUNT + ' less than OTAs' },
            { icon: Shield, text: 'Verified property' },
            { icon: Phone, text: 'Direct local support' },
          ].map(item => (
            <div key={item.text} className="flex items-center gap-2 bg-blue-50 rounded-xl px-3 py-2.5">
              <item.icon className="h-4 w-4 text-brand-600 shrink-0" />
              <span className="text-xs font-medium text-brand-800">{item.text}</span>
            </div>
          ))}
        </div>

        {/* About */}
        {hotel.description && (
          <div className="mb-10">
            <h2 className="text-xl font-heading font-bold text-slate-900 mb-3">About {hotel.name}</h2>
            <div className="text-slate-600 leading-relaxed whitespace-pre-line text-[15px]">{hotel.description}</div>
          </div>
        )}

        {/* Amenities */}
        {hotel.amenities?.length > 0 && (
          <div className="mb-10">
            <h2 className="text-xl font-heading font-bold text-slate-900 mb-4">Amenities & Facilities</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {hotel.amenities.map((a: string) => (
                <div key={a} className="flex items-center gap-2.5 text-sm text-slate-700 bg-slate-50 px-4 py-2.5 rounded-xl">
                  <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />{a}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rooms + Booking Form (Client Component) */}
        <div className="mb-10">
          <HotelBooking hotel={hotel} />
        </div>

        {/* Policies */}
        {(hotel.check_in_time || hotel.cancellation_policy) && (
          <div className="bg-slate-50 rounded-2xl p-6 mb-10">
            <h2 className="text-xl font-heading font-bold text-slate-900 mb-4">Hotel Policies</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {hotel.check_in_time && (
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-brand-500 mt-0.5 shrink-0" />
                  <div><p className="font-medium text-slate-800 text-sm">Check-in / Check-out</p><p className="text-sm text-slate-600">{hotel.check_in_time} / {hotel.check_out_time || '11:00'}</p></div>
                </div>
              )}
              {hotel.cancellation_policy && (
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-brand-500 mt-0.5 shrink-0" />
                  <div><p className="font-medium text-slate-800 text-sm">Cancellation</p><p className="text-sm text-slate-600">{hotel.cancellation_policy}</p></div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* FAQs */}
        {hotel.faqs?.length > 0 && (
          <div className="mb-10">
            <h2 className="text-xl font-heading font-bold text-slate-900 mb-4">Frequently Asked Questions</h2>
            <FAQSection faqs={hotel.faqs} />
          </div>
        )}

        {/* Related */}
        {related.length > 0 && (
          <div className="mt-16 pt-10 border-t border-slate-200">
            <h2 className="text-2xl font-heading font-bold text-slate-900 mb-6">Similar Hotels in {dest}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {related.map((h: any) => <HotelCard key={h.id} hotel={h} />)}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
