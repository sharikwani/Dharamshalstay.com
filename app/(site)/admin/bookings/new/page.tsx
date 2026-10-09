'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building, Car, Mountain, Wind, User } from 'lucide-react';
import { authFetch } from '@/lib/supabase';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import { AssignFields, EMPTY_ASSIGN, EMPTY_PAYMENT, INPUT, LABEL, PaymentFields, paymentBody, type AssignValue, type OptionPartner, type PaymentValue } from '@/components/admin/BookingFields';
import { quoteBooking, nightsBetween, type BookingCategory } from '@/lib/pricing';
import { VEHICLE_TYPES } from '@/lib/partners/types';
import { commissionRateFor, splitAmount, type ActivityCategory } from '@/lib/manual-booking';
import { formatPrice, cn } from '@/lib/utils';

const TYPES: { key: BookingCategory; label: string; icon: any }[] = [
  { key: 'hotel', label: 'Hotel', icon: Building },
  { key: 'taxi', label: 'Taxi', icon: Car },
  { key: 'trek', label: 'Trek', icon: Mountain },
  { key: 'paragliding', label: 'Paragliding', icon: Wind },
  { key: 'guide', label: 'Local guide', icon: User },
];
const VEHICLE_LABEL: Record<string, string> = { sedan: 'Sedan', suv: 'SUV', innova: 'Innova', tempo: 'Tempo Traveller', bus: 'Bus' };
const MAX_AMOUNT = 10_000_000;
const CARD = 'bg-white border border-slate-200 rounded-xl p-5 mb-5';
const H2 = 'font-semibold text-slate-900 mb-3';

type Item = Record<string, any>;
const planLabel = (p: any) => p?.name || p?.meal_plan || 'Rate plan';

