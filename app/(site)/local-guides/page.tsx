import Link from 'next/link';
import { BadgeCheck, Languages, MapPin, Plus, ShieldCheck } from 'lucide-react';
import { Breadcrumb, FAQSection } from '@/components/ui/Cards';
import JsonLd from '@/components/seo/JsonLd';
import { generateSEO, faqSchema, breadcrumbSchema, itemListSchema } from '@/lib/seo';
import { publishedGuides, type PublicGuide } from '@/lib/guides/store';
import { formatPrice } from '@/lib/utils';

export const revalidate = 600;

export const metadata = generateSEO({
  title: 'Local Guides in McLeod Ganj & Dharamshala (2026)',
  description: 'Book a local guide in McLeod Ganj and Dharamshala for monastery walks, Triund and Kangra temples. Approved guides, languages and day rates shown.',
  path: '/local-guides', lang: 'en', ogTag: 'Local guides',
});

const FAQS = [
  { question: 'How do I hire a local guide in McLeod Ganj?', answer: 'Choose a guide on this page, open their profile and send a request with your date, group size and what you want to see. Dharamshala Stay confirms the guide, the plan and the price with you on WhatsApp before anything is booked.' },
  { question: 'How much does a local guide cost in McLeod Ganj?', answer: 'Each guide sets a day rate, shown on their profile. The final price depends on the plan (a half-day monastery walk, a full-day trek, a Kangra temple tour), the group size and whether transport or permits are needed. You get the full price before you confirm.' },
  { question: 'Do I need a guide for the Triund trek?', answer: 'Many fit walkers do Triund without a guide in good weather. Rules change, though: a Kangra district order of 6 January 2026 made permission from the SP Kangra mandatory for Triund, Kareri and Adi Himani Chamunda and banned trekking above 3,000 m, and in June 2025 the district limited groups to 10 trekkers per guide. A local guide helps with route finding, weather calls and the current rules. Check the latest position before you go.' },
  { question: 'Are the guides verified?', answer: 'Every guide is approved by our team before their profile appears. "Verified by Dharamshala Stay" means we have spoken to the guide and checked their ID. "Registered with HP Tourism" appears only after we have seen their Himachal Tourism guide registration certificate.' },
  { question: 'Which languages do the guides speak?', answer: 'Languages are listed on each profile. Most guides work in Hindi and English; some also guide in Tibetan, Punjabi, Hebrew or European languages.' },
  { question: 'I am a local guide. How do I join?', answer: 'Fill in the free form on /local-guides/register with your experience, languages, areas and day rate. We call you, check your ID and any registration certificate, and publish your profile once approved. Bookings come through Dharamshala Stay, which keeps a 15% commission.' },
];

