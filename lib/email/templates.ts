/**
 * Content for every automatic email. Each builder returns { subject, doc } and the layout turns it into HTML.
 * Wording rules: plain, warm, honest (never claim a booking is confirmed before it is), one clear next step.
 */
import type { Block, EmailDoc, Photo } from './layout';
import { placeImage, placeImageAlt, type PlaceImageKey } from '@/lib/place-images';

export type Built = { subject: string; doc: EmailDoc };

const T = (blocks: Block[], rest: Omit<EmailDoc, 'blocks' | 'footer'>, kind: EmailDoc['footer']['kind'] = 'transactional'): EmailDoc => ({ ...rest, blocks, footer: { kind } });

export const firstName = (n?: string | null) => (n || '').trim().split(/\s+/)[0] || 'there';
export const fmtDate = (d?: string | null) =>
  d ? new Date(String(d).slice(0, 10) + 'T00:00:00Z').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '';
export const rs = (n?: number | null) => 'Rs ' + Math.round(Number(n || 0)).toLocaleString('en-IN');
const nights = (a?: string | null, b?: string | null) => (a && b ? Math.round((Date.parse(b) - Date.parse(a)) / 86400000) : 0);

export const place = (key: PlaceImageKey, caption?: string, href?: string): Photo => ({ src: placeImage(key), alt: placeImageAlt(key), caption, href });

/** Primary photo of a hotel (its own photos are absolute URLs), or an area photo. */
export function propertyPhoto(p: { images?: any; name?: string; slug?: string | null } | null | undefined, fallback: PlaceImageKey = 'mcleod-ganj'): Photo {
  const imgs: any[] = Array.isArray(p?.images) ? p!.images : [];
  const main = imgs.find((i) => i?.is_primary) || imgs[0];
  return main?.url
    ? { src: main.url, alt: main.alt || p?.name || 'Hotel photo', href: p?.slug ? '/hotels/' + p.slug : undefined }
    : { ...place(fallback), href: p?.slug ? '/hotels/' + p.slug : undefined };
}

/** What a guest is coming for, as a short label, from a booking or enquiry. */
export function itemLabel(x: { category?: string; type?: string; property_name?: string | null; item_name?: string | null }) {
  if (x.item_name) return x.item_name;
  if (x.property_name) return x.property_name;
  const c = x.category || x.type || 'trip';
  return ({ hotel: 'your stay', taxi: 'your taxi', trek: 'your trek', paragliding: 'paragliding', general: 'your trip', guide: 'your local guide' } as Record<string, string>)[c] || 'your trip';
}

/** Month-aware packing and weather note for McLeod Ganj / Dharamshala. */
export function seasonNote(dateISO?: string | null): { title: string; text: string } {
  const m = dateISO ? new Date(dateISO).getUTCMonth() + 1 : new Date().getUTCMonth() + 1;
  if (m === 12 || m <= 2) return { title: 'Winter: pack warm', text: 'Days are crisp and sunny, nights drop close to freezing in McLeod Ganj and it can snow up high. Bring a down or heavy jacket, thermals, a woollen cap, gloves and good shoes. Ask your hotel about room heaters.' };
  if (m <= 6) return { title: 'Spring and early summer', text: 'Pleasant days and cool evenings. Pack light layers, a fleece or light jacket for the evenings, sunscreen, sunglasses and comfortable walking shoes.' };
  if (m <= 9) return { title: 'Monsoon season', text: 'Dharamshala is one of the wettest places in India in July and August. Pack a rain jacket, quick-dry clothes and shoes with good grip, and keep a little buffer in your plans for slow roads.' };
  return { title: 'Autumn: clear mountain views', text: 'October and November bring the clearest skies of the year, warm sunny days and cold nights. Pack a warm jacket for the evenings and layers for the day.' };
}

const EXPLORE: Photo[] = [
  place('tsuglagkhang', 'Dalai Lama Temple', '/blog/dalai-lama-temple-guide'),
  place('triund', 'Triund trek', '/treks/triund-trek'),
  place('bhagsu-waterfall', 'Bhagsu waterfall', '/blog/bhagsu-travel-guide'),
];

// ───────────────────────── Enquiries ─────────────────────────

export type EnquiryData = {
  id: string; name?: string | null; type: string; check_in?: string | null; check_out?: string | null; guests?: number | null;
  message?: string | null; property?: { name: string; slug?: string | null; images?: any } | null; item_name?: string | null;
  pickup_location?: string | null; drop_location?: string | null; source?: string | null;
};

