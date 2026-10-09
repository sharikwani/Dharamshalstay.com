import { sendEmail } from '@/lib/email';
import { serviceClient } from '@/lib/server-auth';
import { effectiveCollector } from '@/lib/manual-booking';

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const wrap = (title: string, inner: string) => `<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:20px"><h2 style="color:#1e3a5f">${esc(title)}</h2>${inner}<p style="color:#94a3b8;font-size:12px;margin-top:24px">Dharamshala Stay</p></div>`;

export type BookingView = Record<string, any> & {
  item_name: string;
  date_text: string;
  assignee_text: string | null;
  payment_text: string;
  effective_collector: 'partner' | 'platform' | null;
  partner_contact: { name: string; email: string | null; phone: string | null } | null;
};

const fmtDate = (d?: string | null) =>
  d ? new Date(d + 'T00:00:00Z').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }) : '';

async function one(table: string, id: string | null | undefined, cols: string): Promise<Record<string, any> | null> {
  if (!id) return null;
  const { data, error } = await serviceClient().from(table).select(cols).eq('id', id).maybeSingle();
  if (error) { console.error(`Could not load ${table} for booking email:`, error); return null; }
  return (data as any) ?? null;
}

type Related = {
  property: Record<string, any> | null; route: Record<string, any> | null; trek: Record<string, any> | null;
  pkg: Record<string, any> | null; guide: Record<string, any> | null; partner: Record<string, any> | null;
  staff: Record<string, any> | null; vehicle: Record<string, any> | null;
};

function buildView(b: Record<string, any>, r: Related): BookingView {
  const { property, route, trek, pkg, guide, partner, staff, vehicle } = r;
  let item_name = '';
  if (b.category === 'hotel') item_name = (property?.name || 'Hotel') + (b.room_name ? ` · ${b.room_name}` : '');
  else if (b.category === 'taxi') item_name = route ? `${route.from_location} → ${route.to_location}` : `${b.pickup_location || ''} → ${b.drop_location || ''}`;
  else if (b.category === 'trek') item_name = trek?.name || 'Trek';
  else if (b.category === 'paragliding') item_name = pkg?.name || 'Paragliding';
  else item_name = guide?.name || 'Local guide';

  let date_text: string;
  if (b.category === 'hotel') date_text = `${fmtDate(b.check_in)} – ${fmtDate(b.check_out)}`;
  else {
    date_text = fmtDate(b.activity_date) + (b.pickup_time ? `, ${b.pickup_time}` : '');
    if (b.category === 'guide' && b.guide_days) date_text += ` · ${b.guide_days} day${b.guide_days === 1 ? '' : 's'}`;
  }

  let assignee_text: string | null = null;
  if (staff) assignee_text = staff.full_name + (staff.phone ? `, ${staff.phone}` : '');
  if (vehicle) assignee_text = (assignee_text ? assignee_text + ' · ' : '') + vehicle.registration_no;

  const effective_collector = effectiveCollector(b);
  const payment_text = effective_collector === 'platform' ? 'Paid to Dharamshala Stay'
    : effective_collector === 'partner' ? 'Customer pays the partner directly' : 'Payment pending';

  let partner_contact: BookingView['partner_contact'] = null;
  if (b.category === 'hotel' && property) partner_contact = { name: property.name, email: property.contact_email || null, phone: property.contact_phone || null };
  else if (b.category === 'guide' && guide) partner_contact = { name: guide.name, email: guide.email || null, phone: guide.phone || null };
  else if (partner) partner_contact = { name: partner.legal_name || partner.business_name || partner.full_name, email: partner.email || null, phone: partner.phone || null };

  return { ...b, item_name, date_text, assignee_text, payment_text, effective_collector, partner_contact };
}

