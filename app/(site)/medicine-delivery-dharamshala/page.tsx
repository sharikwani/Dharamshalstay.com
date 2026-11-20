import Link from 'next/link';
import { Ban, Clock, IndianRupee, MapPin, Moon, Phone, ShieldCheck, Siren, Stethoscope, Truck, FileCheck2 } from 'lucide-react';
import { Breadcrumb, FAQSection } from '@/components/ui/Cards';
import JsonLd from '@/components/seo/JsonLd';
import { generateSEO, faqSchema } from '@/lib/seo';
import { siteConfig } from '@/lib/config';
import { photoCredits } from '@/data/photo-credits';
import MedicineRequestForm from '@/components/medicine/MedicineRequestForm';
import { DELIVERY_HOURS, MEDICINE_AREAS } from '@/lib/medicine/options';

const UPDATED = '20 November 2026';
const UPDATED_ISO = '2026-11-20';
const AREAS = MEDICINE_AREAS.filter((a) => a !== 'Other');
const AREA_LIST = AREAS.slice(0, -1).join(', ') + ' and ' + AREAS[AREAS.length - 1];
const H = DELIVERY_HOURS;
const PATH = '/medicine-delivery-dharamshala';
const MEDICINE_PHOTO ='/images/places/medicine-delivery.jpg';
const PHOTO = photoCredits['medicine-delivery'];
const PHOTO_ALT = PHOTO?.alt || 'Strips of tablets and capsules ready for emergency delivery in Dharamshala';

export const metadata = generateSEO({
  title: 'Medicine Delivery in Dharamshala 2026 (Emergency Only)',
  description: `Emergency medicine delivery in Dharamshala with a doctor prescription. Free ${H.freeFrom}-${H.freeUntil}, Rs ${H.lateCharge} extra until ${H.lateUntil}. Pay by UPI or cash.`,
  path: PATH, lang: 'en', image: MEDICINE_PHOTO, ogTag: 'Emergency medicines',
  modifiedTime: UPDATED_ISO,
  keywords: ['medicine delivery Dharamshala', 'medicine home delivery Dharamshala', 'emergency medicine Dharamshala', 'pharmacy delivery Kangra', 'chemist Dharamshala'],
});

const FAQS = [
  { question: 'Is there medicine home delivery in Dharamshala?', answer: `Yes, for emergencies. Dharamshala Stay works with a licensed partner chemist who delivers emergency medicines to ${AREA_LIST}. You send the doctor prescription through our form, we confirm it with the doctor by phone, and then the chemist delivers.` },
  { question: 'How much does medicine delivery cost in Dharamshala?', answer: `Delivery is free between ${H.freeFrom} and ${H.freeUntil}. Between ${H.freeUntil} and ${H.lateUntil} there is an extra charge of Rs ${H.lateCharge} on every delivery. You pay for the medicines and any delivery charge to the delivery person, by UPI or cash.` },
  { question: 'Do I need a prescription?', answer: 'Yes, always. We deliver only against a valid prescription from a registered doctor, and we call the doctor or clinic to confirm it before anything is delivered. Requests without a prescription, or where the doctor cannot be reached, are not delivered.' },
  { question: 'Which areas do you deliver to?', answer: `${AREA_LIST}. If you are somewhere else in or near Dharamshala, choose "Somewhere else" on the form and we will tell you whether the chemist can reach you.` },
  { question: 'Which medicines can you not deliver?', answer: 'We do not deliver Schedule X or other controlled medicines (strong painkillers, sleeping pills, tranquillisers, codeine cough syrups), anything without a prescription, or routine monthly stock. The service is only for urgent needs.' },
  { question: 'How fast will the medicines arrive?', answer: 'It depends on how quickly we can reach your doctor and on stock at the chemist, so we do not promise a fixed time. We call you as soon as your request comes in. Requests sent after 10 pm are handled from 10 am the next morning.' },
  { question: 'What should I do in a medical emergency?', answer: 'Medicine delivery is not an emergency service. If someone is seriously ill or injured, call 108 for an ambulance or 112 for all emergencies, or go to Zonal Hospital in Dharamshala town or Delek Hospital at Gangchen Kyishong (01892 222053, emergency 24x7).' },
  { question: 'Is my prescription kept private?', answer: 'Yes. Only our team can open it, it is shared only with the partner chemist for your order, and the file is deleted 30 days after your request.' },
];