export function enquiryReceived(e: EnquiryData): Built {
  const what = e.property?.name || itemLabel({ type: e.type, item_name: e.item_name });
  const rows: [string, string][] = [['Enquiry for', what]];
  if (e.check_in) rows.push([e.type === 'hotel' ? 'Check-in' : 'Date', fmtDate(e.check_in)]);
  if (e.check_out) rows.push(['Check-out', fmtDate(e.check_out) + (nights(e.check_in, e.check_out) ? ` (${nights(e.check_in, e.check_out)} nights)` : '')]);
  if (e.guests) rows.push(['Guests', String(e.guests)]);
  if (e.pickup_location || e.drop_location) rows.push(['Route', `${e.pickup_location || '?'} → ${e.drop_location || '?'}`]);
  if (e.message) rows.push(['Your message', e.message.slice(0, 300)]);
  return {
    subject: `We've received your enquiry for ${what}`,
    doc: T([
      { type: 'p', text: `Thank you for reaching out. We have your enquiry and a member of our local team in Dharamshala will get back to you with availability and the best price, usually within a few hours (9 am to 9 pm IST).` },
      { type: 'details', title: 'Your enquiry', rows },
      e.property ? { type: 'feature', photo: propertyPhoto(e.property), title: e.property.name, text: 'See photos, rooms, location and what guests say while you wait.', cta: { label: 'View the hotel', href: '/hotels/' + (e.property.slug || '') } } : { type: 'photos', photos: EXPLORE },
      { type: 'callout', tone: 'success', title: 'Want a faster answer?', text: `Message us on WhatsApp and quote your name. We reply quickest there.` },
      { type: 'button', label: 'Chat on WhatsApp', href: 'https://wa.me/19295255894?text=' + encodeURIComponent(`Hi! I sent an enquiry for ${what}.`), secondary: { label: 'Browse stays', href: '/hotels' } },
    ], { preheader: 'Our local team will reply with availability and the best price shortly.', kicker: 'Enquiry received', heading: `Thank you, ${firstName(e.name)}! We're on it.` }),
  };
}

export function enquiryFollowUp(e: EnquiryData): Built {
  const what = e.property?.name || itemLabel({ type: e.type, item_name: e.item_name });
  return {
    subject: `Still planning your Dharamshala trip, ${firstName(e.name)}?`,
    doc: T([
      { type: 'p', text: `A couple of days ago you asked us about **${what}**${e.check_in ? ` for ${fmtDate(e.check_in)}` : ''}. Did you get everything you needed? If you are still deciding, we are happy to help: tell us your budget and what matters most (view, walking distance to the temple, quiet, parking) and we will suggest two or three good options.` },
      { type: 'photos', photos: EXPLORE },
      { type: 'button', label: 'Reply on WhatsApp', href: 'https://wa.me/19295255894?text=' + encodeURIComponent(`Hi! Following up on my enquiry for ${what}.`), secondary: { label: 'See stays', href: '/hotels' } },
      { type: 'small', text: 'Already sorted? No problem, just ignore this email. We will not follow up again about this enquiry.' },
    ], { preheader: 'Tell us your budget and we will suggest the best options.', kicker: 'Following up', heading: 'Can we help you finish planning?' }),
  };
}

export function adminNewEnquiry(e: EnquiryData & { email?: string | null; phone?: string | null }): Built {
  const what = e.property?.name || itemLabel({ type: e.type, item_name: e.item_name });
  const rows: [string, string][] = [['Type', e.type], ['For', what], ['Name', e.name || '-'], ['Phone', e.phone || '-'], ['Email', e.email || '-']];
  if (e.check_in) rows.push(['Dates', `${fmtDate(e.check_in)}${e.check_out ? ' → ' + fmtDate(e.check_out) : ''}`]);
  if (e.guests) rows.push(['Guests', String(e.guests)]);
  if (e.message) rows.push(['Message', e.message.slice(0, 500)]);
  rows.push(['Source', e.source || 'website']);
  return {
    subject: `New enquiry: ${what} – ${e.name || 'guest'}`,
    doc: T([{ type: 'details', rows }, { type: 'button', label: 'Open enquiries', href: '/admin/inquiries' }],
      { heading: 'New enquiry', kicker: e.source === 'whatsapp' ? 'From WhatsApp' : 'From the website', signoff: false }, 'admin'),
  };
}

