import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Star, MapPin, Clock, Users, MessageCircle, Phone } from 'lucide-react';
import { Breadcrumb, FAQSection, HotelCard } from '@/components/ui/Cards';
import BookingForm from '@/components/forms/BookingForm';
import InquiryForm from '@/components/forms/InquiryForm';
import JsonLd from '@/components/seo/JsonLd';
import { getPropertyBySlug, getPropertiesByDestination, getAllPublishedSlugs } from '@/lib/db';
import { generateSEO, hotelSchema, breadcrumbSchema, faqSchema } from '@/lib/seo';
import { formatPrice, getWhatsAppLink } from '@/lib/utils';
import { siteConfig } from '@/lib/config';

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
  return generateSEO({
    title: h.meta_title || h.name,
    description: h.meta_description || h.short_description,
    path: `/hotels/${h.slug}`,
  });
}

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80';

export default async function HotelDetailPage({ params }: Props) {
  const hotel = await getPropertyBySlug(params.slug);
  if (!hotel) notFound();

  const related = (await getPropertiesByDestination(hotel.destination_slug))
    .filter(h => h.slug !== hotel.slug)
    .slice(0, 3);

  const dest = hotel.destination_slug?.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
  const images = (hotel.images || []).filter((img: any) => img.url);
  const primaryImg = images[0]?.url || FALLBACK_IMG;

  return (
    <>
      <JsonLd data={[
        hotelSchema(hotel),
        breadcrumbSchema([
          { name: 'Home', href: '/' },
          { name: 'Hotels', href: '/hotels' },
          { name: hotel.name, href: `/hotels/${hotel.slug}` },
        ]),
        ...(hotel.faqs?.length ? [faqSchema(hotel.faqs)] : []),
      ]} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <Breadcrumb items={[
          { label: 'Home', href: '/' },
          { label: 'Hotels', href: '/hotels' },
          { label: dest, href: `/destinations/${hotel.destination_slug}` },
          { label: hotel.name },
        ]} />
      </div>

      {/* Gallery */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 rounded-xl overflow-hidden h-[300px] md:h-[400px]">
          
          <div className="md:col-span-2 relative bg-slate-200">
            <Image
              src={primaryImg}
              alt={hotel.name}
              fill
              className="object-cover"
              priority
              sizes="(max-width:768px) 100vw, 66vw"
            />
          </div>

          <div className="hidden md:grid grid-rows-2 gap-2">
            {images.slice(1, 3).map((img: any, i: number) => (
              <div key={i} className="relative bg-slate-200">
                <Image
                  src={img.url || FALLBACK_IMG}
                  alt={img.alt || hotel.name}
                  fill
                  className="object-cover"
                  sizes="33vw"
                />
              </div>
            ))}

            {images.length < 3 && (
              <div className="bg-slate-100 flex items-center justify-center text-slate-400 text-sm rounded">
                More photos coming
              </div>
            )}
          </div>

        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          <div className="lg:col-span-2 space-y-8">

            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium px-2 py-0.5 bg-blue-50 text-brand-700 rounded-full capitalize">
                  {hotel.type}
                </span>

                {hotel.featured && (
                  <span className="text-xs font-medium px-2 py-0.5 bg-orange-50 text-orange-700 rounded-full">
                    Featured
                  </span>
                )}

                {hotel.star_rating && (
                  <span className="text-xs text-amber-600">
                    {'★'.repeat(hotel.star_rating)}
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-heading font-bold text-slate-900 mb-2">
                {hotel.name}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">

                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4 text-brand-500" />
                  {hotel.address_line1}, {hotel.city}
                </span>

                {hotel.rating > 0 && (
                  <span className="flex items-center gap-0.5 bg-green-600 text-white text-xs font-bold px-1.5 py-0.5 rounded">
                    <Star className="h-3 w-3 fill-white" />
                    {hotel.rating}
                  </span>
                )}

                {hotel.review_count > 0 && (
                  <span className="text-xs text-slate-500">
                    {hotel.review_count} reviews
                  </span>
                )}

              </div>

              <p className="mt-3">
                <span className="text-2xl font-bold text-slate-900">
                  {formatPrice(hotel.price_min)}
                </span>
                <span className="text-slate-500 ml-1">
                  – {formatPrice(hotel.price_max)} / night
                </span>
              </p>
            </div>

            <div>
              <h2 className="text-xl font-heading font-semibold mb-3">About</h2>
              <div className="text-slate-600 leading-relaxed whitespace-pre-line">
                {hotel.description}
              </div>
            </div>

            {hotel.amenities?.length > 0 && (
              <div>
                <h2 className="text-xl font-heading font-semibold mb-3">Amenities</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {hotel.amenities.map((a: string) => (
                    <div key={a} className="flex items-center gap-2 text-sm text-slate-700 bg-slate-50 px-3 py-2 rounded-lg">
                      <span className="w-2 h-2 rounded-full bg-brand-500" />
                      {a}
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          <div>
            <div className="sticky top-20 space-y-4">

              <BookingForm
                category="hotel"
                entityId={hotel.id}
                entityName={hotel.name}
                defaultAmount={hotel.price_min}
              />

              <div className="text-center text-xs text-slate-400">
                or send an inquiry
              </div>

              <InquiryForm
                type="hotel"
                propertyId={hotel.id}
                title="Quick Inquiry"
                subtitle="Not ready to book? Ask a question."
              />

              <a
                href={getWhatsAppLink(`Hi! Interested in ${hotel.name}.`)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-green-500 text-white py-3 rounded-xl font-medium hover:bg-green-600 w-full"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </a>

              <a
                href={`tel:${siteConfig.phone}`}
                className="flex items-center justify-center gap-2 border border-slate-300 text-slate-700 py-3 rounded-xl font-medium hover:bg-slate-50 w-full"
              >
                <Phone className="h-4 w-4" />
                Call {siteConfig.phone}
              </a>

            </div>
          </div>

        </div>

        {related.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-heading font-bold mb-6">
              More in {dest}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {related.map((h: any) => (
                <HotelCard key={h.id} hotel={h} />
              ))}
            </div>
          </div>
        )}

      </div>
    </>
  );
}