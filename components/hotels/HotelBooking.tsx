'use client';
import { useState, useRef } from 'react';
import { MessageCircle, Phone, Shield, CheckCircle, Check, BedDouble, Users, Maximize, UtensilsCrossed } from 'lucide-react';
import { RoomGallery } from '@/components/ui/PhotoGallery';
import BookingForm from '@/components/forms/BookingForm';
import InquiryForm from '@/components/forms/InquiryForm';
import { formatPrice, getWhatsAppLink } from '@/lib/utils';
import { getRoomImageUrl } from '@/lib/images';
import { siteConfig } from '@/lib/config';

import { useT } from '@/lib/i18n/client';
import { fmt } from '@/lib/i18n/dict';

// Rates are shown exactly as listed; the up-to-Rs.500 discount is applied
// by our team when the booking is confirmed.
const discountedPrice = (price: number) => price;


interface SelectedRoom {
  roomName: string;
  planName: string;
  pricePerNight: number;
}

interface Props {
  hotel: any;
}

export default function HotelBooking({ hotel }: Props) {
  const { t } = useT();
  const b = t.booking;
  const mealLabels: Record<string, string> = b.meals;
  const [selected, setSelected] = useState<SelectedRoom>({
    roomName: '',
    planName: '',
    pricePerNight: hotel.price_min ? discountedPrice(hotel.price_min) : 0,
  });
  const formRef = useRef<HTMLDivElement>(null);

  function selectRoom(roomName: string, planName: string, price: number) {
    const ourPrice = discountedPrice(price);
    setSelected({ roomName, planName, pricePerNight: ourPrice });
    // Scroll to booking form
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    // On mobile, scroll to top of form
    if (window.innerWidth < 1024 && formRef.current) {
      setTimeout(() => {
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left column: rooms */}
      <div className="lg:col-span-2">
        {/* Rooms */}
        {hotel.rooms?.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-heading font-bold text-slate-900">{b.chooseRoom}</h2>
              <span className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-full font-semibold">{t.common.discountNote}</span>
            </div>

            <div className="space-y-6">
              {hotel.rooms.map((room: any, i: number) => {
                const roomImg = getRoomImageUrl(room.images, hotel.images);
                const roomName = room.name || b.room;
                const roomImages = (room.images || []).map((img: any) => typeof img === 'string' ? { url: img, alt: room.name } : { url: img?.url || '', alt: img?.alt || room.name }).filter((im: any) => im.url);
                // A room without rate plans is sold as a single room-only plan at its base price.
                const plans: any[] = Array.isArray(room.rate_plans) && room.rate_plans.length > 0
                  ? room.rate_plans
                  : room.base_price > 0 ? [{ meal_plan: 'ep', price: room.base_price }] : [];
                const amenities: string[] = room.amenities || [];

                return (
                  <article key={i} className="border border-slate-200 rounded-2xl overflow-hidden bg-white hover:shadow-lg transition-shadow">
                    <div className="grid grid-cols-1 md:grid-cols-[260px_minmax(0,1fr)]">
                      {/* Room info */}
                      <div className="p-4 md:p-5 md:border-r border-slate-100">
                        <RoomGallery images={roomImages} roomName={roomName} fallbackUrl={roomImg} />

                        <h3 className="font-heading font-bold text-lg text-slate-900 mt-4">{roomName}</h3>

                        {(room.room_size || room.bed_type || room.max_occupancy) && (
                          <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
                            {room.room_size && <li className="flex items-center gap-2"><Maximize className="h-4 w-4 text-slate-400 shrink-0" />{room.room_size}</li>}
                            {room.bed_type && <li className="flex items-center gap-2"><BedDouble className="h-4 w-4 text-slate-400 shrink-0" />{fmt(b.bed, { type: room.bed_type })}</li>}
                            {room.max_occupancy && <li className="flex items-center gap-2"><Users className="h-4 w-4 text-slate-400 shrink-0" />{fmt(b.maxGuests, { n: room.max_occupancy })}</li>}
                          </ul>
                        )}

                        {room.description && <p className="text-sm text-slate-600 leading-relaxed mt-3">{room.description}</p>}

                        {amenities.length > 0 && (
                          <ul className="mt-3 grid grid-cols-2 md:grid-cols-1 gap-x-3 gap-y-1.5">
                            {amenities.slice(0, 8).map((a: string) => (
                              <li key={a} className="flex items-start gap-1.5 text-xs text-slate-600">
                                <Check className="h-3.5 w-3.5 text-green-600 shrink-0 mt-px" /><span className="min-w-0">{a}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      {/* Rate plans */}
                      {plans.length > 0 && (
                        <div className="p-4 md:p-5 bg-slate-50/60 border-t md:border-t-0 border-slate-100">
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">{b.pricingOptions}</p>
                          <div className="space-y-3">
                            {plans.map((plan: any, pi: number) => {
                              const mealTag = mealLabels[plan.meal_plan] || mealLabels.ep;
                              const planName = plan.name || mealTag;
                              const ourPrice = discountedPrice(plan.price);
                              const isFree = plan.cancellation && plan.cancellation.toLowerCase().includes('free');
                              const isSelected = selected.roomName === room.name && selected.planName === planName && selected.pricePerNight === ourPrice;

                              return (
                                <div key={pi} className={'rounded-xl border bg-white p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 transition-all ' + (isSelected ? 'border-green-500 ring-1 ring-green-500 shadow-sm' : 'border-slate-200 hover:border-slate-300')}>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-slate-900 leading-snug">{planName}</p>
                                    <ul className="mt-1.5 space-y-1 text-xs">
                                      {mealTag !== planName && (
                                        <li className={'flex items-center gap-1.5 ' + (plan.meal_plan && plan.meal_plan !== 'ep' ? 'text-green-700' : 'text-slate-600')}>
                                          <UtensilsCrossed className="h-3.5 w-3.5 shrink-0" />{mealTag}
                                        </li>
                                      )}
                                      {isFree ? (
                                        <li className="flex items-center gap-1.5 text-green-700"><CheckCircle className="h-3.5 w-3.5 shrink-0" />{b.freeCancellation}</li>
                                      ) : plan.cancellation ? (
                                        <li className="flex items-center gap-1.5 text-slate-500"><Shield className="h-3.5 w-3.5 shrink-0" />{plan.cancellation}</li>
                                      ) : null}
                                    </ul>
                                  </div>

                                  <div className="flex items-center justify-between sm:justify-end gap-4 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                                    <div className="sm:text-right">
                                      <p className="text-xl font-bold text-slate-900 leading-none">{formatPrice(ourPrice)}</p>
                                      <p className="text-[11px] text-slate-500 mt-1">{b.perNightTaxes}</p>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => selectRoom(room.name, planName, plan.price)}
                                      className={'text-sm font-bold px-5 py-2.5 rounded-xl transition-colors whitespace-nowrap shrink-0 ' + (isSelected ? 'bg-green-700 text-white' : 'bg-orange-600 hover:bg-orange-700 text-white')}>
                                      {isSelected ? b.selected : b.book}
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Right column: sticky booking form */}
      <div>
        <div ref={formRef} className="sticky top-20 space-y-4">
          {/* Selected room indicator */}
          {selected.roomName && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
              <p className="text-xs text-green-600 font-medium">{b.selectedRoom}</p>
              <p className="font-semibold text-slate-900 text-sm">{selected.roomName}</p>
              {selected.planName && <p className="text-xs text-slate-600">{selected.planName}</p>}
              <p className="text-lg font-bold text-green-700 mt-1">{formatPrice(selected.pricePerNight)} <span className="text-xs font-normal text-slate-500">{t.common.perNight}</span></p>
            </div>
          )}

          {!selected.roomName && hotel.rooms?.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-center">
              <p className="text-sm text-amber-700 font-medium">{b.selectPrompt}</p>
              <p className="text-xs text-amber-600 mt-0.5">{b.selectHint}</p>
            </div>
          )}

          <BookingForm
            category="hotel"
            entityId={hotel.id}
            entityName={hotel.name}
            pricePerNight={selected.pricePerNight || (hotel.price_min ? discountedPrice(hotel.price_min) : undefined)}
            roomName={selected.roomName ? selected.roomName + (selected.planName ? ' - ' + selected.planName : '') : ''}
          />

          <div className="text-center text-xs text-slate-400">{b.orInquiry}</div>
          <InquiryForm type="hotel" propertyId={hotel.id} title={b.quickInquiry} subtitle={b.quickInquirySub} />

          <a href={getWhatsAppLink('Hi! Interested in ' + hotel.name + (selected.roomName ? ' - ' + selected.roomName : '') + '.')} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-green-700 text-white py-3 rounded-xl font-medium hover:bg-green-800 w-full">
            <MessageCircle className="h-4 w-4" /> {t.home.ctaWhatsApp}
          </a>
          <a href={'tel:' + siteConfig.phone}
            className="flex items-center justify-center gap-2 border border-slate-300 text-slate-700 py-3 rounded-xl font-medium hover:bg-slate-50 w-full">
            <Phone className="h-4 w-4" /> {b.call} {siteConfig.phone}
          </a>
        </div>
      </div>
    </div>
  );
}