const SOURCES = [
  { label: 'Delek Hospital, Emergency Service (Gangchen Kyishong, Dharamshala)', href: 'https://delekhospital.org/departments/emergency-service/' },
  { label: 'Khaitan & Co: doorstep delivery of drugs by licensed retailers (Health Ministry notification, 26 March 2020)', href: 'https://www.khaitanco.com/thought-leaderships/Legitimising-the-doorstep-delivery-of-drugs-a-critical-analysis' },
];

const STEPS = [
  { icon: FileCheck2, title: 'Send the request', text: 'Patient details, the medicines and a photo or PDF of the prescription.' },
  { icon: Phone, title: 'We call you back', text: 'We check that it is genuine and urgent.' },
  { icon: Stethoscope, title: 'We call the doctor', text: 'No confirmed prescription, no delivery.' },
  { icon: Truck, title: 'The chemist delivers', text: 'You pay on delivery, by UPI or cash.' },
];

const FACTS: [string, string][] = [
  ['Who delivers', 'A licensed partner chemist, arranged by Dharamshala Stay'],
  ['What', 'Emergency medicines only, against a doctor prescription we confirm by phone'],
  ['Areas', AREA_LIST],
  ['Free delivery', `${H.freeFrom} to ${H.freeUntil}`],
  ['Evening delivery', `${H.freeUntil} to ${H.lateUntil}: Rs ${H.lateCharge} extra per delivery`],
  [`After ${H.lateUntil}`, `Handled from ${H.freeFrom} the next morning; call 108 if it cannot wait`],
  ['Payment', `${H.payment}; nothing is paid online`],
  ['Not delivered', 'Schedule X and controlled medicines, anything without a prescription'],
];

const pageSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  '@id': siteConfig.url + PATH + '#webpage',
  url: siteConfig.url + PATH,
  name: 'Medicine delivery in Dharamshala (emergency only)',
  description: `Emergency medicine delivery in Dharamshala against a doctor prescription, to ${AREA_LIST}. Free ${H.freeFrom}-${H.freeUntil}, Rs ${H.lateCharge} extra until ${H.lateUntil}; UPI or cash on delivery.`,
  dateModified: UPDATED_ISO,
  inLanguage: 'en-IN',
  isPartOf: { '@id': siteConfig.url + '/#website' },
  primaryImageOfPage: {
    '@type': 'ImageObject',
    url: siteConfig.url + MEDICINE_PHOTO,
    width: 1600, height: 1172,
    caption: PHOTO_ALT,
    ...(PHOTO ? { creditText: PHOTO.author, license: PHOTO.license_url, acquireLicensePage: PHOTO.source, creator: { '@type': 'Person', name: PHOTO.author } } : {}),
  },
};

