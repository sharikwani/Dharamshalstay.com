import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { CalendarDays, MapPin, Check, ExternalLink, ArrowRight, Users, Briefcase, GraduationCap, Heart, Mountain, Wifi, Sun, Bus, Stethoscope, Laptop } from 'lucide-react';
import { Breadcrumb, FAQSection } from '@/components/ui/Cards';
import InquiryForm from '@/components/forms/InquiryForm';
import JsonLd from '@/components/seo/JsonLd';
import { generateSEO, faqSchema, breadcrumbSchema } from '@/lib/seo';
import { placeImage, placeImageAlt, type PlaceImageKey } from '@/lib/place-images';
import { siteConfig } from '@/lib/config';
import { upcomingEvents, eventsChecked, EVENT_STATUS, type DharamshalaEvent } from '@/data/events';

/** Guest-facing planning pages: event packages, groups and offsites, monthly stays. English only. */

const nice = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const dates = (e: Pick<DharamshalaEvent, 'start' | 'end'>) => (e.end && e.end !== e.start ? nice(e.start) + ' to ' + nice(e.end) : nice(e.start));
const ext = (url: string) => (url.startsWith('/') ? {} : { target: '_blank', rel: 'noopener noreferrer' });

function Hero({ image, crumb, h1, answer, children }: { image: PlaceImageKey; crumb: string; h1: string; answer: string; children?: ReactNode }) {
  return (
    <section className="relative min-h-[380px] flex items-end">
      <Image src={placeImage(image)} alt={placeImageAlt(image)} fill className="object-cover" priority sizes="100vw" />
      <div className="absolute inset-0 bg-gradient-to-b from-brand-950/50 to-brand-950/90" />
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pb-10 pt-24 text-white w-full">
        <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: crumb }]} />
        <h1 className="text-3xl sm:text-4xl font-heading font-bold mt-2 max-w-3xl">{h1}</h1>
        <p className="text-brand-100 mt-3 max-w-3xl"><strong className="text-white">Short answer:</strong> {answer}</p>
        {children}
      </div>
    </section>
  );
}

function FactsTable({ rows, caption }: { rows: [string, ReactNode][]; caption: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm bg-white rounded-xl border border-slate-200 overflow-hidden">
        <caption className="text-left font-heading font-semibold text-slate-900 text-lg mb-3">{caption}</caption>
        <tbody className="divide-y divide-slate-100">
          {rows.map(([k, v]) => <tr key={k}><th scope="row" className="text-left p-3 w-1/3 bg-slate-50 font-medium text-slate-700 align-top">{k}</th><td className="p-3 text-slate-700">{v}</td></tr>)}
        </tbody>
      </table>
    </div>
  );
}

function Sources({ items }: { items: { label: string; url: string }[] }) {
  return (
    <section className="max-w-4xl mx-auto px-4 sm:px-6 pb-12">
      <h2 className="font-heading font-semibold text-slate-900 text-lg mb-2">Sources</h2>
      <ul className="text-sm text-slate-600 space-y-1 list-disc pl-5">
        {items.map((s) => <li key={s.url}><a href={s.url} className="underline hover:text-slate-900" {...ext(s.url)}>{s.label}</a></li>)}
      </ul>
    </section>
  );
}

function Related({ links }: { links: { href: string; label: string }[] }) {
  return (
    <div className="flex flex-wrap gap-2 mt-6">
      {links.map((l) => <Link key={l.href} href={l.href} className="inline-flex items-center gap-1 text-sm bg-brand-50 text-brand-800 hover:bg-brand-100 rounded-full px-3 py-1.5">{l.label}<ArrowRight className="h-3 w-3" /></Link>)}
    </div>
  );
}

const placeLd = (name: string, locality = 'McLeod Ganj') => ({
  '@type': 'Place', name,
  address: { '@type': 'PostalAddress', addressLocality: locality, addressRegion: 'Himachal Pradesh', addressCountry: 'IN' },
});

