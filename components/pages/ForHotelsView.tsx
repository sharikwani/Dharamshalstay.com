import Link from 'next/link';
import type { Metadata } from 'next';
import { MessageCircle, Clock, Languages, UserCheck, ShieldCheck, Mail, Instagram, Home, ArrowRight, Check, Moon } from 'lucide-react';
import { Breadcrumb, FAQSection } from '@/components/ui/Cards';
import InquiryForm from '@/components/forms/InquiryForm';
import JsonLd from '@/components/seo/JsonLd';
import { generateSEO, faqSchema, breadcrumbSchema } from '@/lib/seo';
import { getWhatsAppLink } from '@/lib/utils';
import { siteConfig } from '@/lib/config';

/**
 * For hotel owners: the free listing plus the paid tools (WhatsApp AI receptionist, social media autopilot).
 * Linked only from owner places (footer "For hotel owners", partner register and dashboard, claim pages),
 * never from guest pages. Written so a guest who lands here sees a service that answers them faster and is honest
 * about being an assistant, not a trick.
 */

/** Launch offer shown on the page. Owner to confirm before it goes live. */
export const FOUNDING_OFFER = 'First month free for our first 10 founding hotels. No contract, cancel any time.';

const UPDATED = '2026-10-20';

export const FOR_HOTELS_FAQS = [
  { question: 'Will guests know they are chatting with an assistant?', answer: 'Yes. It introduces itself as your hotel’s assistant, never pretends to be a person, and any guest can ask for a team member at any time. Guests get an instant, correct answer instead of waiting hours, which is why they like it.' },
  { question: 'Does it need a new WhatsApp number?', answer: 'No new number for your guests. It runs on your hotel’s WhatsApp Business number, and our team does the setup with you on a short call. If your number needs any change to connect, we tell you before anything is switched on.' },
  { question: 'What if a guest asks something it does not know?', answer: 'It says a team member will reply, and alerts you on WhatsApp and email straight away. It never invents prices, discounts or availability: it only uses the rooms, rates and rules you have given it.' },
  { question: 'Can it take bookings?', answer: 'It answers questions, quotes the rates you have set and sends guests your booking link on Dharamshala Stay. Holding a room, discounts and payment changes are always handed to your staff.' },
  { question: 'Which languages does it reply in?', answer: 'The language the guest writes in: English, Hindi or Hinglish. It replies in short, polite WhatsApp messages.' },
  { question: 'What does it cost?', answer: FOUNDING_OFFER + ' After that it is a simple monthly plan, shared with you before you decide. Your listing on Dharamshala Stay stays free either way.' },
  { question: 'Can I see what it tells guests?', answer: 'Every chat is saved, you can read and take over any conversation, and you get an email whenever it hands a guest to you.' },
];

export function forHotelsMetadata(): Metadata {
  return generateSEO({
    title: 'WhatsApp AI Receptionist for Hotels in Dharamshala',
    description: 'Answer every guest on WhatsApp in seconds, day and night, in Hindi or English. Built for Dharamshala hotels and homestays. First month free.',
    path: '/for-hotels', lang: 'en', ogTag: 'For hotels',
  });
}

const FEATURES = [
  { icon: Clock, title: 'Replies in seconds, 24 hours', body: 'Late-night and early-morning messages get an answer straight away, not when the front desk opens.' },
  { icon: Home, title: 'Knows your hotel', body: 'Your rooms, rates, check-in time, parking, breakfast and how to reach you from the bus stand or Gaggal airport.' },
  { icon: Languages, title: 'Hindi, English, Hinglish', body: 'It answers in the language the guest writes in, politely and briefly, the way a good receptionist would.' },
  { icon: UserCheck, title: 'Hands over to your team', body: 'Calls, discounts, complaints and special requests go to you at once, on WhatsApp and email.' },
  { icon: ShieldCheck, title: 'Never makes things up', body: 'It only quotes the prices and rules you set. No invented discounts, no promises you did not make.' },
  { icon: Mail, title: 'You see everything', body: 'Every chat is saved. Read any conversation, or jump in and reply yourself whenever you like.' },
];

const STEPS = [
  { title: 'Claim your free listing', body: 'Add your rooms, photos and rates on Dharamshala Stay. Takes about 10 minutes.' },
  { title: 'A 15-minute setup call', body: 'We connect your WhatsApp and check the answers with you before anything goes live.' },
  { title: 'Guests get instant answers', body: 'You get the bookings and the alerts. Change rates or rules any time from your partner account.' },
];