// ───────────────────────── Bookings ─────────────────────────

export type BookingData = {
  id: string; booking_ref: string; guest_name: string; category: string; amount: number; paid_amount?: number | null;
  check_in?: string | null; check_out?: string | null; activity_date?: string | null; room_name?: string | null;
  property_name?: string | null; payment_text?: string; details_url?: string | null;
  stay?: { address: string; landmark: string | null; mapUrl: string; phone: string | null } | null;
  property?: { name: string; slug?: string | null; images?: any; check_in_time?: string | null } | null;
  payment_link?: string | null;
};

function bookingRows(b: BookingData): [string, string][] {
  const rows: [string, string][] = [['Reference', `**${b.booking_ref}**`]];
  if (b.property_name) rows.push(['Property', b.property_name]);
  if (b.room_name) rows.push(['Room', b.room_name]);
  if (b.check_in) rows.push(['Dates', `${fmtDate(b.check_in)} → ${fmtDate(b.check_out)}${nights(b.check_in, b.check_out) ? ` (${nights(b.check_in, b.check_out)} nights)` : ''}`]);
  else if (b.activity_date) rows.push(['Date', fmtDate(b.activity_date)]);
  rows.push(['Amount', rs(b.amount)]);
  if (b.payment_text) rows.push(['Payment', b.payment_text]);
  if (b.stay) {
    rows.push(['Address', b.stay.address + (b.stay.landmark ? ` (landmark: ${b.stay.landmark})` : '') + ` · [Open in Google Maps](${b.stay.mapUrl})`]);
    rows.push(['Hotel phone', b.stay.phone || 'Shared on your booking page once the booking is confirmed']);
  }
  return rows;
}

export function bookingConfirmed(b: BookingData): Built {
  return {
    subject: `Booking confirmed – ${b.booking_ref} | Dharamshala Stay`,
    doc: T([
      { type: 'p', text: `Great news: your booking is **confirmed**. Here are your details. Keep this email handy for check-in.` },
      { type: 'details', title: 'Your booking', rows: bookingRows(b) },
      ...(b.property ? [{ type: 'feature', photo: propertyPhoto(b.property), title: b.property.name, text: 'Your home in the mountains. We will send you a short arrival guide 3 days before you travel.' } as Block] : []),
      { type: 'callout', tone: 'success', title: 'What to bring', text: 'A valid photo ID for every adult (Aadhaar, passport or driving licence) and this booking reference.' },
      { type: 'h2', text: 'Make the most of your trip' },
      { type: 'checks', items: ['[Airport and Volvo-stand taxis](/taxi) at fixed prices', '[Treks](/treks) like Triund with local guides', '[Paragliding in Bir Billing](/paragliding)'] },
      ...(b.details_url ? [{ type: 'button', label: 'View your booking', href: b.details_url } as Block] : []),
    ], { preheader: `${b.property_name || itemLabel(b)} · ${fmtDate(b.check_in || b.activity_date)}`, kicker: 'Booking confirmed', heading: `You're all set, ${firstName(b.guest_name)}!`, hero: b.property ? undefined : place('dhauladhar-hero') }),
  };
}

export function bookingRequested(b: BookingData): Built {
  return {
    subject: `Booking request received – ${b.booking_ref} | Dharamshala Stay`,
    doc: T([
      { type: 'p', text: `Thank you! We have received your booking request. ${b.category === 'hotel' ? 'The hotel' : 'Our team'} will confirm it shortly, and we will email and WhatsApp you as soon as it is confirmed.` },
      { type: 'callout', tone: 'warning', title: 'Not confirmed yet', text: 'Please do not travel on this request alone. Wait for our confirmation message.' },
      { type: 'details', title: 'Your request', rows: bookingRows({ ...b, payment_text: b.payment_text || 'Pay at property' }) },
      ...(b.details_url ? [{ type: 'button', label: 'View your request', href: b.details_url } as Block] : []),
    ], { preheader: 'We will confirm it shortly by email and WhatsApp.', kicker: 'Request received', heading: `Thanks, ${firstName(b.guest_name)}. We've got your request.` }),
  };
}