/* ------------------------------------------------------------------ Events */

export const EVENTS_FAQS = [
  { question: 'What is included in a Dharamshala event package?', answer: 'A hotel from our partners near the venue, pickup and drop from Gaggal airport or the Dharamshala bus stand, and local taxi on the days you need it. Treks, paragliding or a monastery day can be added. Each package is quoted for your dates and group, usually within one working day.' },
  { question: 'Are there cricket matches at HPCA Stadium Dharamshala in 2026-27?', answer: 'None are announced. The BCCI 2026-27 home international season (27 September 2026 to 3 March 2027) does not include Dharamshala, and IPL 2027 fixtures are not out yet. Send us an enquiry and we will tell you when a match is announced.' },
  { question: 'When is Losar 2027 in McLeod Ganj?', answer: 'Losar, the Tibetan New Year, is expected on 7 February 2027. The Tibetan calendar of the Men-Tsee-Khang in Dharamshala fixes the date, so confirm nearer the time.' },
  { question: 'Will the Dalai Lama be at the event?', answer: 'Only his official schedule at dalailama.com can say. Events there are listed as subject to change, and he is not always in Dharamshala. We never promise an audience or a seat.' },
  { question: 'When should I book for Christmas and New Year in McLeod Ganj?', answer: 'As early as you can. 24 to 31 December is one of the busiest weeks of the year, and the Kangra Valley Carnival is planned for the same week in 2026.' },
  { question: 'Do I pay to send an enquiry?', answer: 'No. An enquiry is free and you pay nothing until you accept a quote.' },
];

export function eventsMetadata(): Metadata {
  return generateSEO({
    title: 'Dharamshala Events 2026-27: Dates & Stay Packages',
    description: 'Dharamshala and McLeod Ganj events for 2026-27 with checked dates: DIFF, Losar, Long Life Prayer, Navratri, snow season. Hotel + taxi packages quoted.',
    path: '/events', lang: 'en', image: placeImage('tsuglagkhang'), ogTag: 'Events',
  });
}