export async function loadBookingView(bookingId: string): Promise<BookingView | null> {
  const { data: b, error } = await serviceClient().from('bookings').select('*').eq('id', bookingId).maybeSingle();
  if (error) { console.error('Could not load booking for email:', error); return null; }
  if (!b) return null;

  const [property, route, trek, pkg, guide, partner, staff, vehicle] = await Promise.all([
    one('properties', b.property_id, 'name, contact_email, contact_phone'),
    one('taxi_routes', b.taxi_route_id, 'from_location, to_location'),
    one('treks', b.trek_id, 'name'),
    one('paragliding_packages', b.paragliding_id, 'name'),
    one('guides', b.guide_id, 'name, email, phone'),
    one('profiles', b.partner_id, 'legal_name, business_name, full_name, email, phone'),
    one('partner_staff', b.staff_id, 'full_name, phone'),
    one('vehicles', b.vehicle_id, 'registration_no'),
  ]);
  return buildView(b, { property, route, trek, pkg, guide, partner, staff, vehicle });
}

/** Build views for many bookings with one batched lookup per related table. Throws on a query error. */
export async function toBookingViews(rows: Record<string, any>[]): Promise<BookingView[]> {
  if (!rows.length) return [];
  const ids = (key: string) => Array.from(new Set(rows.map((r) => r[key]).filter(Boolean))) as string[];
  const load = async (table: string, key: string, cols: string) => {
    const wanted = ids(key);
    const map = new Map<string, Record<string, any>>();
    if (!wanted.length) return map;
    const { data, error } = await serviceClient().from(table).select('id, ' + cols).in('id', wanted);
    if (error) throw new Error(`Could not load ${table}: ${error.message}`);
    for (const d of (data as any[]) || []) map.set(d.id, d);
    return map;
  };
  const [properties, routes, treks, pkgs, guides, partners, staff, vehicles] = await Promise.all([
    load('properties', 'property_id', 'name, contact_email, contact_phone'),
    load('taxi_routes', 'taxi_route_id', 'from_location, to_location'),
    load('treks', 'trek_id', 'name'),
    load('paragliding_packages', 'paragliding_id', 'name'),
    load('guides', 'guide_id', 'name, email, phone'),
    load('profiles', 'partner_id', 'legal_name, business_name, full_name, email, phone'),
    load('partner_staff', 'staff_id', 'full_name, phone'),
    load('vehicles', 'vehicle_id', 'registration_no'),
  ]);
  return rows.map((b) => buildView(b, {
    property: properties.get(b.property_id) ?? null, route: routes.get(b.taxi_route_id) ?? null,
    trek: treks.get(b.trek_id) ?? null, pkg: pkgs.get(b.paragliding_id) ?? null,
    guide: guides.get(b.guide_id) ?? null, partner: partners.get(b.partner_id) ?? null,
    staff: staff.get(b.staff_id) ?? null, vehicle: vehicles.get(b.vehicle_id) ?? null,
  }));
}

const rupees = (n: unknown) => `Rs.${Number(n || 0).toLocaleString('en-IN')}`;
const row = (k: string, v: unknown) => (v ? `<tr><td style="padding:4px 12px 4px 0;color:#64748b">${esc(k)}</td><td style="padding:4px 0"><b>${esc(v)}</b></td></tr>` : '');

