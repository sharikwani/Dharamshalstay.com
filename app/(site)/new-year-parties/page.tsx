import Link from 'next/link';
import { BedDouble, CalendarDays, ChefHat, Clock, CupSoda, Flame, MapPin, Music, Salad, Sparkles, Ticket, Wine, type LucideIcon } from 'lucide-react';
import { Breadcrumb, FAQSection } from '@/components/ui/Cards';
import JsonLd from '@/components/seo/JsonLd';
import TicketForm from '@/components/parties/TicketForm';
import Countdown from '@/components/parties/Countdown';
import '@/components/parties/party.css';
import { gala } from '@/lib/fonts';
import { generateSEO, faqSchema, breadcrumbSchema } from '@/lib/seo';
import { siteConfig } from '@/lib/config';
import { PARTIES, partyDateLabel, partyOnSale, ticketPrice } from '@/data/parties';

export const revalidate = 300;

export const metadata = generateSEO({
  title: 'New Year Party in Dharamshala & McLeod Ganj 2026: Tickets',
  description: 'New Year party in Dharamshala 2026: NYE Gala Night at Panchvati Cottages on 31 Dec, gates 7 pm, DJ, bonfire, dinner. Book online, 5% off, from Rs 500.',
  path: '/new-year-parties', lang: 'en', ogTag: 'NYE 2026 tickets',
});

const CHECKED = '29 October 2026';
/** A sample of the ticket card customers receive (drawn by /tickets/card-render; its QR opens this page). */
const SAMPLE_TICKET = '/tickets/card-render?' + new URLSearchParams({
  p: 'NYE Gala Night 2026 at Panchvati Cottages', d: 'Thursday 31 December 2026, 7:00 pm', v: 'Panchvati Cottages, Khaniara, Dharamshala',
  n: 'Your name here', t: 'Couple × 1 (admits 2)', c: 'NYE-SAMP-LE26', f: 'Booking ref', tot: '3799', pd: '3799',
  u: 'https://www.dharamshalastay.com/new-year-parties',
}).toString();

/** Midnight, India time, when 31 December 2026 turns into 2027. */
const COUNTDOWN_TO = '2027-01-01T00:00:00+05:30';

const INCLUDED: [LucideIcon, string, boolean][] = [
  [Music, 'DJ all night', false],
  [Flame, 'Bonfire', true],
  [Salad, '3 veg & 3 non-veg starters', false],
  [ChefHat, 'Main course dinner', false],
  [CupSoda, 'Soft drinks included', false],
  [Wine, 'Bar open · alcohol charged separately', false],
];

/** Fairy lights: three swags of bulbs hanging across the top of the hero. */
const SWAGS = 3;
const SPAN = 1440 / SWAGS;
const WIRE = 'M0 6 ' + Array.from({ length: SWAGS }, (_, i) => `Q${(i + 0.5) * SPAN} 70 ${(i + 1) * SPAN} 6`).join(' ');
const BULBS: [number, number][] = Array.from({ length: 36 }, (_, k) => {
  const per = 12, i = Math.floor(k / per), t = ((k % per) + 0.5) / per;
  // On the quadratic curve from (x0, 6) through the control point (mid, 70) to (x1, 6).
  return [i * SPAN + SPAN * t, (1 - t) * (1 - t) * 6 + 2 * (1 - t) * t * 70 + t * t * 6];
});

/** Venues travel guides list for New Year nights. Their 2026 plans are not announced yet; we re-check from late November. */
const VENUES: [string, string, string][] = [
  ['McLlo Restaurant & Bar', 'Main Square, McLeod Ganj', 'DJ countdown nights over several floors'],
  ['Xcite Bar', 'Bhagsu Nag Road', 'DJ sets and a compact dance party'],
  ['Laughing Buddha Cafe', 'Jogiwara Road / Upper Bhagsu area', 'acoustic and indie live sets'],
  ['Moonlight Cafe & Lounge', 'Bhagsu, near Dharamkot Road', 'light music and a terrace countdown'],
  ['Jimmy’s Italian Kitchen', 'Bhagsu Road, first floor', 'a special New Year dinner menu, no loud music'],
  ['WelcomHeritage Natraj', 'McLeod Ganj Road, upper McLeod Ganj', 'a gala dinner with live music'],
  ['Hotel Nature’s Feast', 'Upper Bhagsunag entrance road', 'a lawn bonfire gathering'],
];