export function paymentFailed(b: BookingData, why: 'failed' | 'unpaid' = 'failed'): Built {
  const help = 'https://wa.me/19295255894?text=' + encodeURIComponent('Hi! I need help paying for booking ' + b.booking_ref);
  const retry = b.payment_link || b.details_url;
  return {
    subject: why === 'failed' ? `Your payment didn't go through – ${b.booking_ref}` : `Complete your booking – ${b.property_name || b.booking_ref}`,
    doc: T([
      { type: 'p', text: why === 'failed'
        ? `We tried to process your payment for **${b.property_name || itemLabel(b)}** but it did not go through. This happens sometimes with bank or UPI timeouts. If any money was debited for the failed attempt, your bank reverses it automatically, usually within 5–7 working days.`
        : `You started booking **${b.property_name || itemLabel(b)}** but the payment was not completed. Your dates are not held until payment is done, so finish it soon to keep them.` },
      { type: 'details', title: 'Your booking', rows: bookingRows({ ...b, payment_text: 'Not paid yet' }) },
      retry
        ? { type: 'button', label: why === 'failed' ? 'Try the payment again' : 'Complete payment', href: retry, secondary: { label: 'Get help on WhatsApp', href: help } }
        : { type: 'button', label: 'Get help on WhatsApp', href: help },
      { type: 'small', text: 'Want to pay another way, such as UPI, a different card or at the hotel? Reply to this email and we will sort it out.' },
    ], { preheader: why === 'failed' ? 'Retry in a minute to keep your dates.' : 'Your dates are not held until payment is complete.', kicker: why === 'failed' ? 'Payment issue' : 'Almost booked', heading: `${firstName(b.guest_name)}, let's finish your booking` }),
  };
}

export function preArrival(b: BookingData): Built {
  const s = seasonNote(b.check_in || b.activity_date);
  const blocks: Block[] = [
    { type: 'p', text: `Your trip is almost here! Here is everything you need for a smooth arrival.` },
    { type: 'details', title: 'Your booking', rows: bookingRows(b) },
  ];
  if (b.property?.check_in_time) blocks.push({ type: 'callout', tone: 'info', title: 'Check-in', text: `Check-in is from **${b.property.check_in_time}**. Arriving early or late? Let us know and we will tell the hotel.` });
  blocks.push(
    { type: 'callout', tone: 'festive', title: s.title, text: s.text },
    { type: 'h2', text: 'Getting here' },
    { type: 'list', items: [
      '**By air:** Kangra (Gaggal) Airport is about 22 km, roughly 45 to 60 minutes by taxi, from McLeod Ganj. [Book a fixed-price airport taxi](/taxi).',
      '**By bus:** overnight Volvo buses from Delhi reach Dharamshala or McLeod Ganj early morning. [Book a taxi from the bus stand](/taxi).',
      '**By train:** the nearest major station is Pathankot, about 3 hours by road.',
    ] },
    { type: 'h2', text: 'Places you will love' },
    { type: 'photos', photos: EXPLORE },
    { type: 'button', label: 'Plan your days', href: '/blog/dharamshala-3-day-itinerary', secondary: { label: 'Book a taxi', href: '/taxi' } },
  );
  return {
    subject: `Your trip to Dharamshala is almost here – arrival guide`,
    doc: T(blocks, { preheader: `${s.title} · getting here · places to see`, kicker: 'See you soon', heading: `Get ready for the mountains, ${firstName(b.guest_name)}!`, hero: b.property ? propertyPhoto(b.property) : place('dhauladhar-hero') }),
  };
}

export function reviewRequest(b: BookingData, reminder = false): Built {
  const hotel = b.category === 'hotel' && b.property?.slug;
  const href = hotel ? `/hotels/${b.property!.slug}?review=1#reviews` : 'https://wa.me/19295255894?text=' + encodeURIComponent('Feedback for booking ' + b.booking_ref + ': ');
  return {
    subject: reminder ? `A quick favour: how was ${b.property_name || 'your trip'}?` : `How was your stay, ${firstName(b.guest_name)}?`,
    doc: T([
      { type: 'p', text: `Thank you for travelling with Dharamshala Stay. We hope ${b.property_name ? `your time at **${b.property_name}**` : 'your trip'} was wonderful.` },
      { type: 'p', text: hotel
        ? `Would you take **one minute** to rate it? Honest reviews help other travellers choose well and help good local hotels get noticed.`
        : `We would love to hear how it went. Reply to this email or send us a WhatsApp: what did you love, and what could be better?` },
      ...(b.property ? [{ type: 'feature', photo: propertyPhoto(b.property), title: b.property.name, text: 'Tap below to rate the stay out of 5 and leave a short note.' } as Block] : []),
      { type: 'button', label: hotel ? 'Rate your stay' : 'Share feedback', href },
      { type: 'small', text: 'Coming back? Reply to this email and we will find you the best rate for your next visit.' },
    ], { preheader: 'One minute, five stars or honest feedback, it all helps.', kicker: reminder ? 'Quick reminder' : 'Thank you', heading: hotel ? 'How was your stay?' : 'How was your trip?' }),
  };
}

