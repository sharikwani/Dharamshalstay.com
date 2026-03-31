'use client';
import { useState, useRef } from 'react';
import Image from 'next/image';
import { Tag, MessageCircle, Phone, Shield, CheckCircle } from 'lucide-react';
import { RoomGallery } from '@/components/ui/PhotoGallery';
import BookingForm from '@/components/forms/BookingForm';
import InquiryForm from '@/components/forms/InquiryForm';
import { formatPrice, getWhatsAppLink } from '@/lib/utils';
import { getRoomImageUrl } from '@/lib/images';
import { siteConfig } from '@/lib/config';

const PRICE_DISCOUNT = 500;
function discountedPrice(price: number): number {
  if (!price || price <= PRICE_DISCOUNT) return price;
  return price - PRICE_DISCOUNT;
}

const mealLabels: Record<string, string> = { ep: 'Room Only', cp: 'Breakfast Included', map: 'Breakfast + Dinner', ap: 'All Meals' };

interface SelectedRoom {
  roomName: string;
  planName: string;
  pricePerNight: number;
}

interface Props {
  hotel: any;
}

export default function HotelBooking({ hotel }: Props) {
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
              <h2 className="text-xl font-heading font-bold text-slate-900">Choose Your Room</h2>
              <span className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-full font-semibold">All prices Rs.{PRICE_DISCOUNT} less than MakeMyTrip</span>
            </div>

            <div className="space-y-6">
              {hotel.rooms.map((room: any, i: number) => {
                const roomImg = getRoomImageUrl(room.images, hotel.images);
                const hasRatePlans = room.rate_plans && Array.isArray(room.rate_plans) && room.rate_plans.length > 0;
                const roomImages = (room.images || []).map((img: any) => typeof img === 'string' ? { url: img, alt: room.name } : { url: img?.url || '', alt: img?.alt || room.name }).filter((im: any) => im.url);

                return (
                  <div key={i} className="border border-slate-200 rounded-2xl overflow-hidden hover:shadow-lg transition-shadow bg-white">
                    <div className="flex flex-col md:flex-row">
                      {/* Room image */}
                      <div className="w-full md:w-72 lg:w-80 shrink-0">
                        <div className="relative aspect-[4/3] md:aspect-auto md:h-full bg-slate-100">
                          <Image src={roomImg} alt={room.name || 'Room'} fill className="object-cover" sizes="(max-width:768px) 100vw, 320px" />
                        </div>
                      </div>

                      {/* Details */}
                      <div className="flex-1 p-5 md:p-6">
                        <h3 className="font-heading font-bold text-xl text-slate-900 mb-2">{room.name || 'Room'}</h3>
                        {room.description && <p className="text-sm text-slate-600 mb-3">{room.description}</p>}

                        <div className="flex flex-wrap gap-3 text-xs text-slate-500 mb-3">
                          {room.room_size && <span className="bg-slate-50 px-2.5 py-1 rounded-lg">{room.room_size}</span>}
                          {room.bed_type && <span className="bg-slate-50 px-2.5 py-1 rounded-lg">{room.bed_type} Bed</span>}
                          {room.max_occupancy && <span className="bg-slate-50 px-2.5 py-1 rounded-lg">Max {room.max_occupancy} guests</span>}
                        </div>

                        {(room.amenities || []).length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-4">
                            {room.amenities.slice(0, 8).map((a: string) => (
                              <span key={a} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{a}</span>
                            ))}
                          </div>
                        )}

                        {roomImages.length > 1 && (
                          <div className="mb-4"><RoomGallery images={roomImages} roomName={room.name || 'Room'} /></div>
                        )}

                        {/* Rate Plans */}
                        {hasRatePlans ? (
                          <div className="space-y-2 pt-4 border-t border-slate-100">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Pricing Options</p>
                            {room.rate_plans.map((plan: any, pi: number) => {
                              const mealTag = mealLabels[plan.meal_plan] || 'Room Only';
                              const ourPrice = discountedPrice(plan.price);
                              const isFree = plan.cancellation && plan.cancellation.toLowerCase().includes('free');
                              const isSelected = selected.roomName === room.name && selected.planName === (plan.name || mealTag) && selected.pricePerNight === ourPrice;

                              return (
                                <div key={pi} className={'flex items-center justify-between gap-4 py-3 px-4 rounded-xl transition-all ' + (isSelected ? 'bg-green-50 border-2 border-green-400 shadow-sm' : 'bg-slate-50 hover:bg-green-50/50')}>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-slate-800">{plan.name || mealTag}</p>
                                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                      <span className={'text-[11px] font-medium px-2 py-0.5 rounded-full ' + (plan.meal_plan === 'ep' ? 'bg-slate-200 text-slate-600' : 'bg-green-100 text-green-700')}>{mealTag}</span>
                                      {isFree && <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">Free Cancellation</span>}
                                    </div>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <div className="flex items-baseline gap-1.5">
                                      {plan.price > PRICE_DISCOUNT && <span className="text-xs text-slate-400 line-through">{formatPrice(plan.price)}</span>}
                                      <span className="text-xl font-bold text-slate-900">{formatPrice(ourPrice)}</span>
                                    </div>
                                    <p className="text-[10px] text-slate-500">per night + taxes</p>
                                  </div>
                                  <button
                                    onClick={() => selectRoom(room.name, plan.name || mealTag, plan.price)}
                                    className={'text-sm font-bold px-4 py-2.5 rounded-xl transition-colors whitespace-nowrap shrink-0 ' + (isSelected ? 'bg-green-600 text-white' : 'bg-orange-500 hover:bg-orange-600 text-white')}>
                                    {isSelected ? 'Selected' : 'Book'}
                                  </button>
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
                            <button onClick={() => selectRoom(room.name, 'Room Only', room.base_price)}
                              className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold px-6 py-3 rounded-xl transition-colors">
                              Book Now
                            </button>
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
      </div>

      {/* Right column: sticky booking form */}
      <div>
        <div ref={formRef} className="sticky top-20 space-y-4">
          {/* Selected room indicator */}
          {selected.roomName && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
              <p className="text-xs text-green-600 font-medium">Selected Room</p>
              <p className="font-semibold text-slate-900 text-sm">{selected.roomName}</p>
              {selected.planName && <p className="text-xs text-slate-600">{selected.planName}</p>}
              <p className="text-lg font-bold text-green-700 mt-1">{formatPrice(selected.pricePerNight)} <span className="text-xs font-normal text-slate-500">/ night</span></p>
            </div>
          )}

          {!selected.roomName && hotel.rooms?.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-center">
              <p className="text-sm text-amber-700 font-medium">Select a room and plan below to book</p>
              <p className="text-xs text-amber-600 mt-0.5">Click &quot;Book&quot; on any room option</p>
            </div>
          )}

          <BookingForm
            category="hotel"
            entityId={hotel.id}
            entityName={hotel.name}
            pricePerNight={selected.pricePerNight || (hotel.price_min ? discountedPrice(hotel.price_min) : undefined)}
            roomName={selected.roomName ? selected.roomName + (selected.planName ? ' - ' + selected.planName : '') : ''}
          />

          <div className="text-center text-xs text-slate-400">or send an inquiry</div>
          <InquiryForm type="hotel" propertyId={hotel.id} title="Quick Inquiry" subtitle="Not ready to book? Ask a question." />

          <a href={getWhatsAppLink('Hi! Interested in ' + hotel.name + (selected.roomName ? ' - ' + selected.roomName : '') + '.')} target="_blank" rel="noopener noreferrer"
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
  );
}