export async function sendManualBookingEmails(
  bookingId: string,
  opts: { customer: boolean; partner: boolean; subjectPrefix?: string },
): Promise<void> {
  const v = await loadBookingView(bookingId);
  if (!v) return;
  const prefix = opts.subjectPrefix || '';

  if (opts.customer && v.guest_email) {
    const payment = v.effective_collector === 'partner' ? 'Pay at the time of service' : v.payment_text;
    const html = wrap('Your booking is confirmed', `<p>Hi ${esc(v.guest_name)},</p><p>Thank you for booking with Dharamshala Stay.</p><table>${[
      row('Booking reference', v.booking_ref), row('Booking', v.item_name), row('When', v.date_text),
      row('People', v.num_guests), row(v.category === 'taxi' ? 'Your driver' : v.category === 'paragliding' ? 'Your pilot' : 'Your guide', v.assignee_text), row('Price', rupees(v.amount)), row('Payment', payment),
    ].join('')}</table><p>Need help? Reply to this email.</p>`);
    try { await sendEmail({ to: v.guest_email, subject: `${prefix}Your booking is confirmed – ${v.booking_ref}`, html }); }
    catch (e) { console.error('Customer booking email failed:', e); }
  }

  if (opts.partner && v.partner_contact?.email) {
    const money = v.effective_collector === 'platform'
      ? `Your share: ${rupees(v.partner_share_amount)} (we will pay you)`
      : v.effective_collector === 'partner' ? `Commission due to Dharamshala Stay: ${rupees(v.commission_amount)}`
      : null;
    const html = wrap('New booking from Dharamshala Stay', `<p>Hi ${esc(v.partner_contact.name)},</p><table>${[
      row('Booking reference', v.booking_ref), row('Customer', v.guest_name), row('Phone', v.guest_phone), row('Email', v.guest_email),
      row('Booking', v.item_name), row('When', v.date_text), row('People', v.num_guests), row('Assigned', v.assignee_text),
      row('Price', rupees(v.amount)), row('Payment', v.effective_collector === 'partner' ? 'Customer pays you directly' : v.payment_text),
    ].join('')}</table>${money ? `<p><b>${esc(money)}</b></p>` : ''}${v.special_requests ? `<p>Notes: ${esc(v.special_requests)}</p>` : ''}`);
    try { await sendEmail({ to: v.partner_contact.email, subject: `${prefix}New booking from Dharamshala Stay – ${v.booking_ref}`, html }); }
    catch (e) { console.error('Partner booking email failed:', e); }
  }
}

/** Tell the customer and the partner a booking was cancelled. Never throws. */
export async function sendCancellationEmails(bookingId: string, reason: string): Promise<void> {
  try {
    const v = await loadBookingView(bookingId);
    if (!v) return;
    const subject = `Booking cancelled – ${v.booking_ref}`;
    const details = `<table>${[row('Booking reference', v.booking_ref), row('Booking', v.item_name), row('When', v.date_text)].join('')}</table><p>Reason: ${esc(reason)}</p>`;

    if (v.guest_email) {
      const html = wrap('Your booking was cancelled', `<p>Hi ${esc(v.guest_name)},</p><p>Your booking with Dharamshala Stay has been cancelled.</p>${details}<p>Need help? Reply to this email.</p>`);
      try { await sendEmail({ to: v.guest_email, subject, html }); }
      catch (e) { console.error('Customer cancellation email failed:', e); }
    }
    if (v.partner_contact?.email) {
      const html = wrap('Booking cancelled', `<p>Hi ${esc(v.partner_contact.name)},</p><p>This booking has been cancelled.</p>${details}`);
      try { await sendEmail({ to: v.partner_contact.email, subject, html }); }
      catch (e) { console.error('Partner cancellation email failed:', e); }
    }
  } catch (e) { console.error('Cancellation emails failed:', e); }
}

/** Tell the previous partner a booking was moved to someone else. Never throws. */
export async function sendReassignedAwayEmail(bookingId: string, previousPartnerId: string): Promise<void> {
  try {
    const [v, prev] = await Promise.all([
      loadBookingView(bookingId),
      one('profiles', previousPartnerId, 'legal_name, business_name, full_name, email'),
    ]);
    if (!v || !prev?.email) return;
    const name = prev.legal_name || prev.business_name || prev.full_name;
    const html = wrap('Booking reassigned', `<p>Hi ${esc(name)},</p><p>This booking has been reassigned to another partner. You no longer need to take it.</p><table>${[row('Booking reference', v.booking_ref), row('Booking', v.item_name), row('When', v.date_text)].join('')}</table>`);
    try { await sendEmail({ to: prev.email, subject: `Booking reassigned – ${v.booking_ref}`, html }); }
    catch (e) { console.error('Reassigned-away email failed:', e); }
  } catch (e) { console.error('Reassigned-away email failed:', e); }
}