// ───────────────────────── Hotel outreach ─────────────────────────

/** "Your hotel is listed: claim it free (or have it removed)" for hotels we cannot reach on WhatsApp. */
export function listingClaimInvite(h: { name: string; slug: string; images?: any; claimUrl: string; removeUrl: string }): Built {
  return {
    subject: `${h.name} is listed on Dharamshala Stay: claim your free listing`,
    doc: T([
      { type: 'p', text: 'Dear Team,' },
      { type: 'p', text: `Greetings from **Dharamshala Stay** ([dharamshalastay.com](/)), a local travel and hotel guide for Dharamshala and McLeod Ganj run from Khaniyara, Dharamshala. **${h.name}** is listed in our guide to places to stay, and travellers are already finding it there.` },
      { type: 'feature', photo: propertyPhoto(h), title: h.name, text: 'See how your hotel appears to travellers on our site.', cta: { label: 'View your listing', href: '/hotels/' + h.slug } },
      { type: 'h2', text: 'Claim it for free and receive enquiries directly' },
      { type: 'checks', items: [
        'Correct your photos, rooms, phone number and description',
        'Show your own rates and availability, with **no listing fee**',
        'Receive guest enquiries and booking alerts on WhatsApp and email',
        'A "Verified property" badge, and replies to guest reviews',
      ] },
      { type: 'callout', tone: 'festive', title: 'How to claim (about 2 minutes)', text: '1. Press the button below. 2. Enter your name, phone, email and role. 3. We verify it, usually within one working day. 4. Create your partner login with the same email, and the listing links to your account.' },
      { type: 'button', label: `Claim ${h.name}`, href: h.claimUrl },
      { type: 'small', text: `Prefer not to be listed? [Ask us to remove ${h.name}](${h.removeUrl}) and we will take it down.` },
    ], { preheader: 'Travellers are finding your hotel on our site. Claim it free and get enquiries directly.', kicker: 'For hotel owners and managers', heading: `${h.name} is on Dharamshala Stay` }),
  };
}

// ───────────────────────── Newsletter ─────────────────────────

export function newsletterConfirm(name: string | null, confirmUrl: string): Built {
  return {
    subject: 'Please confirm your subscription – Dharamshala Stay',
    doc: T([
      { type: 'p', text: `Thanks for signing up for travel ideas from Dharamshala and McLeod Ganj: festival weekends, snow alerts, seasonal guides and member-only offers. Please confirm your email address to start receiving them.` },
      { type: 'button', label: 'Yes, subscribe me', href: confirmUrl },
      { type: 'small', text: 'Did not sign up? Ignore this email and you will not hear from us.' },
    ], { preheader: 'One click to confirm.', kicker: 'Almost done', heading: `Confirm your email${name ? ', ' + firstName(name) : ''}`, hero: place('dhauladhar-hero') }),
  };
}

export function newsletterWelcome(name: string | null): Built {
  return {
    subject: 'Welcome to Dharamshala Stay',
    doc: T([
      { type: 'p', text: `You are in! Expect the occasional email (never more than one a week) with the best time to visit, festival plans, snow alerts and offers on stays, taxis and treks.` },
      { type: 'h2', text: 'Start exploring' },
      { type: 'feature', photo: place('mcleod-ganj'), title: 'Where to stay in Dharamshala', text: 'McLeod Ganj, Bhagsu, Dharamkot or the town: which area suits your trip.', cta: { label: 'Read the guide', href: '/blog/where-to-stay-in-dharamshala' } },
      { type: 'photos', photos: EXPLORE },
      { type: 'button', label: 'Browse stays', href: '/hotels', secondary: { label: 'Explore treks', href: '/treks' } },
    ], { preheader: 'Festival plans, snow alerts and offers, at most once a week.', kicker: 'Welcome', heading: `Welcome aboard${name ? ', ' + firstName(name) : ''}!`, hero: place('dhauladhar-hero') }, 'marketing'),
  };
}
