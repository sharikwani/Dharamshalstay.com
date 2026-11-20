import Link from 'next/link';
import { Breadcrumb, FAQSection } from '@/components/ui/Cards';
import JsonLd from '@/components/seo/JsonLd';
import { generateSEO, faqSchema } from '@/lib/seo';
import MedicineRequestForm from '@/components/medicine/MedicineRequestForm';
import { DELIVERY_HOURS, MEDICINE_AREAS } from '@/lib/medicine/options';

const UPDATED = '20 November 2026';
const AREAS = MEDICINE_AREAS.filter((a) => a !== 'Other');
const AREA_LIST = AREAS.slice(0, -1).join(', ') + ' and ' + AREAS[AREAS.length - 1];
const H = DELIVERY_HOURS;

export const metadata = generateSEO({
  title: 'Medicine Delivery in Dharamshala 2026 (Emergency Only)',
  description: `Emergency medicine delivery in Dharamshala with a doctor prescription. Free ${H.freeFrom}-${H.freeUntil}, Rs ${H.lateCharge} extra until ${H.lateUntil}. Pay by UPI or cash.`,
  path: '/medicine-delivery-dharamshala', lang: 'en',
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

export default function MedicineDeliveryPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <JsonLd data={faqSchema(FAQS)} />
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Medicine delivery in Dharamshala' }]} />
      <h1 className="font-heading text-3xl font-bold text-slate-900">Medicine delivery in Dharamshala (emergency only)</h1>
      <p className="mt-1 text-sm text-slate-500">Updated {UPDATED}</p>
      <p className="mt-4 text-slate-700"><strong>Short answer:</strong> medicine delivery in Dharamshala is available for emergencies through a licensed partner chemist working with Dharamshala Stay. Send the patient details and a doctor prescription with the form below; we confirm the prescription with the doctor by phone, then the chemist delivers to {AREA_LIST}. Delivery is free from {H.freeFrom} to {H.freeUntil}, Rs {H.lateCharge} extra from {H.freeUntil} to {H.lateUntil}, and you pay by UPI or cash on delivery.</p>

      <div className="mt-5 rounded-xl border-2 border-red-200 bg-red-50 p-4 text-sm text-red-900">
        <strong>Life-threatening emergency?</strong> Do not wait for a delivery. Call <a href="tel:108" className="font-bold underline">108</a> (ambulance) or <a href="tel:112" className="font-bold underline">112</a> (all emergencies).
      </div>

      <h2 className="mt-10 font-heading text-2xl font-bold text-slate-900">Medicine delivery in Dharamshala: quick facts</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <tbody className="divide-y divide-slate-200">
            <tr><th className="py-2 pr-4 font-semibold text-slate-800">Who delivers</th><td className="py-2 text-slate-700">A licensed partner chemist, arranged by Dharamshala Stay</td></tr>
            <tr><th className="py-2 pr-4 font-semibold text-slate-800">What</th><td className="py-2 text-slate-700">Emergency medicines only, against a doctor prescription we confirm by phone</td></tr>
            <tr><th className="py-2 pr-4 font-semibold text-slate-800">Areas</th><td className="py-2 text-slate-700">{AREA_LIST}</td></tr>
            <tr><th className="py-2 pr-4 font-semibold text-slate-800">Free delivery</th><td className="py-2 text-slate-700">{H.freeFrom} to {H.freeUntil}</td></tr>
            <tr><th className="py-2 pr-4 font-semibold text-slate-800">Evening delivery</th><td className="py-2 text-slate-700">{H.freeUntil} to {H.lateUntil}: Rs {H.lateCharge} extra per delivery</td></tr>
            <tr><th className="py-2 pr-4 font-semibold text-slate-800">After {H.lateUntil}</th><td className="py-2 text-slate-700">Handled from {H.freeFrom} the next morning; call 108 if it cannot wait</td></tr>
            <tr><th className="py-2 pr-4 font-semibold text-slate-800">Payment</th><td className="py-2 text-slate-700">{H.payment}; nothing is paid online</td></tr>
            <tr><th className="py-2 pr-4 font-semibold text-slate-800">Not delivered</th><td className="py-2 text-slate-700">Schedule X and controlled medicines, anything without a prescription</td></tr>
          </tbody>
        </table>
      </div>

      <h2 className="mt-10 font-heading text-2xl font-bold text-slate-900">How does emergency medicine delivery work?</h2>
      <ol className="mt-4 list-decimal space-y-2 pl-5 text-slate-700">
        <li><strong>Send the request</strong> with the patient details, the medicines and a clear photo or PDF of the prescription.</li>
        <li><strong>We check it is genuine and urgent</strong> and call you back.</li>
        <li><strong>We call the doctor or clinic</strong> to confirm the prescription. No confirmation, no delivery.</li>
        <li><strong>The partner chemist delivers</strong> and you pay for the medicines (plus Rs {H.lateCharge} in the evening) by UPI or cash.</li>
      </ol>

      <h2 className="mt-10 font-heading text-2xl font-bold text-slate-900">Request emergency medicines</h2>
      <p className="mt-2 text-sm text-slate-600">All fields are needed. We use your details only for this request.</p>
      <div className="mt-5"><MedicineRequestForm /></div>

      <h2 className="mt-12 font-heading text-2xl font-bold text-slate-900">Which areas get medicine delivery?</h2>
      <p className="mt-3 text-slate-700">The partner chemist delivers to {AREA_LIST}. McLeod Ganj, Bhagsu and other areas are not covered yet; choose &quot;Somewhere else&quot; on the form and we will tell you honestly whether it can be reached.</p>

      <h2 className="mt-10 font-heading text-2xl font-bold text-slate-900">What can we not deliver?</h2>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-slate-700">
        <li>Schedule X and other controlled medicines: strong painkillers, sleeping pills, tranquillisers, codeine cough syrups.</li>
        <li>Any medicine without a valid prescription, or where we cannot reach the doctor.</li>
        <li>Routine monthly medicines or stock-ups. Please buy these at a chemist in person.</li>
      </ul>

      <h2 className="mt-10 font-heading text-2xl font-bold text-slate-900">Hospitals and emergency numbers in Dharamshala</h2>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-slate-700">
        <li><strong>108</strong>: ambulance. <strong>112</strong>: all emergencies (police, fire, ambulance).</li>
        <li><strong>Zonal Hospital Dharamshala</strong>: the main government hospital, in lower Dharamshala town.</li>
        <li><strong>Delek Hospital</strong>, Gangchen Kyishong (between Dharamshala and McLeod Ganj): 01892 222053, emergency 24x7.</li>
      </ul>

      <section className="mt-12">
        <h2 className="mb-4 font-heading text-2xl font-bold text-slate-900">Questions about medicine delivery in Dharamshala</h2>
        <FAQSection faqs={FAQS} />
      </section>

      <p className="mt-8 text-sm text-slate-600">Staying in Dharamshala? See <Link href="/hotels" className="text-brand-600 underline">hotels and homestays</Link>, book a <Link href="/taxi" className="text-brand-600 underline">taxi</Link>, read the <Link href="/essentials" className="text-brand-600 underline">Dharamshala travel essentials</Link> or find <Link href="/luggage-storage" className="text-brand-600 underline">luggage storage</Link> and <Link href="/local-guides" className="text-brand-600 underline">local guides</Link>.</p>

      <section className="mt-8 border-t border-slate-200 pt-4 text-xs text-slate-500">
        <p className="font-semibold">Sources (checked {UPDATED})</p>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          {SOURCES.map((s) => <li key={s.href}><a href={s.href} target="_blank" rel="noopener noreferrer" className="underline">{s.label}</a></li>)}
          <li>Delivery areas, hours, charges and payment: the partner chemist, via Dharamshala Stay (20 November 2026).</li>
        </ul>
        <p className="mt-2">This page is not medical advice. Always follow your doctor.</p>
      </section>
    </div>
  );
}