export default function MedicineDeliveryPage() {
  return (
    <div className="bg-white">
      <JsonLd data={faqSchema(FAQS)} />
      <JsonLd data={pageSchema} />

      {/* Hero: the answer people search for, next to the photo Google can show beside the result. */}
      <section className="bg-gradient-to-b from-emerald-50 to-white">
        <div className="mx-auto max-w-6xl px-4 pb-10 pt-6 sm:px-6 lg:pb-14">
          <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Medicine delivery in Dharamshala' }]} />
          <div className="mt-4 grid grid-cols-1 items-center gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-12">
            <div className="order-2 lg:order-1">
              <h1 className="font-heading text-4xl font-bold leading-[1.1] text-emerald-950 sm:text-5xl">Medicine delivery in Dharamshala</h1>
              <p className="mt-2 text-lg font-semibold text-emerald-700">Emergency medicines, checked with your doctor</p>
              <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-slate-700"><strong>Short answer:</strong> a licensed partner chemist working with Dharamshala Stay delivers emergency medicines to {AREA_LIST}. Send the patient details and the doctor prescription below; we confirm it with the doctor by phone, then the chemist delivers. You pay on delivery by UPI or cash.</p>
              <ul className="mt-6 flex flex-wrap gap-2.5 text-sm">
                <li className="flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 font-semibold text-emerald-900 ring-1 ring-emerald-900/10"><Clock className="h-4 w-4 text-emerald-600" aria-hidden />Free {H.freeFrom} to {H.freeUntil}</li>
                <li className="flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 font-semibold text-emerald-900 ring-1 ring-emerald-900/10"><Moon className="h-4 w-4 text-emerald-600" aria-hidden />Rs {H.lateCharge} extra {H.freeUntil} to {H.lateUntil}</li>
                <li className="flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 font-semibold text-emerald-900 ring-1 ring-emerald-900/10"><IndianRupee className="h-4 w-4 text-emerald-600" aria-hidden />UPI or cash on delivery</li>
              </ul>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <a href="#request" className="rounded-2xl bg-emerald-700 px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-emerald-900/20 transition hover:bg-emerald-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-600/30">Request medicines</a>
                <span className="text-sm text-slate-500">Updated {UPDATED}</span>
              </div>
            </div>
            <figure className="order-1 lg:order-2">
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={MEDICINE_PHOTO} alt={PHOTO_ALT} width={1600} height={1172} fetchPriority="high" decoding="async"
                  className="aspect-[4/3] w-full rounded-[28px] object-cover shadow-[0_30px_60px_-30px_rgba(6,78,59,0.55)] lg:aspect-[5/4]" />
                <span className="absolute -bottom-4 left-5 flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-emerald-900 shadow-lg ring-1 ring-emerald-900/10">
                  <ShieldCheck className="h-5 w-5 text-emerald-600" aria-hidden />Prescription checked before delivery
                </span>
              </div>
              {PHOTO && <figcaption className="mt-7 text-xs text-slate-400">Photo: {PHOTO.author}, <a href={PHOTO.source} target="_blank" rel="noopener noreferrer" className="underline">{PHOTO.license}</a></figcaption>}
            </figure>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col gap-2 rounded-2xl bg-red-50 px-5 py-4 text-red-900 ring-1 ring-red-200 sm:flex-row sm:items-center sm:gap-4">
          <Siren className="h-6 w-6 shrink-0 text-red-600" aria-hidden />
          <p className="text-sm sm:text-base"><strong>Life-threatening emergency?</strong> Do not wait for a delivery. Call <a href="tel:108" className="font-bold underline">108</a> for an ambulance or <a href="tel:112" className="font-bold underline">112</a> for all emergencies.</p>
        </div>

        <section className="mt-14">
          <h2 className="font-heading text-2xl font-bold text-emerald-950 sm:text-3xl">How does emergency medicine delivery work?</h2>
          <ol className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="relative rounded-2xl border border-emerald-900/10 p-4 sm:p-5">
                <span className="text-sm font-bold text-emerald-600">Step {i + 1}</span>
                <s.icon className="mt-2 h-6 w-6 text-emerald-700 sm:mt-3 sm:h-7 sm:w-7" aria-hidden />
                <p className="mt-3 font-semibold text-slate-900">{s.title}</p>
                <p className="mt-1 text-sm text-slate-600">{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-14 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
          <MedicineRequestForm />
          <aside className="space-y-5 lg:sticky lg:top-24">
            <div className="rounded-2xl bg-emerald-950 p-6 text-emerald-50">
              <p className="flex items-center gap-2 font-heading text-lg font-bold text-white"><MapPin className="h-5 w-5 text-emerald-300" aria-hidden />We deliver to</p>
              <ul className="mt-4 flex flex-wrap gap-2">
                {AREAS.map((a) => <li key={a} className="rounded-full bg-emerald-800/70 px-3 py-1.5 text-sm font-medium">{a}</li>)}
              </ul>
              <p className="mt-4 text-sm text-emerald-200">Somewhere else? Choose it on the form and we will tell you honestly if we can reach you.</p>
            </div>
            <div className="rounded-2xl border border-emerald-900/10 p-6">
              <p className="font-heading text-lg font-bold text-emerald-950">Delivery charges</p>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-3"><dt className="text-slate-600">{H.freeFrom} to {H.freeUntil}</dt><dd className="font-semibold text-emerald-700">Free</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-600">{H.freeUntil} to {H.lateUntil}</dt><dd className="font-semibold text-slate-900">Rs {H.lateCharge} extra</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-600">After {H.lateUntil}</dt><dd className="font-semibold text-slate-900">Next morning</dd></div>
              </dl>
              <p className="mt-3 border-t border-slate-100 pt-3 text-sm text-slate-600">Pay for the medicines on delivery by UPI or cash.</p>
            </div>
          </aside>
        </section>

        <section className="mt-16">
          <h2 className="font-heading text-2xl font-bold text-emerald-950 sm:text-3xl">Medicine delivery in Dharamshala: quick facts</h2>
          <div className="mt-5 overflow-hidden rounded-2xl border border-emerald-900/10">
            <table className="w-full text-left text-sm">
              <tbody className="divide-y divide-emerald-900/10">
                {FACTS.map(([k, v], i) => (
                  <tr key={k} className={i % 2 ? 'bg-white' : 'bg-emerald-50/50'}>
                    <th scope="row" className="w-40 px-4 py-3 align-top font-semibold text-emerald-950 sm:w-48">{k}</th>
                    <td className="px-4 py-3 text-slate-700">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-16 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl bg-amber-50 p-6 ring-1 ring-amber-200">
            <h2 className="flex items-center gap-2 font-heading text-xl font-bold text-amber-950"><Ban className="h-5 w-5 text-amber-700" aria-hidden />What can we not deliver?</h2>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-slate-700">
              <li>Schedule X and other controlled medicines: strong painkillers, sleeping pills, tranquillisers, codeine cough syrups.</li>
              <li>Any medicine without a valid prescription, or where we cannot reach the doctor.</li>
              <li>Routine monthly medicines or stock-ups. Please buy these at a chemist in person.</li>
            </ul>
          </div>
          <div className="rounded-2xl bg-slate-50 p-6 ring-1 ring-slate-200">
            <h2 className="flex items-center gap-2 font-heading text-xl font-bold text-slate-900"><Siren className="h-5 w-5 text-red-600" aria-hidden />Which hospitals and emergency numbers?</h2>
            <ul className="mt-3 space-y-2 text-slate-700">
              <li><strong>108</strong> ambulance, <strong>112</strong> all emergencies (police, fire, ambulance).</li>
              <li><strong>Zonal Hospital Dharamshala</strong>: the main government hospital, in lower Dharamshala town.</li>
              <li><strong>Delek Hospital</strong>, Gangchen Kyishong (between Dharamshala and McLeod Ganj): <a href="tel:+911892222053" className="underline">01892 222053</a>, emergency 24x7.</li>
            </ul>
          </div>
        </section>

        <section className="mt-16">
          <h2 className="font-heading text-2xl font-bold text-emerald-950 sm:text-3xl">Which areas get medicine delivery?</h2>
          <p className="mt-3 max-w-3xl text-slate-700">The partner chemist delivers to {AREA_LIST}. McLeod Ganj, Bhagsu and other areas are not covered yet; choose &quot;Somewhere else&quot; on the form and we will tell you honestly whether it can be reached.</p>
        </section>

        <section className="mt-16 max-w-3xl">
          <h2 className="mb-4 font-heading text-2xl font-bold text-emerald-950 sm:text-3xl">Questions about medicine delivery in Dharamshala</h2>
          <FAQSection faqs={FAQS} />
        </section>

        <p className="mt-10 max-w-3xl text-sm text-slate-600">Staying in Dharamshala? See <Link href="/hotels" className="text-brand-600 underline">hotels and homestays</Link>, book a <Link href="/taxi" className="text-brand-600 underline">taxi</Link>, read the <Link href="/essentials" className="text-brand-600 underline">Dharamshala travel essentials</Link> or find <Link href="/luggage-storage" className="text-brand-600 underline">luggage storage</Link> and <Link href="/local-guides" className="text-brand-600 underline">local guides</Link>.</p>

        <section className="mb-16 mt-8 max-w-3xl border-t border-slate-200 pt-4 text-xs text-slate-500">
          <p className="font-semibold">Sources (checked {UPDATED})</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {SOURCES.map((s) => <li key={s.href}><a href={s.href} target="_blank" rel="noopener noreferrer" className="underline">{s.label}</a></li>)}
            <li>Delivery areas, hours, charges and payment: the partner chemist, via Dharamshala Stay ({UPDATED}).</li>
          </ul>
          <p className="mt-2">This page is not medical advice. Always follow your doctor.</p>
        </section>
      </div>
    </div>
  );
}