const FAQS = [
  { question: 'Where is there a New Year party in Dharamshala in 2026?', answer: 'The NYE Gala Night at Panchvati Cottages, Khaniara, Dharamshala, on Thursday 31 December 2026 (gates open 7 pm) has tickets on sale on this page: Couple ₹3,799 and Stag ₹2,374 after the 5% online discount, with a DJ, a bonfire, starters and a main-course dinner. You can book with ₹500 and pay the rest at the entry. The Kangra Valley Carnival runs 24 to 31 December 2026, and McLeod Ganj and Bhagsu bars announce their New Year nights from late November.' },
  { question: 'Where can I celebrate New Year 2027 in McLeod Ganj or Dharamshala?', answer: 'Book a ticket for the New Year Eve party at Panchvati Cottages in Dharamshala on this page, or choose from the bars, cafes and hotels in McLeod Ganj and Bhagsu that usually host New Year nights. Most venues announce their 2026 programmes and prices in late November or December.' },
  { question: 'When is the Kangra Valley Carnival 2026?', answer: 'The Kangra district administration has announced the Kangra Valley Carnival for 24 to 31 December 2026 in Dharamshala, with an opening concert proposed at the HPCA cricket stadium. The full schedule and entry details were not published when we checked on ' + CHECKED + '.' },
  { question: 'How much are the New Year Eve party tickets at Panchvati Cottages?', answer: 'For the NYE Gala Night on 31 December 2026: Couple ₹3,999, Stag ₹2,499 (only with a couple), Child 12 to 18 years ₹1,499 and Kid 6 to 12 years ₹999, with 5% off when you book online here (Couple ₹3,799, Stag ₹2,374, Child ₹1,424, Kid ₹949). Gates open at 7 pm. The package includes a DJ, a bonfire, 3 vegetarian and 3 non-vegetarian starters and a main-course dinner; soft drinks are included and alcohol is charged separately at the bar. Rooms for the night are ₹4,999 (Super Deluxe, double sharing) and ₹6,999 (Family Suite, four sharing), both with breakfast; add one to your tickets online and the 5% discount applies once to the whole booking. You can pay in full online, or pay ₹500 online to book and the rest at Panchvati at the entry.' },
  { question: 'How do I book New Year party tickets at Panchvati Cottages?', answer: 'Choose your ticket type and number of tickets on this page and pay online. Your ticket card with a ticket code reaches your email and WhatsApp right after payment; show it at the entry. If tickets are not on sale yet, WhatsApp us to be told when bookings open.' },
  { question: 'Is McLeod Ganj crowded on New Year Eve?', answer: 'Yes. The week from Christmas to New Year is one of the busiest of the year, with heavy traffic on 30 and 31 December. Book your stay and taxi early, and check the police traffic plan, which is usually announced on 30 or 31 December.' },
  { question: 'Does it snow in McLeod Ganj at New Year?', answer: 'Sometimes, but not every year. Snow in McLeod Ganj itself is occasional in late December and more common in January; the higher villages such as Naddi and Dharamkot see it more often. See our snowfall guide for dated records.' },
  { question: 'Where should I stay for the New Year parties?', answer: 'Stay in McLeod Ganj or Bhagsu to walk to the bars and cafes, or in lower Dharamshala for easier roads and parking, and book early: the last week of December sells out first.' },
];