function ChatDemo() {
  const bubble = 'max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-snug shadow-sm';
  return (
    <div className="rounded-2xl bg-[#e9e2d8] p-4 shadow-xl ring-1 ring-black/5 w-full max-w-sm mx-auto" aria-label="Example WhatsApp chat">
      <div className="flex items-center gap-2 pb-3 mb-3 border-b border-black/10">
        <div className="h-8 w-8 rounded-full bg-brand-700 text-white grid place-items-center text-xs font-bold">HV</div>
        <div><p className="text-sm font-semibold text-slate-900">Hotel Valley View</p><p className="text-[11px] text-slate-600">Assistant · replies instantly</p></div>
      </div>
      <div className="space-y-2">
        <div className={bubble + ' bg-white text-slate-800'}>Hi, any room for 2 people 14 to 16 Nov? Price? Parking?<p className="text-[10px] text-slate-400 text-right mt-0.5 flex items-center justify-end gap-1"><Moon className="h-3 w-3" />11:42 pm</p></div>
        <div className={bubble + ' bg-[#d9fdd3] text-slate-800 ml-auto'}>Namaste! Yes, our Deluxe Valley View room is free 14 to 16 Nov for 2 guests: Rs 2,800 a night with breakfast, taxes included. Free parking at the hotel. You can book here: dharamshalastay.com/hotels/... A team member will also confirm in the morning.<p className="text-[10px] text-slate-500 text-right mt-0.5">11:42 pm</p></div>
        <div className={bubble + ' bg-white text-slate-800'}>Great, can you do 2,500?<p className="text-[10px] text-slate-400 text-right mt-0.5">11:44 pm</p></div>
        <div className={bubble + ' bg-[#d9fdd3] text-slate-800 ml-auto'}>I will ask the manager about that for you. Someone from the hotel will reply by 9 am.<p className="text-[10px] text-slate-500 text-right mt-0.5">11:44 pm</p></div>
      </div>
      <p className="text-[11px] text-slate-600 mt-3 text-center">Example chat. Prices and room are illustrative.</p>
    </div>
  );
}

