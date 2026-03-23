import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Star, MapPin, Clock, MessageCircle, Phone, Shield, Tag, Utensils, Wifi, Car, Coffee, CheckCircle } from 'lucide-react';
import { Breadcrumb, FAQSection, HotelCard } from '@/components/ui/Cards';
import PhotoGallery, { RoomGallery } from '@/components/ui/PhotoGallery';
import BookingForm from '@/components/forms/BookingForm';
import InquiryForm from '@/components/forms/InquiryForm';
import JsonLd from '@/components/seo/JsonLd';
import { getPropertyBySlug, getPropertiesByDestination, getAllPublishedSlugs } from '@/lib/db';
import { generateHotelSEO, hotelSchemaFull, breadcrumbSchema, faqSchema } from '@/lib/seo';
import { formatPrice, getWhatsAppLink } from '@/lib/utils';
import { siteConfig } from '@/lib/config';
import { normalizeImages, getRoomImageUrl, countRoomImages, FALLBACK_IMG } from '@/lib/images';

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

// Price discount: Rs.500 less than OTA price
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

  // Collect room images into gallery too
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

  const mealLabels: Record<string, string> = { ep: 'Room Only', cp: 'Breakfast Included', map: 'Breakfast + Dinner', ap: 'All Meals' };

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

      {/* Photo Gallery with Lightbox */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 mb-8">
        <PhotoGallery images={allImages} hotelName={hotel.name} />
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-10">

            {/* Hotel Header */}
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="text-xs font-semibold px-2.5 py-1 bg-brand-50 text-brand-700 rounded-full capitalize">{hotel.type}</span>
                {hotel.star_rating && (
                  <span className="text-xs font-semibold px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full">
                    {'*'.repeat(hotel.star_rating)} {hotel.star_rating}-Star
                  </span>
                )}
                {hotel.featured && <span className="text-xs font-semibold px-2.5 py-1 bg-orange-50 text-orange-700 rounded-full">Featured</span>}
                <span className="text-xs font-semibold px-2.5 py-1 bg-green-50 text-green-700 rounded-full flex items-center gap-1">
                  <Tag className="h-3 w-3" /> Rs.{PRICE_DISCOUNT} less than MakeMyTrip
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-bold text-slate-900 mb-3">{hotel.name}</h1>

              <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600 mb-4">
                {hotel.address_line1 && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-brand-500" />{hotel.address_line1}{hotel.city ? ', ' + hotel.city : ''}
                  </span>
                )}
                {hotel.rating > 0 && (
                  <span className="flex items-center gap-1 bg-green-600 text-white text-sm font-bold px-2 py-1 rounded-lg">
                    <Star className="h-3.5 w-3.5 fill-white" />{hotel.rating}
                    {hotel.review_count > 0 && <span className="font-normal text-xs ml-1 text-green-100">({hotel.review_count})</span>}
                  </span>
                )}
              </div>

              {/* Price highlight bar */}
              {hotel.price_min > 0 && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl px-5 py-4 flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-slate-400 line-through text-sm">{formatPrice(hotel.price_min)}</span>
                      <span className="text-3xl font-bold text-green-700">{formatPrice(discountedPrice(hotel.price_min))}</span>
                      <span className="text-slate-500 text-sm">/ night</span>
                    </div>
                    <p className="text-xs text-green-600 mt-0.5 font-medium">You save Rs.{PRICE_DISCOUNT} per night vs MakeMyTrip</p>
                  </div>
                  <a href={getWhatsAppLink('Hi! I want to book ' + hotel.name + ' at Rs.' + discountedPrice(hotel.price_min) + '/night.')}
                    target="_blank" rel="noopener noreferrer"
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-semibold text-sm transition-colors flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" /> Book at Best Price
                  </a>
                </div>
              )}
            </div>

            {/* Why Book With Us */}
            <div className="grid grid-cols-3 gap-3">
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
              <div>
                <h2 className="text-xl font-heading font-bold text-slate-900 mb-3">About {hotel.name}</h2>
                <div className="text-slate-600 leading-relaxed whitespace-pre-line text-[15px]">{hotel.description}</div>
              </div>
            )}

            {/* Amenities */}
            {hotel.amenities?.length > 0 && (
              <div>
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

            {/* Rooms with Rate Plans */}
            {hotel.rooms?.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-xl font-heading font-bold text-slate-900">Choose Your Room</h2>
                  <span className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-full font-semibold">All prices Rs.{PRICE_DISCOUNT} less than MakeMyTrip</span>
                </div>

                <div className="space-y-6">
                  {hotel.rooms.map((room: any, i: number) => {
                    const roomImg = getRoomImageUrl(room.images, hotel.images);
                    const hasRatePlans = room.rate_plans && Array.isArray(room.rate_plans) && room.rate_plans.length > 0;
                    const roomImages = (room.images || []).map((img: any) => typeof img === 'string' ? { url: img, alt: room.name } : { url: img?.url || '', alt: img?.alt || room.name }).filter((i: any) => i.url);

                    return (
                      <div key={i} className="border border-slate-200 rounded-2xl overflow-hidden hover:shadow-lg transition-shadow bg-white">
                        <div className="flex flex-col md:flex-row">
                          {/* Left: Room image + mini gallery */}
                          <div className="w-full md:w-72 lg:w-80 shrink-0">
                            <div className="relative aspect-[4/3] md:aspect-auto md:h-full bg-slate-100">
                              <Image src={roomImg} alt={room.name || 'Room'} fill className="object-cover" sizes="(max-width:768px) 100vw, 320px" />
                            </div>
                          </div>

                          {/* Right: Details */}
                          <div className="flex-1 p-5 md:p-6">
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <h3 className="font-heading font-bold text-xl text-slate-900">{room.name || 'Room'}</h3>
                              {room.is_active === false && (
                                <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full shrink-0">Sold Out</span>
                              )}
                            </div>

                            {room.description && (
                              <p className="text-sm text-slate-600 mb-3">{room.description}</p>
                            )}

                            {/* Room specs */}
                            <div className="flex flex-wrap gap-3 text-xs text-slate-500 mb-3">
                              {room.room_size && <span className="bg-slate-50 px-2.5 py-1 rounded-lg">{room.room_size}</span>}
                              {room.bed_type && <span className="bg-slate-50 px-2.5 py-1 rounded-lg">{room.bed_type} Bed</span>}
                              {room.max_occupancy && <span className="bg-slate-50 px-2.5 py-1 rounded-lg">Max {room.max_occupancy} guests</span>}
                            </div>

                            {/* Room amenities */}
                            {(room.amenities || []).length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mb-4">
                                {room.amenities.slice(0, 8).map((a: string) => (
                                  <span key={a} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{a}</span>
                                ))}
                              </div>
                            )}

                            {/* Room photos thumbnail row */}
                            {roomImages.length > 1 && (
                              <div className="mb-4">
                                <RoomGallery images={roomImages} roomName={room.name || 'Room'} />
                              </div>
                            )}

                            {/* Rate Plans */}
                            {hasRatePlans ? (
                              <div className="space-y-2 pt-4 border-t border-slate-100">
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Pricing Options</p>
                                {room.rate_plans.map((plan: any, pi: number) => {
                                  const mealTag = mealLabels[plan.meal_plan] || 'Room Only';
                                  const ourPrice = discountedPrice(plan.price);
                                  const isFree = plan.cancellation && plan.cancellation.toLowerCase().includes('free');
                                  return (
                                    <div key={pi} className="flex items-center justify-between gap-4 py-3 px-4 rounded-xl bg-slate-50 hover:bg-green-50/50 transition-colors">
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-slate-800">{plan.name || mealTag}</p>
                                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                          <span className={'text-[11px] font-medium px-2 py-0.5 rounded-full ' + (plan.meal_plan === 'ep' ? 'bg-slate-200 text-slate-600' : 'bg-green-100 text-green-700')}>
                                            {mealTag}
                                          </span>
                                          {isFree && (
                                            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">Free Cancellation</span>
                                          )}
                                        </div>
                                      </div>
                                      <div className="text-right shrink-0">
                                        <div className="flex items-baseline gap-1.5">
                                          {plan.price > PRICE_DISCOUNT && (
                                            <span className="text-xs text-slate-400 line-through">{formatPrice(plan.price)}</span>
                                          )}
                                          <span className="text-xl font-bold text-slate-900">{formatPrice(ourPrice)}</span>
                                        </div>
                                        <p className="text-[10px] text-slate-500">per night + taxes</p>
                                      </div>
                                      <a href={getWhatsAppLink('Hi! Book ' + (room.name || 'room') + ' (' + mealTag + ') at ' + hotel.name + ' for Rs.' + ourPrice + '/night')}
                                        target="_blank" rel="noopener noreferrer"
                                        className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors whitespace-nowrap shrink-0">
                                        Book
                                      </a>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : room.base_price > 0 ? (
                              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                <div>
                                  <div className="flex items-baseline gap-1.5">
                                    <span className="text-xs text-slate-400 line-through">{formatPrice(room.base_price)}</span>
                                    <span className="text-2xl font-bold text-slate-900">{formatPrice(discountedPrice(room.base_price))}</span>
                                  </div>
                                  <p className="text-xs text-green-600 font-medium">Save Rs.{PRICE_DISCOUNT} vs MakeMyTrip</p>
                                </div>
                                <a href={getWhatsAppLink('Hi! Book ' + (room.name || 'room') + ' at ' + hotel.name + ' for Rs.' + discountedPrice(room.base_price))}
                                  target="_blank" rel="noopener noreferrer"
                                  className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold px-6 py-3 rounded-xl transition-colors">
                                  Book Now
                                </a>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Policies */}
            {(hotel.check_in_time || hotel.cancellation_policy) && (
              <div className="bg-slate-50 rounded-2xl p-6">
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
                  {hotel.pet_policy && hotel.pet_policy !== 'No pets allowed' && (
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-brand-500 mt-0.5 shrink-0" />
                      <div><p className="font-medium text-slate-800 text-sm">Pets</p><p className="text-sm text-slate-600">{hotel.pet_policy}</p></div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* FAQs */}
            {hotel.faqs?.length > 0 && (
              <div>
                <h2 className="text-xl font-heading font-bold text-slate-900 mb-4">Frequently Asked Questions</h2>
                <FAQSection faqs={hotel.faqs} />
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div>
            <div className="sticky top-20 space-y-4">
              <BookingForm category="hotel" entityId={hotel.id} entityName={hotel.name} defaultAmount={hotel.price_min ? discountedPrice(hotel.price_min) : undefined} />
              <div className="text-center text-xs text-slate-400">or send an inquiry</div>
              <InquiryForm type="hotel" propertyId={hotel.id} title="Quick Inquiry" subtitle="Not ready to book? Ask a question." />
              <a href={getWhatsAppLink('Hi! Interested in ' + hotel.name + '.')} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-green-500 text-white py-3 rounded-xl font-medium hover:bg-green-600 w-full">
                <MessageCircle className="h-4 w-4" /> WhatsApp Us
              </a>
              <a href={'tel:' + siteConfig.phone}
                className="flex items-center justify-center gap-2 border border-slate-300 text-slate-700 py-3 rounded-xl font-medium hover:bg-slate-50 w-full">
                <Phone className="h-4 w-4" /> Call {siteConfig.phone}
              </a>
            </div>
          </div>
        </div>

        {/* Related Hotels */}
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