export default function NewYearPartiesPage() {
  const featured = PARTIES[0];
  const onSale = partyOnSale(featured);
  return (
    <div className={'nye ' + gala.variable}>
      <JsonLd data={[
        breadcrumbSchema([{ name: 'Home', href: '/' }, { name: 'Events', href: '/events' }, { name: 'New Year parties', href: '/new-year-parties' }]),
        faqSchema(FAQS),
        {
          '@context': 'https://schema.org', '@type': 'Event', name: featured.name,
          startDate: featured.date + 'T19:00:00+05:30', endDate: '2027-01-01T02:00:00+05:30', image: [siteConfig.url + featured.image], eventStatus: 'https://schema.org/EventScheduled', eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
          location: { '@type': 'Place', name: featured.venue, address: { '@type': 'PostalAddress', streetAddress: 'Khaniara', addressLocality: 'Dharamshala', addressRegion: 'Himachal Pradesh', addressCountry: 'IN' } },
          organizer: { '@id': siteConfig.url + '/#organization' }, url: siteConfig.url + '/new-year-parties', description: featured.summary,
          ...(onSale ? { offers: featured.ticketTypes.map((t) => ({ '@type': 'Offer', name: t.name, price: ticketPrice(t.price, featured.discountPct), priceCurrency: 'INR', availability: 'https://schema.org/InStock', validFrom: '2026-10-29T00:00:00+05:30', url: siteConfig.url + '/new-year-parties' })) } : {}),
        },
      ]} />

      <section className="nye-hero">
        <svg className="nye-lights" viewBox="0 0 1440 70" preserveAspectRatio="none" aria-hidden="true">
          <path d={WIRE} fill="none" stroke="rgba(251,243,228,0.35)" strokeWidth="1.5" />
          {BULBS.map(([x, y], i) => <circle key={i} className="nye-bulb" cx={x} cy={y + 5} r="4.5" />)}
        </svg>
        <span className="nye-fw" style={{ left: '12%', top: '22%' }} aria-hidden="true" />
        <span className="nye-fw f2" style={{ left: '82%', top: '16%' }} aria-hidden="true" />
        <span className="nye-fw f3" style={{ left: '68%', top: '42%' }} aria-hidden="true" />
        <span className="nye-fw f4" style={{ left: '28%', top: '50%' }} aria-hidden="true" />

        <div className="nye-hero-inner mx-auto max-w-5xl px-4 pb-44 pt-14 sm:px-6 sm:pb-56">
          <div className="[&_a]:text-white/70 [&_span]:text-white/90 [&_svg]:text-white/50"><Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Events', href: '/events' }, { label: 'New Year parties' }]} /></div>
          <p className="nye-kicker mt-6">{featured.venue} · {featured.area}</p>
          <h1 className="mt-3">
            <span className="nye-h1-lead block">New Year Party in Dharamshala 2026</span>
            <span className="nye-title mt-2 block">NYE <em>Gala</em> Night</span>
          </h1>
          <p className="nye-date mt-4">Thursday 31 December 2026 · {featured.startTime || '7:00 pm'} till {featured.endTime || 'late'}</p>
          <div className="mt-8"><Countdown to={COUNTDOWN_TO} done="Happy New Year 2027!" /></div>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <a href="#tickets" className="nye-cta"><Ticket className="h-5 w-5" aria-hidden="true" />{onSale ? `Book tickets · ${featured.discountPct || 0}% off online` : 'Tickets open soon'}</a>
            {onSale && featured.depositAmount ? <span className="text-sm text-white/75">Book with just ₹{featured.depositAmount}, pay the rest at the entry</span> : null}
          </div>
        </div>

        <svg className="nye-ridge" viewBox="0 0 1440 220" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 150 L120 96 L210 130 L330 52 L420 104 L520 40 L640 112 L760 60 L860 118 L990 34 L1090 100 L1200 64 L1320 120 L1440 80 L1440 220 L0 220 Z" fill="#3b2357" opacity="0.75" />
          <path d="M330 52 L355 66 L372 60 L395 80 L420 104 L404 84 L380 76 L362 70 Z M990 34 L1018 52 L1036 46 L1060 70 L1090 100 L1068 80 L1044 64 L1022 58 Z M520 40 L548 60 L566 54 L590 80 L606 96 L582 76 L560 68 L540 62 Z" fill="#f4ecff" opacity="0.55" />
          <path d="M0 190 L160 150 L300 176 L470 128 L640 170 L800 136 L980 178 L1150 140 L1300 172 L1440 150 L1440 220 L0 220 Z" fill="#1a0f2e" />
          <path d="M0 220 L0 206 L260 196 L520 210 L780 198 L1040 212 L1300 200 L1440 208 L1440 220 Z" fill="#0d0a24" />
        </svg>
      </section>

      <section className="text-white">
        <div className="mx-auto max-w-5xl px-4 pb-6 sm:px-6">
          <p className="max-w-3xl text-lg text-white/80"><strong className="text-white">Short answer:</strong> book the NYE Gala Night at <strong className="text-white">Panchvati Cottages, Khaniara, Dharamshala</strong> on <strong className="text-white">31 December 2026</strong> (gates 7 pm; couple ₹3,999, stag ₹2,499, 5% off online) on this page and get your ticket card on WhatsApp and email. The <strong className="text-white">Kangra Valley Carnival</strong> is announced for <strong className="text-white">24 to 31 December 2026</strong>, and McLeod Ganj and Bhagsu bars, cafes and hotels usually announce their Christmas and New Year nights from late November. Checked {CHECKED}.</p>

          <h2 className="nye-h2 mt-14">What is in the night</h2>
          <p className="mt-2 max-w-2xl text-white/75">{featured.summary}</p>
          <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {INCLUDED.map(([Icon, label, ember]) => (
              <li key={label} className={'nye-chip' + (ember ? ' ember' : '')}><Icon className="h-8 w-8" aria-hidden="true" /><span className="text-sm font-semibold">{label}</span></li>
            ))}
          </ul>
        </div>
      </section>

      <section id="tickets" className="scroll-mt-20 text-white">
        <div className="mx-auto max-w-5xl px-4 pb-16 pt-12 sm:px-6">
          <h2 className="nye-h2">Tickets{featured.discountPct ? <span className="nye-off">{featured.discountPct}% off online</span> : null}</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {featured.ticketTypes.map((t) => (
              <div key={t.id} className="nye-stub">
                <div><p className="font-bold leading-tight">{t.name}</p><p className="text-xs opacity-75">Admits {t.admits}</p></div>
                <div className="text-right">
                  {featured.discountPct ? <p className="nye-stub-was">₹{t.price.toLocaleString('en-IN')}</p> : null}
                  <p className="nye-stub-price">₹{ticketPrice(t.price, featured.discountPct).toLocaleString('en-IN')}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="nye-panel mt-6 grid gap-8 p-5 sm:p-8 md:grid-cols-[0.9fr_1.1fr]">
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={SAMPLE_TICKET} alt="Sample NYE Gala Night ticket: guest name, date, venue, tickets, payment status, ticket code and QR code" width={1080} height={1350} loading="lazy" className="nye-sample" />
              <p className="mt-2 text-center text-sm text-white/70">Your ticket looks like this, with your name, a unique ticket code and a QR code for the entry.</p>
              {featured.rooms?.length ? (
                <div className="mt-6 rounded-2xl border border-white/15 bg-white/5 p-4">
                  <p className="flex items-center gap-2 font-semibold text-white"><BedDouble className="h-5 w-5 text-[#f2c46d]" aria-hidden="true" />Stay the night at {featured.venue}</p>
                  <ul className="mt-2 space-y-1 text-sm text-white/85">
                    {featured.rooms.map((r) => <li key={r.id}>{r.name}: {featured.discountPct ? <><s className="text-white/50">₹{r.price.toLocaleString('en-IN')}</s>{' '}</> : null}<strong className="text-[#f2c46d]">₹{ticketPrice(r.price, featured.discountPct).toLocaleString('en-IN')}</strong> a night, {r.note}</li>)}
                  </ul>
                  <p className="mt-2 text-sm text-white/70">Add the room to your tickets in the booking form: you pay once, with {featured.discountPct || 0}% off the whole booking.{featured.depositAmount ? ` Pay in full, or just ₹${featured.depositAmount} online to book and the rest at the entry.` : ''}</p>
                </div>
              ) : null}
              <ul className="mt-6 space-y-2 text-sm text-white/80">
                <li className="flex gap-2"><CalendarDays className="h-5 w-5 shrink-0 text-[#f2c46d]" aria-hidden="true" />{partyDateLabel(featured)}</li>
                <li className="flex gap-2"><MapPin className="h-5 w-5 shrink-0 text-[#f2c46d]" aria-hidden="true" /><span>{featured.venue}, {featured.area}{featured.propertySlug && <> · <Link href={'/hotels/' + featured.propertySlug} className="underline">see the property</Link></>}</span></li>
                <li className="flex gap-2"><Sparkles className="h-5 w-5 shrink-0 text-[#f2c46d]" aria-hidden="true" />Your ticket card with a QR code arrives on WhatsApp and email right after payment</li>
              </ul>
            </div>
            <TicketForm party={featured.slug} types={featured.ticketTypes} onSale={onSale} discountPct={featured.discountPct} rooms={featured.rooms} deposit={featured.depositAmount} venue={featured.venue} />
          </div>
        </div>
      </section>

      <div className="nye-paper">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <h2 className="font-heading text-2xl font-bold text-slate-900">Quick facts</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full overflow-hidden rounded-xl bg-white text-sm ring-1 ring-slate-200">
            <tbody className="divide-y divide-slate-100">
              {[
                ['New Year Eve', 'Thursday 31 December 2026 (New Year Day is Friday 1 January 2027)'],
                ['Christmas', 'Thursday 24 December (Eve) and Friday 25 December 2026'],
                ['Kangra Valley Carnival', '24 to 31 December 2026, Dharamshala (announced; schedule not yet published)'],
                ['Featured party', featured.venue + ', ' + featured.area + (onSale ? ': tickets on sale' : ': tickets open soon')],
                ['When venues announce', 'Usually late November to mid-December'],
                ['Busiest days', '30 and 31 December: book stays and taxis early'],
                ['Where to stay', 'McLeod Ganj or Bhagsu to walk to the bars; lower Dharamshala for easier roads'],
              ].map(([k, v]) => <tr key={k}><th scope="row" className="w-44 p-3 text-left align-top font-semibold text-slate-800">{k}</th><td className="p-3 text-slate-700">{v}</td></tr>)}
            </tbody>
          </table>
        </div>

        <h2 className="mt-12 font-heading text-2xl font-bold text-slate-900">When is the Kangra Valley Carnival 2026?</h2>
        <p className="mt-3 text-slate-700">The Kangra district administration has announced the carnival for <strong>24 to 31 December 2026</strong> in Dharamshala, with an opening concert proposed at the <Link href="/blog/hpca-cricket-stadium-guide" className="text-brand-600 underline">HPCA cricket stadium</Link> (UNI, 30 September 2026). The full schedule, artists and entry details were not published when we checked on {CHECKED}; past editions have had a procession through the town, a food festival, a craft market and evening concerts. We will add the programme here as soon as it is out.</p>

        <h2 className="mt-12 font-heading text-2xl font-bold text-slate-900">Where are the New Year parties in McLeod Ganj and Bhagsu?</h2>
        <p className="mt-3 text-slate-700">These bars, cafes and hotels are listed by travel guides as popular for New Year nights. <strong>None has announced its 2026 plans or prices yet</strong>, so check with the venue closer to the date; we re-check them from late November.</p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {VENUES.map(([n, a, d]) => (
            <li key={n} className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="font-semibold text-slate-900">{n}</p>
              <p className="text-sm text-slate-500 flex gap-1"><MapPin className="h-4 w-4 shrink-0 mt-0.5" />{a}</p>
              <p className="mt-1 text-sm text-slate-700">Known for {d}.</p>
            </li>
          ))}
        </ul>

        <h2 className="mt-12 font-heading text-2xl font-bold text-slate-900">How is Christmas celebrated in McLeod Ganj?</h2>
        <p className="mt-3 text-slate-700">Christmas Eve and Christmas Day bring special dinners and parties in the cafes and hotels, and the town fills up from 24 December onwards. Our <Link href="/blog/dharamshala-christmas-new-year" className="text-brand-600 underline">Christmas in Dharamshala guide</Link> and <Link href="/blog/new-year-in-mcleod-ganj" className="text-brand-600 underline">New Year in McLeod Ganj guide</Link> cover crowds, weather and what is open.</p>

        <h2 className="mt-12 font-heading text-2xl font-bold text-slate-900">What about traffic on New Year Eve?</h2>
        <p className="mt-3 text-slate-700 flex gap-2"><Clock className="h-5 w-5 shrink-0 mt-0.5 text-slate-400" /><span>Expect jams on 30 and 31 December. For New Year 2024–25 the Kangra police ran a one-way system: vehicles entered McLeod Ganj by the Dal Lake road and left by the Forsyth Ganj road (Tribune, 1 January 2025). The 2026 plan is usually announced on 30 or 31 December. Leave the car at your hotel, or book a <Link href="/taxi" className="text-brand-600 underline">taxi</Link> in advance.</span></p>

        <h2 className="mt-12 font-heading text-2xl font-bold text-slate-900">Plan the rest of your New Year trip</h2>
        <p className="mt-3 text-slate-700">Find a room in <Link href="/hotels" className="text-brand-600 underline">Dharamshala and McLeod Ganj hotels</Link>, see the <Link href="/events" className="text-brand-600 underline">events calendar</Link>, check <Link href="/blog/dharamshala-in-winter-snowfall" className="text-brand-600 underline">when it snows</Link>, or add a <Link href="/treks" className="text-brand-600 underline">winter trek</Link> or <Link href="/paragliding" className="text-brand-600 underline">paragliding flight</Link>.</p>

        <h2 className="mt-12 font-heading text-2xl font-bold text-slate-900">Sources</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-600">
          <li>UNI India, 30 September 2026: Kangra Valley Carnival 24-31 December (uniindia.com)</li>
          <li>The Tribune, 1 January 2025: New Year traffic plan and crowds in McLeod Ganj (tribuneindia.com)</li>
          <li>Travel guide listings of New Year venues in McLeod Ganj (checked {CHECKED}); 2026 programmes not yet announced</li>
        </ul>
      </div>

      </div>

      <section className="nye-paper border-t border-[#e9dcc0] py-12">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="mb-6 text-center font-heading text-2xl font-bold text-slate-900">New Year party questions</h2>
          <FAQSection faqs={FAQS} />
        </div>
      </section>
    </div>
  );
}