export default function ForHotelsView() {
  return (
    <>
      <JsonLd data={[
        breadcrumbSchema([{ name: 'Home', href: '/' }, { name: 'For hotels', href: '/for-hotels' }]),
        {
          '@context': 'https://schema.org', '@type': 'Service',
          name: 'WhatsApp AI receptionist for hotels', serviceType: 'Hotel guest messaging',
          provider: { '@id': siteConfig.url + '/#organization' },
          areaServed: { '@type': 'Place', name: 'Dharamshala and McLeod Ganj, Himachal Pradesh, India' },
          audience: { '@type': 'BusinessAudience', name: 'Hotels, homestays and hostels' },
          url: siteConfig.url + '/for-hotels', dateModified: UPDATED,
        },
        faqSchema(FOR_HOTELS_FAQS),
      ]} />

      <section className="bg-brand-950 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 lg:py-16 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'For hotels' }]} />
            <p className="text-orange-400 font-semibold text-sm uppercase tracking-wide">For hotel and homestay owners</p>
            <h1 className="text-3xl sm:text-4xl font-heading font-bold mt-2 leading-tight">WhatsApp AI receptionist for hotels in Dharamshala</h1>
            <p className="text-brand-100 mt-4 text-lg"><strong className="text-white">Short answer:</strong> it answers your guests on your hotel&apos;s WhatsApp in seconds, day and night, in Hindi or English, using only your own rooms and rates. Anything it cannot answer goes straight to your team.</p>
            <p className="text-brand-200 mt-3">Guests usually message several hotels at once. The one that answers first often gets the booking.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href="#early-access" className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold px-5 py-3 rounded-lg">Get early access <ArrowRight className="h-4 w-4" /></a>
              <a href={getWhatsAppLink('Hi, I own a hotel in Dharamshala and want to know about the WhatsApp assistant.')} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold px-5 py-3 rounded-lg"><MessageCircle className="h-4 w-4" /> Ask us on WhatsApp</a>
            </div>
            <p className="mt-4 text-sm text-orange-200">{FOUNDING_OFFER}</p>
          </div>
          <ChatDemo />
        </div>
      </section>

      <section className="py-12 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-heading font-bold text-slate-900 text-center">What does the WhatsApp assistant do for my hotel?</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-8">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-xl border border-slate-200 p-5">
                <f.icon className="h-6 w-6 text-brand-600" />
                <h3 className="font-heading font-semibold text-slate-900 mt-3">{f.title}</h3>
                <p className="text-sm text-slate-600 mt-1 leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 bg-slate-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-heading font-bold text-slate-900 text-center">Is it fair to guests?</h2>
          <p className="text-slate-700 mt-4 text-center max-w-3xl mx-auto leading-relaxed">Yes, and that is the point. A guest who writes at midnight gets a correct answer at midnight, not the next afternoon. The assistant always says it is the hotel&apos;s assistant, never pretends to be a person, and any guest can ask for a team member. It does not send promotions or messages guests did not ask for.</p>
        </div>
      </section>

      <section className="py-12 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-heading font-bold text-slate-900 text-center">How do I get started?</h2>
          <ol className="grid md:grid-cols-3 gap-5 mt-8">
            {STEPS.map((s, i) => (
              <li key={s.title} className="rounded-xl bg-brand-50 p-5">
                <span className="h-8 w-8 rounded-full bg-brand-700 text-white grid place-items-center font-bold text-sm">{i + 1}</span>
                <h3 className="font-heading font-semibold text-slate-900 mt-3">{s.title}</h3>
                <p className="text-sm text-slate-600 mt-1">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="py-12 bg-slate-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-heading font-bold text-slate-900 text-center">What else do partner hotels get?</h2>
          <div className="overflow-x-auto mt-8">
            <table className="w-full text-sm bg-white rounded-xl overflow-hidden">
              <thead className="bg-brand-900 text-white"><tr><th className="text-left p-3">Feature</th><th className="text-left p-3">What you get</th><th className="text-left p-3">Price</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                <tr><td className="p-3 font-medium">Listing on Dharamshala Stay</td><td className="p-3">Hotel page, photos, rooms, reviews, guest enquiries and booking alerts on WhatsApp and email</td><td className="p-3">Free</td></tr>
                <tr><td className="p-3 font-medium">Bookings through our site</td><td className="p-3">Guests book and pay online; you get the booking straight away</td><td className="p-3">Commission only on confirmed bookings</td></tr>
                <tr><td className="p-3 font-medium">WhatsApp AI receptionist</td><td className="p-3">Instant replies on your own WhatsApp number, hand-over to your team</td><td className="p-3">Monthly plan, first month free</td></tr>
                <tr><td className="p-3 font-medium"><span className="inline-flex items-center gap-1"><Instagram className="h-4 w-4" />Social media autopilot</span></td><td className="p-3">Instagram and Facebook carousels about your hotel and the area, made and posted for you</td><td className="p-3">Monthly plan, ask us</td></tr>
              </tbody>
            </table>
          </div>
          <p className="text-sm text-slate-600 mt-4 text-center">Not listed yet? <Link href="/partner/register" className="text-brand-600 underline">Create your free partner account</Link>. Already have a listing page with us? Use the claim link we sent you, or <Link href="/contact" className="text-brand-600 underline">ask us for it</Link>.</p>
        </div>
      </section>

      <section id="early-access" className="py-12 bg-white scroll-mt-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-10">
          <div>
            <h2 className="text-2xl sm:text-3xl font-heading font-bold text-slate-900">Get early access</h2>
            <p className="text-slate-700 mt-3">Tell us your hotel and the number guests message you on. We will call you, show you the assistant answering questions about your own hotel, and switch it on only when you are happy.</p>
            <ul className="mt-5 space-y-2 text-sm text-slate-700">
              {['No new number, no app to install', 'Your listing stays free', 'Turn it off any time from one message'].map((x) => <li key={x} className="flex gap-2"><Check className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />{x}</li>)}
            </ul>
          </div>
          <InquiryForm type="general" contextNote="For hotels: WhatsApp AI receptionist early access" hideOffers
            title="Hotel early access" subtitle="We reply within one working day."
            messagePlaceholder="Hotel name, area (e.g. Dharamkot, Naddi) and number of rooms"
            submitLabel="Request early access" successTitle="Thank you!" successNote="Our team will call you within one working day to set up a demo for your hotel." />
        </div>
      </section>

      <section className="py-12 bg-slate-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-heading font-bold text-slate-900 text-center mb-8">Questions hotel owners ask</h2>
          <FAQSection faqs={FOR_HOTELS_FAQS} />
          <p className="text-xs text-slate-500 mt-6 text-center">Updated {new Date(UPDATED).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.</p>
        </div>
      </section>
    </>
  );
}
