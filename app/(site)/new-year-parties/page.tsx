import Link from 'next/link';
import { CalendarDays, MapPin, Clock, Sparkles, Ticket } from 'lucide-react';
import { Breadcrumb, FAQSection } from '@/components/ui/Cards';
import JsonLd from '@/components/seo/JsonLd';
import TicketForm from '@/components/parties/TicketForm';
import { generateSEO, faqSchema, breadcrumbSchema } from '@/lib/seo';
import { siteConfig } from '@/lib/config';
import { PARTIES, partyDateLabel, partyOnSale } from '@/data/parties';

export const revalidate = 300;

export const metadata = generateSEO({
  title: 'New Year & Christmas Parties in McLeod Ganj & Dharamshala 2026',
  description: 'New Year Eve 2026 and Christmas parties in McLeod Ganj and Dharamshala: Panchvati Cottages tickets online, Kangra Valley Carnival 24-31 Dec, venues and tips.',
  path: '/new-year-parties', lang: 'en', ogTag: 'NYE 2026 tickets',
});

const CHECKED = '25 October 2026';

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
  { question: 'Where can I celebrate New Year 2027 in McLeod Ganj or Dharamshala?', answer: 'Book a ticket for the New Year Eve party at Panchvati Cottages in Dharamshala on this page, or choose from the bars, cafes and hotels in McLeod Ganj and Bhagsu that usually host New Year nights. Most venues announce their 2026 programmes and prices in late November or December.' },
  { question: 'When is the Kangra Valley Carnival 2026?', answer: 'The Kangra district administration has announced the Kangra Valley Carnival for 24 to 31 December 2026 in Dharamshala, with an opening concert proposed at the HPCA cricket stadium. The full schedule and entry details were not published when we checked on ' + CHECKED + '.' },
  { question: 'How do I book New Year party tickets at Panchvati Cottages?', answer: 'Choose your ticket type and number of tickets on this page and pay online. Your ticket card with a ticket code reaches your email and WhatsApp right after payment; show it at the entry. If tickets are not on sale yet, WhatsApp us to be told when bookings open.' },
  { question: 'Is McLeod Ganj crowded on New Year Eve?', answer: 'Yes. The week from Christmas to New Year is one of the busiest of the year, with heavy traffic on 30 and 31 December. Book your stay and taxi early, and check the police traffic plan, which is usually announced on 30 or 31 December.' },
  { question: 'Does it snow in McLeod Ganj at New Year?', answer: 'Sometimes, but not every year. Snow in McLeod Ganj itself is occasional in late December and more common in January; the higher villages such as Naddi and Dharamkot see it more often. See our snowfall guide for dated records.' },
  { question: 'Where should I stay for the New Year parties?', answer: 'Stay in McLeod Ganj or Bhagsu to walk to the bars and cafes, or in lower Dharamshala for easier roads and parking, and book early: the last week of December sells out first.' },
];

export default function NewYearPartiesPage() {
  const featured = PARTIES[0];
  const onSale = partyOnSale(featured);
  return (
    <div>
      <JsonLd data={[
        breadcrumbSchema([{ name: 'Home', href: '/' }, { name: 'Events', href: '/events' }, { name: 'New Year parties', href: '/new-year-parties' }]),
        faqSchema(FAQS),
        {
          '@context': 'https://schema.org', '@type': 'Event', name: featured.name,
          startDate: featured.date, eventStatus: 'https://schema.org/EventScheduled', eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
          location: { '@type': 'Place', name: featured.venue, address: { '@type': 'PostalAddress', addressLocality: 'Dharamshala', addressRegion: 'Himachal Pradesh', addressCountry: 'IN' } },
          organizer: { '@id': siteConfig.url + '/#organization' }, url: siteConfig.url + '/new-year-parties', description: featured.summary,
          ...(onSale ? { offers: featured.ticketTypes.map((t) => ({ '@type': 'Offer', name: t.name, price: t.price, priceCurrency: 'INR', availability: 'https://schema.org/InStock', url: siteConfig.url + '/new-year-parties' })) } : {}),
        },
      ]} />

      <section className="bg-[#120a26] text-white">
        <div className="mx-auto max-w-5xl px-4 pb-12 pt-8 sm:px-6">
          <div className="[&_a]:text-white/70 [&_span]:text-white/90 [&_svg]:text-white/50"><Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Events', href: '/events' }, { label: 'New Year parties' }]} /></div>
          <h1 className="font-heading text-3xl font-bold sm:text-5xl">New Year &amp; Christmas Parties in McLeod Ganj &amp; Dharamshala 2026–27</h1>
          <p className="mt-4 max-w-3xl text-lg text-white/80"><strong className="text-white">Short answer:</strong> book the New Year Eve party at <strong className="text-white">Panchvati Cottages, Dharamshala</strong> online below and get your ticket card on WhatsApp and email. The <strong className="text-white">Kangra Valley Carnival</strong> is announced for <strong className="text-white">24 to 31 December 2026</strong>, and McLeod Ganj and Bhagsu bars, cafes and hotels usually announce their Christmas and New Year nights from late November. Checked {CHECKED}.</p>

          <div className="mt-8 grid gap-6 rounded-[28px] border-2 border-[#f2c46d] bg-white/5 p-6 sm:p-8 md:grid-cols-[1fr_1.1fr]">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-[#f2c46d] px-3 py-1 text-sm font-bold text-[#120a26]"><Sparkles className="h-4 w-4" />Featured party</p>
              <h2 className="mt-3 font-heading text-2xl font-bold sm:text-3xl">{featured.name}</h2>
              <p className="mt-2 text-white/80">{featured.summary}</p>
              <ul className="mt-4 space-y-2 text-white/90">
                <li className="flex gap-2"><CalendarDays className="h-5 w-5 shrink-0 text-[#f2c46d]" />{partyDateLabel(featured)}{!featured.startTime && ' (timings coming soon)'}</li>
                <li className="flex gap-2"><MapPin className="h-5 w-5 shrink-0 text-[#f2c46d]" />{featured.venue}, {featured.area}{featured.propertySlug && <> · <Link href={'/hotels/' + featured.propertySlug} className="underline">see the property</Link></>}</li>
                {featured.highlights.map((h) => <li key={h} className="flex gap-2"><Ticket className="h-5 w-5 shrink-0 text-[#f2c46d]" />{h}</li>)}
              </ul>
              <p className="mt-4 text-sm text-white/70">Staying over? Rooms at Panchvati Cottages can be booked on its <Link href={'/hotels/' + (featured.propertySlug || '')} className="underline">property page</Link>.</p>
            </div>
            <TicketForm party={featured.slug} types={featured.ticketTypes} onSale={onSale} />
          </div>
        </div>
      </section>

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

      <section className="bg-slate-50 py-12">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="mb-6 text-center font-heading text-2xl font-bold text-slate-900">New Year party questions</h2>
          <FAQSection faqs={FAQS} />
        </div>
      </section>
    </div>
  );
}