export function EventsView() {
  const events = upcomingEvents();
  const exact = events.filter((e) => e.status !== 'usual' || e.id.startsWith('dalai-lama-birthday'));
  return (
    <>
      <JsonLd data={[
        breadcrumbSchema([{ name: 'Home', href: '/' }, { name: 'Events', href: '/events' }]),
        ...exact.map((e) => ({
          '@context': 'https://schema.org', '@type': 'Event', name: e.name, description: e.summary,
          startDate: e.start, endDate: e.end || e.start, eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
          eventStatus: 'https://schema.org/EventScheduled', location: placeLd(e.venue, e.venue.includes('Dharamshala') ? 'Dharamshala' : 'McLeod Ganj'),
          image: siteConfig.url + placeImage(e.image), url: siteConfig.url + '/events#' + e.id,
          ...(e.organizer ? { organizer: { '@type': 'Organization', name: e.organizer } } : {}),
          // Free public events say so; ticketed ones without a published price get no offer rather than a guessed one.
          ...(e.free ? { isAccessibleForFree: true, offers: { '@type': 'Offer', price: 0, priceCurrency: 'INR', availability: 'https://schema.org/InStock', url: siteConfig.url + '/events#' + e.id } } : {}),
        })),
        faqSchema(EVENTS_FAQS),
      ]} />
      <Hero image="tsuglagkhang" crumb="Events" h1="Dharamshala Events 2026-27: Dates and Stay Packages"
        answer={`The next big events in Dharamshala are ${events.slice(0, 3).map((e) => e.name.replace(/ \(.*\)| 20\d\d$/g, '') + ' (' + nice(e.start) + ')').join(', ')}. We put together the hotel, airport or bus pickup and local taxi for each one, quoted for your dates. Dates below are checked against official sources, and we say clearly which ones are not confirmed yet.`} />

      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <Link href="/new-year-parties" className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#120a26] px-5 py-4 text-white hover:bg-[#1d1236]">
          <span><span className="block font-heading text-lg font-bold text-[#f2c46d]">New Year party in Dharamshala 2026: tickets open</span>
            <span className="text-sm text-white/80">NYE Gala Night at Panchvati Cottages, 31 December, gates 7 pm. Book online with 5% off, from ₹500.</span></span>
          <span className="rounded-full bg-[#f2c46d] px-4 py-2 text-sm font-bold text-[#120a26]">See tickets</span>
        </Link>
        <h2 className="text-2xl font-heading font-bold text-slate-900">What events are coming up in Dharamshala?</h2>
        <p className="text-sm text-slate-500 mt-1">Dates checked {nice(eventsChecked)}. Confirmed = announced by the organiser; Expected = from published calendars, not yet announced.</p>
        <div className="overflow-x-auto mt-5">
          <table className="w-full text-sm bg-white border border-slate-200 rounded-xl overflow-hidden">
            <thead className="bg-brand-900 text-white"><tr><th className="text-left p-3">Event</th><th className="text-left p-3">Dates</th><th className="text-left p-3">Where</th><th className="text-left p-3">Status</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {events.map((e) => <tr key={e.id}><td className="p-3 font-medium"><a href={'#' + e.id} className="hover:text-brand-700">{e.name}</a></td><td className="p-3 whitespace-nowrap">{dates(e)}</td><td className="p-3">{e.venue}</td><td className="p-3"><span className={'whitespace-nowrap text-xs font-semibold rounded-full px-2 py-0.5 ' + EVENT_STATUS[e.status].cls}>{EVENT_STATUS[e.status].label}</span></td></tr>)}
            </tbody>
          </table>
        </div>

        <div className="mt-10 space-y-8">
          {events.map((e) => (
            <article key={e.id} id={e.id} className="scroll-mt-24 grid md:grid-cols-[280px_1fr] gap-5 rounded-2xl border border-slate-200 bg-white overflow-hidden">
              <div className="relative h-48 md:h-full min-h-[180px]"><Image src={placeImage(e.image)} alt={placeImageAlt(e.image)} fill className="object-cover" sizes="(min-width: 768px) 280px, 100vw" /></div>
              <div className="p-5 md:pl-0">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className={'font-semibold rounded-full px-2.5 py-1 ' + EVENT_STATUS[e.status].cls}>{EVENT_STATUS[e.status].label}</span>
                  <span className="inline-flex items-center gap-1 text-slate-600"><CalendarDays className="h-3.5 w-3.5" />{dates(e)}</span>
                </div>
                <h3 className="font-heading font-bold text-xl text-slate-900 mt-2">{e.name}</h3>
                <p className="text-sm text-slate-600 mt-1 flex gap-1"><MapPin className="h-4 w-4 shrink-0 mt-0.5 text-brand-600" />{e.venue}. {e.where}.</p>
                <p className="text-slate-700 mt-3 leading-relaxed">{e.summary}</p>
                <div className="mt-4 rounded-xl bg-brand-50 p-4">
                  <p className="font-semibold text-slate-900">{e.pack.title} package <span className="font-normal text-slate-600">· {e.pack.nights}</span></p>
                  <ul className="mt-2 grid sm:grid-cols-2 gap-1.5 text-sm text-slate-700">{e.pack.includes.map((x) => <li key={x} className="flex gap-2"><Check className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />{x}</li>)}</ul>
                  <a href={'#enquire'} className="inline-flex items-center gap-1 mt-3 text-sm font-semibold text-orange-700 hover:underline">Get a quote for this <ArrowRight className="h-3.5 w-3.5" /></a>
                </div>
                {e.note && <p className="text-xs text-slate-500 mt-3">{e.note}</p>}
                <p className="text-xs text-slate-500 mt-2">Source: {e.sources.map((s, i) => <span key={s.url}>{i > 0 && ', '}<a href={s.url} className="underline" {...ext(s.url)}>{s.label}{!s.url.startsWith('/') && <ExternalLink className="inline h-3 w-3 ml-0.5" />}</a></span>)}{e.page && <> · <Link href={e.page} className="text-brand-600 underline">Our guide</Link></>}</p>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-slate-200 p-5 bg-slate-50">
          <h2 className="font-heading font-bold text-xl text-slate-900">Is there cricket at HPCA Stadium this season?</h2>
          <p className="text-slate-700 mt-2">Not yet. The BCCI 2026-27 home international season runs 27 September 2026 to 3 March 2027 across 17 cities, and Dharamshala is not one of them. IPL 2027 fixtures are not announced. Stadium visitor tours have been closed since 4 May 2026. Tell us in the form that you want a match package and we will write to you when fixtures are out.</p>
          <Related links={[{ href: '/blog/hpca-cricket-stadium-guide', label: 'HPCA Stadium guide' }]} />
        </div>
      </section>

      <section id="enquire" className="bg-slate-50 py-12 scroll-mt-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-10">
          <div>
            <h2 className="text-2xl font-heading font-bold text-slate-900">How do I book an event package?</h2>
            <ol className="mt-4 space-y-3 text-slate-700 list-decimal pl-5">
              <li>Send the form with the event, your dates and how many of you are coming.</li>
              <li>We reply with two or three hotel options and the taxi plan, with full prices, usually within one working day.</li>
              <li>Pick one and book online. Hotel, pickup and taxi are confirmed to you on email and WhatsApp.</li>
            </ol>
            <Related links={[{ href: '/hotels', label: 'Hotels' }, { href: '/taxi', label: 'Taxis' }, { href: '/treks', label: 'Treks' }, { href: '/travel-updates', label: 'Travel updates' }, { href: '/groups', label: 'Coming as a group?' }]} />
          </div>
          <InquiryForm type="general" contextNote="Event package" withDates
            title="Get an event package quote" subtitle="Free, no obligation. We reply within one working day."
            messagePlaceholder="Which event? Budget per night, hotel area you prefer, arriving by flight or bus?"
            submitLabel="Get my quote" />
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <h2 className="text-2xl font-heading font-bold text-slate-900 text-center mb-6">Event package questions</h2>
        <FAQSection faqs={EVENTS_FAQS} />
      </section>
      <Sources items={[
        ...events.flatMap((e) => e.sources).filter((s, i, a) => !s.url.startsWith('/') && a.findIndex((x) => x.url === s.url) === i),
        { label: 'BCCI: Team India home season 2026-27 fixtures', url: 'https://www.bcci.tv/articles/2026/news/55556333/fixtures-unveiled-for-team-india-s-international-home-season-2026-27' },
      ]} />
    </>
  );
}

/* ------------------------------------------------------------------ Groups */

const GROUP_SIZES = [{ value: 10, label: '10-20 people' }, { value: 20, label: '20-40 people' }, { value: 40, label: '40-80 people' }, { value: 80, label: '80+ people' }, { value: 6, label: 'Under 10' }];

const GROUP_TYPES = [
  { icon: Briefcase, title: 'Corporate offsites', body: 'Meeting room or ballroom, team rooms in one hotel, a trek or paragliding day, and every transfer handled.' },
  { icon: GraduationCap, title: 'School and college trips', body: 'Safe, simple stays, buses that know the hill roads, monasteries, the Tibet Museum, Kangra Fort and a short nature walk.' },
  { icon: Heart, title: 'Weddings and family functions', body: 'Rooms for both families, a venue with a view, and taxis between hotels, the venue and the airport.' },
  { icon: Mountain, title: 'Friends and trek groups', body: 'Triund overnight with camping, Kareri Lake, or Bir Billing paragliding, with a guide and stays either side.' },
  { icon: Users, title: 'Yoga and meditation retreats', body: 'Quiet hotels in Dharamkot or Naddi, a practice space, and visits to Tushita, Norbulingka and the main temple.' },
];

export const GROUPS_FAQS = [
  { question: 'Which hotels in Dharamshala can host a corporate offsite?', answer: 'The largest is Hyatt Regency Dharamshala Resort, whose pillarless ballroom seats up to about 300, with smaller meeting rooms and boardrooms. Several hotels have halls for 20 to 120 people. We check the current capacity and dates with each hotel for your group.' },
  { question: 'Can a big group do the Triund trek?', answer: 'Yes, with a registered local guide. The forest department fee was cut to Rs 100 per person per day in January 2024 and the tent fee to Rs 550 for two; it is collected at the Gallu check post. Confirm the fee there on the day, as some sources still quote older amounts.' },
  { question: 'How do you move a group around Dharamshala?', answer: 'Tempo Travellers and small buses for the main roads, and Innovas or similar for the narrow lanes to Dharamkot, Bhagsu and Naddi, where big buses cannot go.' },
  { question: 'How far ahead should a group book?', answer: 'Four to eight weeks for most groups, and longer for Christmas and New Year, Diwali, long weekends and May-June, when the best hotels fill first.' },
  { question: 'Do you charge for planning?', answer: 'No. The quote shows the price for each hotel, vehicle and activity, and you pay only for what you book.' },
  { question: 'Can we visit Norbulingka Institute as a group?', answer: 'Yes. It is in Sidhpur, below Dharamshala. Its official site lists entry at Rs 50 for Indian visitors and opening until 5:30 pm. Photography is not allowed inside the temple.' },
];

export function groupsMetadata(): Metadata {
  return generateSEO({
    title: 'Group Trips & Corporate Offsites in Dharamshala 2026',
    description: 'Corporate offsites, school trips, weddings and trek groups in Dharamshala: hotels for 10-300, transport and activities in one quote.',
    path: '/groups', lang: 'en', image: placeImage('triund'), ogTag: 'Groups',
  });
}

export function GroupsView() {
  return (
    <>
      <JsonLd data={[
        breadcrumbSchema([{ name: 'Home', href: '/' }, { name: 'Groups and offsites', href: '/groups' }]),
        { '@context': 'https://schema.org', '@type': 'Service', name: 'Group trips and corporate offsites in Dharamshala', serviceType: 'Group travel planning',
          provider: { '@id': siteConfig.url + '/#organization' }, areaServed: placeLd('Dharamshala and McLeod Ganj', 'Dharamshala'), url: siteConfig.url + '/groups' },
        faqSchema(GROUPS_FAQS),
      ]} />
      <Hero image="triund" crumb="Groups and offsites" h1="Group Trips and Corporate Offsites in Dharamshala"
        answer="We plan stays for groups of 10 to 300 in Dharamshala and McLeod Ganj: hotels, meeting space, transport and activities in one quote. The largest venue, Hyatt Regency Dharamshala Resort, seats up to about 300 in its ballroom; most groups fit in hotels of 20-40 rooms. Tell us your dates and group size and we reply within one working day." />

      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <h2 className="text-2xl font-heading font-bold text-slate-900">What kind of groups do you plan for?</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-6">
          {GROUP_TYPES.map((g) => (
            <div key={g.title} className="rounded-xl border border-slate-200 p-5 bg-white">
              <g.icon className="h-6 w-6 text-brand-600" />
              <h3 className="font-heading font-semibold text-slate-900 mt-3">{g.title}</h3>
              <p className="text-sm text-slate-600 mt-1 leading-relaxed">{g.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-4 sm:px-6 pb-10">
        <FactsTable caption="Group planning: quick facts" rows={[
          ['Largest venue', 'Hyatt Regency Dharamshala Resort ballroom, up to about 300 (Hyatt). Most other halls take 20-120.'],
          ['Group activities', <>Triund trek, Kareri Lake, Bir Billing paragliding (about 65 km, 2-2.5 h), monastery day, Tibet Museum, Kangra Fort, Norbulingka</>],
          ['Triund forest fee', 'Rs 100 per person per day; tent Rs 550 for two (Tribune, Jan 2024). Paid at Gallu.'],
          ['Norbulingka Institute', 'Sidhpur; entry Rs 50 for Indians; open until 5:30 pm (official site)'],
          ['Getting the group here', 'Gaggal (Kangra) airport, about 13-15 km from Dharamshala; Volvo buses from Delhi in about 10-13 hours; Pathankot railway station, about 90 km'],
          ['Best months', 'March to June and September to November. Avoid July-August monsoon for treks.'],
          ['Book ahead', '4-8 weeks; earlier for December, Diwali and May-June'],
        ]} />
        <Related links={[{ href: '/blog/triund-trek-complete-guide', label: 'Triund trek guide' }, { href: '/paragliding', label: 'Paragliding' }, { href: '/monasteries-meditation', label: 'Monasteries' }, { href: '/hotels', label: 'Hotels' }, { href: '/taxi', label: 'Taxis' }, { href: '/events', label: 'Event packages' }]} />
      </section>

      <section id="enquire" className="bg-slate-50 py-12 scroll-mt-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-10">
          <div>
            <h2 className="text-2xl font-heading font-bold text-slate-900">How does group booking work?</h2>
            <ol className="mt-4 space-y-3 text-slate-700 list-decimal pl-5">
              <li>Tell us the group size, dates, budget and what the trip is for.</li>
              <li>We send a plan with hotel options, rooms, transport and activities, each priced.</li>
              <li>One person from our team looks after the group from booking to the last drop.</li>
            </ol>
          </div>
          <InquiryForm type="general" contextNote="Group or offsite" withDates groupSizes={GROUP_SIZES}
            title="Plan a group trip" subtitle="Free plan and quote within one working day."
            messagePlaceholder="Company, school or occasion. Rooms needed, meeting room, activities, budget per person"
            submitLabel="Get a group quote" />
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <h2 className="text-2xl font-heading font-bold text-slate-900 text-center mb-6">Group trip questions</h2>
        <FAQSection faqs={GROUPS_FAQS} />
      </section>
      <Sources items={[
        { label: 'Hyatt Regency Dharamshala Resort: meetings and events', url: 'https://www.hyatt.com/hyatt-regency/en-US/dhmrm-hyatt-regency-dharamshala-resort/meetings' },
        { label: 'The Tribune: Triund trekking fee halved (15 Jan 2024)', url: 'https://www.tribuneindia.com/news/himachal/himachal-pradesh-forest-dept-slashes-triund-trekking-fee-by-half-581249' },
        { label: 'Norbulingka Institute', url: 'https://norbulingka.org/' },
        { label: 'Kangra district: Norbulingka Institute', url: 'https://hpkangra.nic.in/tourist-place/norbolingka-institute-and-doll-museum/' },
      ]} />
    </>
  );
}

/* ------------------------------------------------------------------ Monthly stays */

export const WORKATION_FAQS = [
  { question: 'Is Dharamshala good for a workation?', answer: 'Yes, for most of the year. Dharamkot, Bhagsu and McLeod Ganj have fibre broadband and many cafes with wifi, life is cheaper than in big cities, and the mountains are on your doorstep. Plan around the July-August monsoon, when rain is heavy and power and roads can be cut.' },
  { question: 'Is the internet fast enough to work from Dharamshala?', answer: 'In most hotels and homestays with fibre, yes: Airtel and Jio fibre is sold in Dharamkot and McLeod Ganj. Mobile data is fine outdoors but can be weak indoors. Always ask the hotel for a speed test screenshot and a power backup before you book a month, which we do for you.' },
  { question: 'Which area is best for a long stay?', answer: 'Dharamkot for a quiet village with cafes; Bhagsu for cafes and walks; McLeod Ganj for everything within walking distance; Naddi for views and silence; lower Dharamshala and Sidhbari for flatter roads, bigger rooms and lower prices.' },
  { question: 'What is the best time for a monthly stay?', answer: 'March to June and late September to November: mild days and clear views. December to February is cold (lows near 0 C) but quiet and bright. July and August get most of the year’s rain.' },
  { question: 'Do hotels give monthly rates?', answer: 'Many of our partner hotels and homestays do, below their nightly price. Tell us your dates, budget and must-haves and we will get monthly quotes for you.' },
  { question: 'Is there a hospital nearby?', answer: 'Zonal Hospital Dharamshala handles emergencies. Tibetan Delek Hospital at Gangchen Kyishong runs a morning OPD (9 am to 12 noon on its official site) and refers emergencies to the Zonal Hospital.' },
];

export function workationMetadata(): Metadata {
  return generateSEO({
    title: 'Monthly Stays & Workation in Dharamshala 2026',
    description: 'Monthly stays in Dharamkot, Bhagsu, McLeod Ganj and Naddi: wifi, best months, areas and monthly rates from local hotels and homestays.',
    path: '/workation', lang: 'en', image: placeImage('dharamkot'), ogTag: 'Monthly stays',
  });
}

const AREAS = [
  { name: 'Dharamkot', body: 'Quiet hill village above McLeod Ganj: cafes, yoga, forest walks and the start of the Triund trail. Steep lanes, few cars.' },
  { name: 'Bhagsu', body: 'Busy cafe strip by the waterfall and temple, 2 km from McLeod Ganj. Lively in season, easy to find people to work alongside.' },
  { name: 'McLeod Ganj', body: 'Everything within walking distance: shops, temples, restaurants, taxis. Noisier, especially on weekends.' },
  { name: 'Naddi', body: 'Big Dhauladhar views and silence, about 3 km beyond McLeod Ganj. Fewer cafes; you will want a scooter or taxis.' },
  { name: 'Lower Dharamshala and Sidhbari', body: 'Flatter roads, bigger rooms, markets and hospitals close by, usually lower prices. 20-30 minutes to McLeod Ganj.' },
];

export function WorkationView() {
  return (
    <>
      <JsonLd data={[
        breadcrumbSchema([{ name: 'Home', href: '/' }, { name: 'Monthly stays', href: '/workation' }]),
        { '@context': 'https://schema.org', '@type': 'Service', name: 'Monthly stays and workations in Dharamshala', serviceType: 'Long-stay accommodation',
          provider: { '@id': siteConfig.url + '/#organization' }, areaServed: placeLd('Dharamshala and McLeod Ganj', 'Dharamshala'), url: siteConfig.url + '/workation' },
        faqSchema(WORKATION_FAQS),
      ]} />
      <Hero image="dharamkot" crumb="Monthly stays" h1="Monthly Stays and Workations in Dharamshala (2026)"
        answer="Dharamkot, Bhagsu, McLeod Ganj and Naddi are the favourite bases for a month or more in Dharamshala: fibre broadband is available, many cafes have wifi and monthly rates are lower than nightly ones. The best months are March to June and late September to November; July-August is monsoon. Tell us your dates and budget and we get monthly quotes from local hotels and homestays." />

      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-10 grid lg:grid-cols-[1fr_360px] gap-10">
        <div>
          <h2 className="text-2xl font-heading font-bold text-slate-900">Which area should I stay in for a month?</h2>
          <div className="mt-5 space-y-3">
            {AREAS.map((a) => <div key={a.name} className="rounded-xl border border-slate-200 p-4 bg-white"><h3 className="font-heading font-semibold text-slate-900">{a.name}</h3><p className="text-sm text-slate-600 mt-1">{a.body}</p></div>)}
          </div>
          <h2 className="text-2xl font-heading font-bold text-slate-900 mt-10">What do we check before you book a month?</h2>
          <ul className="mt-4 grid sm:grid-cols-2 gap-3 text-sm text-slate-700">
            {[
              [Wifi, 'A recent speed test from the room, and whether there is a second connection'],
              [Sun, 'Power backup (inverter or generator) for monsoon and winter cuts'],
              [Laptop, 'A real desk and chair, and heating from November to February'],
              [Check, 'The monthly price in writing, including electricity, cleaning and laundry'],
            ].map(([I, t]: any) => <li key={t} className="flex gap-2 rounded-lg bg-slate-50 p-3"><I className="h-4 w-4 text-brand-600 mt-0.5 shrink-0" />{t}</li>)}
          </ul>
        </div>
        <div className="space-y-4">
          <FactsTable caption="Long stay: quick facts" rows={[
            ['Best months', 'Mar-Jun, late Sep-Nov'],
            ['Monsoon', 'July-August, heavy rain (232 mm fell in one day on 14 Sep 2025)'],
            ['Winter', 'Dec-Feb, lows near 0 C, some snow up high'],
            ['Internet', 'Airtel and Jio fibre in Dharamkot and McLeod Ganj; 4G/5G outdoors'],
            ['From Delhi', 'Volvo bus about 10-13 h; flights to Gaggal (Kangra) airport'],
            ['Health', 'Zonal Hospital Dharamshala; Delek Hospital OPD 9 am-12 noon'],
          ]} />
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-6">
        <Related links={[{ href: '/blog/dharamshala-for-digital-nomads', label: 'Digital nomad guide' }, { href: '/blog/dharamkot-travel-guide', label: 'Dharamkot guide' }, { href: '/blog/where-to-stay-in-dharamshala', label: 'Where to stay' }, { href: '/blog/best-time-to-visit-dharamshala', label: 'Best time to visit' }, { href: '/blog/how-to-reach-dharamshala', label: 'How to reach' }, { href: '/hotels', label: 'Hotels' }, { href: '/taxi', label: 'Airport taxi' }]} />
      </section>

      <section id="enquire" className="bg-slate-50 py-12 scroll-mt-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-10">
          <div>
            <h2 className="text-2xl font-heading font-bold text-slate-900">How do I get a monthly rate?</h2>
            <ol className="mt-4 space-y-3 text-slate-700 list-decimal pl-5">
              <li>Send your dates, budget per month and what you need (desk, kitchen, quiet, pets).</li>
              <li>We ask our partner hotels and homestays and send you 3-5 options with photos and the monthly price in writing.</li>
              <li>Book the first month online; pay the rest as agreed with the hotel.</li>
            </ol>
            <p className="text-sm text-slate-600 mt-4 flex gap-2"><Bus className="h-4 w-4 mt-0.5 shrink-0 text-brand-600" />We can also book your pickup from Gaggal airport or the bus stand.</p>
            <p className="text-sm text-slate-600 mt-2 flex gap-2"><Stethoscope className="h-4 w-4 mt-0.5 shrink-0 text-brand-600" />Staying with a health need? Tell us and we will look for places near the hospitals.</p>
          </div>
          <InquiryForm type="general" contextNote="Monthly stay / workation" withDates
            title="Get monthly stay quotes" subtitle="Free. 3-5 options within two working days."
            messagePlaceholder="Budget per month, area you like, must-haves (desk, kitchen, heating, quiet, pets)"
            submitLabel="Get monthly quotes" />
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <h2 className="text-2xl font-heading font-bold text-slate-900 text-center mb-6">Monthly stay questions</h2>
        <FAQSection faqs={WORKATION_FAQS} />
      </section>
      <Sources items={[
        { label: 'JioFiber: Dharamkot service page', url: 'https://www.jio.com/fiber/en-in/wifi-service-provider/dharamkot/' },
        { label: 'The Week: Himachal weather, 14 Sep 2025', url: 'https://www.theweek.in/wire-updates/national/2025/09/14/des73-hp-weather.html' },
        { label: 'Tibetan Delek Hospital', url: 'https://delekhospital.org/' },
        { label: 'Climate of Himachal Pradesh (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Climate_of_Himachal_Pradesh' },
      ]} />
    </>
  );
}