export default function NewBookingPage() {
  const router = useRouter();
  const [type, setType] = useState<BookingCategory>('hotel');
  const [items, setItems] = useState<Item[]>([]);
  const [partners, setPartners] = useState<OptionPartner[]>([]);
  const [loadingOpts, setLoadingOpts] = useState(true);
  const [optsError, setOptsError] = useState('');

  const [itemId, setItemId] = useState('');
  const [search, setSearch] = useState('');
  const [roomName, setRoomName] = useState('');
  const [planIdx, setPlanIdx] = useState('');
  const [custom, setCustom] = useState(false);
  const [pickup, setPickup] = useState('');
  const [drop, setDrop] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [guests, setGuests] = useState('2');
  const [days, setDays] = useState('1');

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');

  const [finalStr, setFinalStr] = useState('');
  const [edited, setEdited] = useState(false);
  const [reason, setReason] = useState('');
  const [payment, setPayment] = useState<PaymentValue>(EMPTY_PAYMENT);
  const [assign, setAssign] = useState<AssignValue>(EMPTY_ASSIGN);

  const [notifyCustomer, setNotifyCustomer] = useState(true);
  const [notifyPartner, setNotifyPartner] = useState(true);
  const [allowPast, setAllowPast] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function changeType(t: BookingCategory) {
    if (t === type) return;
    setType(t);
    setItemId(''); setSearch(''); setRoomName(''); setPlanIdx(''); setCustom(false); setPickup(''); setDrop('');
    setVehicleType(''); setAssign(EMPTY_ASSIGN); setEdited(false); setFinalStr(''); setReason(''); setError('');
    setItems([]); setPartners([]);
  }

  useEffect(() => {
    let cancelled = false;
    setLoadingOpts(true); setOptsError('');
    authFetch(`/api/admin/booking-options?type=${type}`)
      .then(async (r) => ({ ok: r.ok, body: await r.json().catch(() => ({})) }))
      .then(({ ok, body }) => {
        if (cancelled) return;
        if (!ok) { setOptsError(body.error || 'Could not load the options.'); return; }
        setItems(body.items || []); setPartners(body.partners || []);
      })
      .catch(() => { if (!cancelled) setOptsError('Could not load the options.'); })
      .finally(() => { if (!cancelled) setLoadingOpts(false); });
    return () => { cancelled = true; };
  }, [type]);

  const item = items.find((i) => i.id === itemId) || null;
  const rooms: any[] = type === 'hotel' && Array.isArray(item?.rooms) ? item!.rooms : [];
  const room = rooms.find((r) => r?.name === roomName) || null;
  const plans: any[] = Array.isArray(room?.rate_plans) ? room.rate_plans : [];
  const plan = planIdx !== '' ? plans[Number(planIdx)] : undefined;
  const guestsN = Math.max(1, Math.floor(Number(guests) || 1));
  const daysN = Math.min(30, Math.max(1, Math.floor(Number(days) || 1)));

  const listPrice = useMemo(() => {
    if (!item) return null;
    const q = quoteBooking(type, item, {
      num_guests: guestsN, check_in: checkIn || null, check_out: checkOut || null,
      room_name: roomName || null, plan_index: planIdx !== '' ? Number(planIdx) : null, guide_days: daysN,
    }).amount;
    return q > 0 ? q : null;
  }, [type, item, guestsN, checkIn, checkOut, roomName, planIdx, daysN]);

  useEffect(() => { setEdited(false); }, [itemId, roomName, planIdx, checkIn, checkOut, guests, days]);

  useEffect(() => {
    if (!edited) setFinalStr(listPrice != null ? String(listPrice) : '');
  }, [listPrice, edited]);

  const finalAmount = finalStr.trim() === '' || !Number.isFinite(Number(finalStr)) ? null : Math.round(Number(finalStr));
  const overridden = finalAmount != null && finalAmount !== listPrice;
  const partner = partners.find((p) => p.id === assign.partner_id) || null;
  const pct = Math.min(99.99, commissionRateFor(type, {
    partnerPct: partner?.commission_pct != null ? Number(partner.commission_pct) : null,
    propertyPct: type === 'hotel' && item?.commission_pct != null ? Number(item.commission_pct) : null,
  }));
  const split = finalAmount != null ? splitAmount(finalAmount, pct) : null;
  const isActivity = type === 'taxi' || type === 'trek' || type === 'paragliding';
  const nights = checkIn && checkOut ? nightsBetween(checkIn, checkOut) : 0;

  const receivedN = payment.choice === 'platform_paid' && payment.amount.trim() !== '' ? Number(payment.amount) : null;
  const guestsRaw = Number(guests);
  const problem =
    !Number.isInteger(guestsRaw) || guestsRaw < 1 || guestsRaw > 100 ? 'People must be a whole number from 1 to 100.'
    : finalStr.trim() !== '' && (!Number.isFinite(Number(finalStr)) || Number(finalStr) < 0 || Number(finalStr) > MAX_AMOUNT) ? 'Final price must be between 0 and 1,00,00,000.'
    : receivedN != null && (!Number.isFinite(receivedN) || receivedN < 0 || receivedN > MAX_AMOUNT) ? 'Amount received must be between 0 and 1,00,00,000.'
    : '';

  async function submit() {
    if (problem) return;
    setError('');
    const body: Record<string, any> = {
      category: type,
      item_id: custom ? null : itemId || null,
      num_guests: guestsN,
      guest_name: name.trim(), guest_phone: phone.trim(), guest_email: email.trim(),
      special_requests: notes.trim() || undefined,
      payment: paymentBody(payment, finalAmount),
      allow_past_date: allowPast,
      notify_customer: notifyCustomer && !!email.trim(),
      notify_partner: notifyPartner,
    };
    if (finalAmount != null) body.final_amount = finalAmount;
    if (overridden && reason.trim()) body.price_override_reason = reason.trim();
    if (type === 'hotel') {
      body.check_in = checkIn || undefined; body.check_out = checkOut || undefined;
      if (roomName) {
        body.room_name = roomName;
        if (plan) { body.plan_index = Number(planIdx); body.plan_name = planLabel(plan).slice(0, 77); }
      }
    } else {
      body.activity_date = date || undefined;
      if (type === 'taxi') {
        body.pickup_time = time || undefined;
        body.vehicle_type = vehicleType || undefined;
        if (custom) { body.pickup_location = pickup.trim(); body.drop_location = drop.trim(); }
      }
      if (type === 'guide') body.guide_days = daysN;
    }
    if (isActivity) {
      body.partner_id = assign.partner_id || null;
      body.staff_id = assign.staff_id || null;
      body.vehicle_id = type === 'taxi' ? assign.vehicle_id || null : null;
    }
    setSaving(true);
    try {
      const res = await authFetch('/api/admin/bookings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || 'Could not create the booking.'); setSaving(false); return; }
      router.push('/admin/bookings/' + data.id);
    } catch {
      setError('Could not create the booking. Please check your connection and try again.');
      setSaving(false);
    }
  }

  const shownItems = type === 'hotel' && search.trim()
    ? items.filter((i) => i.id === itemId || String(i.name).toLowerCase().includes(search.trim().toLowerCase()))
    : items;
  const who = type === 'hotel' ? 'hotel' : type === 'guide' ? 'guide' : 'partner';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <AdminPageHeader title="New booking" description="Create a booking taken by phone, WhatsApp or in person, and assign it to a hotel, partner or guide." />

      <section className={CARD}>
        <h2 className={H2}>Type</h2>
        <div className="flex flex-wrap gap-2">
          {TYPES.map(({ key, label, icon: Icon }) => (
            <button key={key} type="button" onClick={() => changeType(key)}
              className={cn('flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium', type === key ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>
      </section>

      <section className={CARD}>
        <h2 className={H2}>What is booked</h2>
        {optsError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">{optsError}</p>}
        {loadingOpts ? <p className="text-sm text-slate-500">Loading...</p> : (
          <div className="grid gap-3 sm:grid-cols-2">
            {type === 'hotel' && (
              <>
                <div className="sm:col-span-2">
                  <label className={LABEL}>Hotel</label>
                  <input className={cn(INPUT, 'mb-2')} placeholder="Search hotels..." value={search} onChange={(e) => setSearch(e.target.value)} />
                  <select className={INPUT} value={itemId} onChange={(e) => { setItemId(e.target.value); setRoomName(''); setPlanIdx(''); }}>
                    <option value="">Choose a hotel</option>
                    {shownItems.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={LABEL}>Room</label>
                  <select className={INPUT} value={roomName} disabled={!item} onChange={(e) => { setRoomName(e.target.value); setPlanIdx(''); }}>
                    <option value="">{item ? 'Any room (starting price)' : 'Choose a hotel first'}</option>
                    {rooms.map((r, idx) => <option key={idx} value={r.name}>{r.name}{Number(r.base_price) > 0 ? ` · ${formatPrice(Number(r.base_price))}` : ''}</option>)}
                  </select>
                </div>
                <div>
                  <label className={LABEL}>Rate plan</label>
                  <select className={INPUT} value={planIdx} disabled={plans.length === 0} onChange={(e) => setPlanIdx(e.target.value)}>
                    <option value="">{plans.length ? 'Room base price' : 'No rate plans'}</option>
                    {plans.map((p, idx) => <option key={idx} value={idx}>{planLabel(p)}{Number(p.price) > 0 ? ` · ${formatPrice(Number(p.price))}` : ''}</option>)}
                  </select>
                </div>
                <div>
                  <label className={LABEL}>Check-in</label>
                  <input type="date" className={INPUT} value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
                </div>
                <div>
                  <label className={LABEL}>Check-out</label>
                  <input type="date" className={INPUT} value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
                </div>
                <div>
                  <label className={LABEL}>Guests</label>
                  <input type="number" min={1} max={100} className={INPUT} value={guests} onChange={(e) => setGuests(e.target.value)} />
                </div>
                {nights > 0 && <p className="text-sm text-slate-500 self-end pb-2">{nights} night{nights === 1 ? '' : 's'}</p>}
              </>
            )}

            {type === 'taxi' && (
              <>
                <div className="sm:col-span-2">
                  <label className={LABEL}>Route</label>
                  <select className={INPUT} value={custom ? 'custom' : itemId} onChange={(e) => {
                    if (e.target.value === 'custom') { setCustom(true); setItemId(''); } else { setCustom(false); setItemId(e.target.value); const rt = items.find((i) => i.id === e.target.value); const vc = String(rt?.vehicle_category || '').toLowerCase(); setVehicleType((VEHICLE_TYPES as readonly string[]).includes(vc) ? vc : ''); }
                  }}>
                    <option value="">Choose a route</option>
                    {items.map((i) => <option key={i.id} value={i.id}>{i.from_location} → {i.to_location} · {i.vehicle_name || i.vehicle_category}{i.price_type === 'per_km' ? ' · per km' : ` · ${formatPrice(Number(i.price) || 0)}`}</option>)}
                    <option value="custom">Custom trip</option>
                  </select>
                </div>
                {custom && (
                  <>
                    <div><label className={LABEL}>Pickup</label><input className={INPUT} value={pickup} maxLength={300} onChange={(e) => setPickup(e.target.value)} /></div>
                    <div><label className={LABEL}>Drop</label><input className={INPUT} value={drop} maxLength={300} onChange={(e) => setDrop(e.target.value)} /></div>
                  </>
                )}
                <div><label className={LABEL}>Date</label><input type="date" className={INPUT} value={date} onChange={(e) => setDate(e.target.value)} /></div>
                <div><label className={LABEL}>Pickup time</label><input type="time" className={INPUT} value={time} onChange={(e) => setTime(e.target.value)} /></div>
                <div>
                  <label className={LABEL}>Vehicle type</label>
                  <select className={INPUT} value={vehicleType} onChange={(e) => setVehicleType(e.target.value)}>
                    <option value="">Any</option>
                    {VEHICLE_TYPES.map((v) => <option key={v} value={v}>{VEHICLE_LABEL[v]}</option>)}
                  </select>
                </div>
                <div><label className={LABEL}>Passengers</label><input type="number" min={1} max={100} className={INPUT} value={guests} onChange={(e) => setGuests(e.target.value)} /></div>
              </>
            )}

            {(type === 'trek' || type === 'paragliding') && (
              <>
                <div className="sm:col-span-2">
                  <label className={LABEL}>{type === 'trek' ? 'Trek' : 'Package'}</label>
                  <select className={INPUT} value={itemId} onChange={(e) => setItemId(e.target.value)}>
                    <option value="">Choose one</option>
                    {items.map((i) => <option key={i.id} value={i.id}>{i.name} · {formatPrice(Number(i.price_per_person) || 0)} per person</option>)}
                  </select>
                </div>
                <div><label className={LABEL}>Date</label><input type="date" className={INPUT} value={date} onChange={(e) => setDate(e.target.value)} /></div>
                <div><label className={LABEL}>People</label><input type="number" min={1} max={100} className={INPUT} value={guests} onChange={(e) => setGuests(e.target.value)} /></div>
              </>
            )}

            {type === 'guide' && (
              <>
                <div className="sm:col-span-2">
                  <label className={LABEL}>Guide</label>
                  <select className={INPUT} value={itemId} onChange={(e) => setItemId(e.target.value)}>
                    <option value="">Choose a guide</option>
                    {items.map((i) => <option key={i.id} value={i.id}>{i.name} · {formatPrice(Number(i.price_per_day) || 0)} per day</option>)}
                  </select>
                </div>
                <div><label className={LABEL}>Start date</label><input type="date" className={INPUT} value={date} onChange={(e) => setDate(e.target.value)} /></div>
                <div><label className={LABEL}>Days (1-30)</label><input type="number" min={1} max={30} className={INPUT} value={days} onChange={(e) => setDays(e.target.value)} /></div>
                <div><label className={LABEL}>People</label><input type="number" min={1} max={100} className={INPUT} value={guests} onChange={(e) => setGuests(e.target.value)} /></div>
              </>
            )}
          </div>
        )}
      </section>

      <section className={CARD}>
        <h2 className={H2}>Customer</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className={LABEL}>Name</label><input className={INPUT} value={name} maxLength={200} onChange={(e) => setName(e.target.value)} /></div>
          <div><label className={LABEL}>Phone</label><input type="tel" className={INPUT} value={phone} maxLength={20} onChange={(e) => setPhone(e.target.value)} /></div>
          <div className="sm:col-span-2"><label className={LABEL}>Email (optional)</label><input type="email" className={INPUT} value={email} maxLength={200} onChange={(e) => setEmail(e.target.value)} /></div>
          <div className="sm:col-span-2"><label className={LABEL}>Notes</label><textarea rows={2} className={INPUT} value={notes} maxLength={2000} onChange={(e) => setNotes(e.target.value)} /></div>
        </div>
      </section>

      <section className={CARD}>
        <h2 className={H2}>Price</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className={LABEL}>List price</p>
            <p className="text-lg font-bold text-slate-900">
              {listPrice != null ? formatPrice(listPrice) : <span className="text-sm font-normal text-slate-500">{custom ? 'No list price for a custom trip' : 'No list price yet'}</span>}
            </p>
          </div>
          <div>
            <label className={LABEL}>Final price (₹) {overridden && <span className="ml-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">manual price</span>}</label>
            <input type="number" min={0} className={INPUT} value={finalStr} onChange={(e) => { setFinalStr(e.target.value); setEdited(true); }} />
          </div>
          {overridden && (
            <div className="sm:col-span-2">
              <label className={LABEL}>Reason (optional)</label>
              <input className={INPUT} value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} />
            </div>
          )}
        </div>
      </section>

      <section className={CARD}>
        <h2 className={H2}>Payment</h2>
        <PaymentFields value={payment} onChange={setPayment} finalAmount={finalAmount} />
      </section>

      <section className={CARD}>
        <h2 className={H2}>Assign to</h2>
        {type === 'hotel' && (
          <p className="text-sm text-slate-700">{item ? <><b>{item.name}</b>{item.contact_phone ? ` · ${item.contact_phone}` : ''}{item.contact_email ? ` · ${item.contact_email}` : ''}</> : 'The hotel you choose above.'}</p>
        )}
        {type === 'guide' && (
          <p className="text-sm text-slate-700">{item ? <><b>{item.name}</b>{item.phone ? ` · ${item.phone}` : ''}{item.email ? ` · ${item.email}` : ''}</> : 'The guide you choose above.'}</p>
        )}
        {isActivity && !loadingOpts && <AssignFields category={type as ActivityCategory} partners={partners} value={assign} onChange={setAssign} />}
      </section>

      <section className="sticky bottom-0 z-10 bg-white border border-slate-200 rounded-xl p-4 shadow-lg sm:static sm:shadow-none">
        <p className="text-sm font-semibold text-slate-900 mb-3">
          {finalAmount != null && split
            ? <>Booking {formatPrice(finalAmount)} · Commission {formatPrice(split.commission_amount)} ({pct}%) · {who === 'partner' ? 'Partner' : who === 'hotel' ? 'Hotel' : 'Guide'} gets {formatPrice(split.partner_share_amount)}</>
            : 'Enter a final price to see the commission.'}
        </p>
        <div className="flex flex-col gap-1.5 mb-3 text-sm text-slate-700">
          <label className={cn('flex items-center gap-2', !email.trim() && 'opacity-50')}><input type="checkbox" disabled={!email.trim()} checked={notifyCustomer && !!email.trim()} onChange={(e) => setNotifyCustomer(e.target.checked)} /> Email the customer</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={notifyPartner} onChange={(e) => setNotifyPartner(e.target.checked)} /> Email the {who}</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={allowPast} onChange={(e) => setAllowPast(e.target.checked)} /> Allow a past date</label>
        </div>
        {problem && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">{problem}</p>}
        {error && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">{error}</p>}
        <button type="button" onClick={submit} disabled={saving || !!problem} className="w-full sm:w-auto px-6 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-semibold hover:bg-brand-700 disabled:opacity-50">
          {saving ? 'Creating...' : 'Create booking'}
        </button>
      </section>
    </div>
  );
}