function GuideCard({ g }: { g: PublicGuide }) {
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <Link href={'/local-guides/' + g.slug} className="block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={g.photo!} alt={`${g.name}, local guide in ${g.areas[0] || 'McLeod Ganj'}`} className="aspect-square w-full object-cover" loading="lazy" />
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-heading text-xl font-bold text-slate-900"><Link href={'/local-guides/' + g.slug} className="hover:underline">{g.name}</Link></h3>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {g.verified && <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700"><BadgeCheck className="h-3.5 w-3.5" />Verified by Dharamshala Stay</span>}
          {g.hp_registration_verified && <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700"><ShieldCheck className="h-3.5 w-3.5" />Registered with HP Tourism</span>}
        </div>
        <dl className="mt-3 space-y-1.5 text-sm text-slate-700">
          <div className="flex gap-2"><dt className="w-24 shrink-0 font-semibold text-slate-900">Experience</dt><dd>{g.experience_years} years</dd></div>
          {g.price_per_day ? <div className="flex gap-2"><dt className="w-24 shrink-0 font-semibold text-slate-900">Day rate</dt><dd>from {formatPrice(g.price_per_day)}</dd></div> : null}
          <div className="flex gap-2"><dt className="w-24 shrink-0 font-semibold text-slate-900"><MapPin className="mr-1 inline h-3.5 w-3.5" />Areas</dt><dd>{g.areas.join(', ')}</dd></div>
          <div className="flex gap-2"><dt className="w-24 shrink-0 font-semibold text-slate-900"><Languages className="mr-1 inline h-3.5 w-3.5" />Languages</dt><dd>{g.languages.join(', ')}</dd></div>
        </dl>
        <div className="mt-3 flex flex-wrap gap-1.5">{g.specializations.map((s) => <span key={s} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">{s}</span>)}</div>
        <Link href={'/local-guides/' + g.slug} className="mt-auto pt-4"><span className="block rounded-lg bg-brand-700 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-brand-800">See profile and book</span></Link>
      </div>
    </article>
  );
}

export default async function LocalGuidesPage() {
  const guides = await publishedGuides();
  return (
    <div>
      <JsonLd data={[
        breadcrumbSchema([{ name: 'Home', href: '/' }, { name: 'Local guides', href: '/local-guides' }]),
        ...(guides.length ? [itemListSchema(guides.map((g) => ({ name: g.name, href: '/local-guides/' + g.slug })))] : []),
        faqSchema(FAQS),
      ]} />
      <section className="bg-brand-900 text-white">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
          <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Local guides' }]} />
          <h1 className="mt-2 font-heading text-3xl font-bold sm:text-4xl">Local Guides in McLeod Ganj &amp; Dharamshala</h1>
          <p className="mt-3 max-w-3xl text-lg text-brand-100"><strong className="text-white">Short answer:</strong> book a local guide for monastery and Tibetan-culture walks in McLeod Ganj, Triund and day treks, or Kangra temple tours. Every guide here is approved by our team; profiles show experience, languages, areas and day rate, and we confirm the guide and the full price with you on WhatsApp before you book.</p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <h2 className="font-heading text-2xl font-bold text-slate-900">Choose a local guide</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {guides.map((g) => <GuideCard key={g.id} g={g} />)}
          {!guides.length && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-700 sm:col-span-2">
              <p className="font-semibold text-slate-900">Our first guides are being checked and will appear here shortly.</p>
              <p className="mt-1">Need a guide now? <Link href="/contact" className="text-brand-600 underline">Message us</Link> with your date and plan, and we will match you with a local guide.</p>
            </div>
          )}
          <Link href="/local-guides/register" className="flex min-h-[180px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 p-5 text-center text-slate-600 hover:border-brand-500 hover:text-brand-700">
            <Plus className="h-8 w-8" />
            <span className="mt-2 font-semibold">Are you a local guide?</span>
            <span className="text-sm">Register free and get bookings</span>
          </Link>
        </div>

        <h2 className="mt-12 font-heading text-2xl font-bold text-slate-900">What should you check before hiring a guide?</h2>
        <table className="mt-4 w-full overflow-hidden rounded-xl bg-white text-sm ring-1 ring-slate-200">
          <tbody className="divide-y divide-slate-100">
            {[
              ['Plan and duration', 'Half day (monastery walk, kora) or full day (Triund, Kangra temples); multi-day treks need camping gear and permits'],
              ['Price', 'Agree the total before you start: guide fee, transport, permits and meals'],
              ['Languages', 'Shown on each profile'],
              ['Trek rules (Kangra)', 'SP Kangra permission for Triund, Kareri and Adi Himani Chamunda; no trekking above 3,000 m (district order, 6 Jan 2026); groups of up to 10 trekkers per guide and registration at check posts (June 2025). Check the current position before you go'],
              ['Badges', '"Verified by Dharamshala Stay": we spoke to the guide and checked ID. "Registered with HP Tourism": we saw the registration certificate'],
            ].map(([k, v]) => <tr key={k}><th scope="row" className="w-44 p-3 text-left align-top font-semibold text-slate-800">{k}</th><td className="p-3 text-slate-700">{v}</td></tr>)}
          </tbody>
        </table>
        <p className="mt-6 text-sm text-slate-600">Plan the day: <Link href="/monasteries-meditation" className="text-brand-600 underline">monasteries and meditation</Link>, <Link href="/blog/things-to-do-in-mcleod-ganj" className="text-brand-600 underline">things to do in McLeod Ganj</Link>, <Link href="/blog/triund-trek-complete-guide" className="text-brand-600 underline">Triund trek guide</Link>, <Link href="/blog/kangra-devi-temples-guide" className="text-brand-600 underline">Kangra temples</Link>, guided <Link href="/treks" className="text-brand-600 underline">treks</Link> and <Link href="/taxi" className="text-brand-600 underline">taxis</Link>.</p>
        <p className="mt-2 text-xs text-slate-500">Sources: <a href="https://www.theweek.in/wire-updates/national/2026/01/06/himachal-kangra-administration-bans-trekking-above-3-000-metres.amp.html" target="_blank" rel="noopener noreferrer" className="underline">The Week (PTI), 6 Jan 2026</a>; <a href="https://www.tribuneindia.com/news/himachal/adventure-meets-accountability" target="_blank" rel="noopener noreferrer" className="underline">The Tribune, June 2025</a>.</p>
      </div>

      <section className="bg-slate-50 py-12">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="mb-6 text-center font-heading text-2xl font-bold text-slate-900">Local guide questions</h2>
          <FAQSection faqs={FAQS} />
        </div>
      </section>
    </div>
  );
}
