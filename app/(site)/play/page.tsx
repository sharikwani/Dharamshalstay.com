import Link from 'next/link';
import { Smartphone, Tv, Award, Gift, Users, ShieldCheck } from 'lucide-react';
import { Breadcrumb, FAQSection } from '@/components/ui/Cards';
import JsonLd from '@/components/seo/JsonLd';
import JoinCode from '@/components/game/JoinCode';
import { generateSEO, faqSchema, breadcrumbSchema } from '@/lib/seo';
import { siteConfig } from '@/lib/config';
import { CODE_MIN_BOOKING, CODE_VALID_DAYS, PRIZES, PRIZE_ORDER, placeLabel } from '@/lib/game/tambola';
import { MAX_PLAYERS } from '@/lib/game/store';

export const metadata = generateSEO({
  title: 'Online Tambola for Parties: Free, Play on Phones',
  description: 'Free online tambola (housie) for birthday, anniversary and kitty parties. Host on a TV, guests join on phones with a code. Winner certificates.',
  path: '/play', lang: 'en', ogTag: 'Free tambola',
});

const inr = (n: number) => '₹' + n.toLocaleString('en-IN');

const FAQS = [
  { question: 'How do guests join the tambola game?', answer: 'The host starts a game at dharamshalastay.com/play/host on a laptop or TV. It shows a 6-digit code and a QR code. Guests open dharamshalastay.com/play on their phones, type the code or scan the QR, enter their name and add a photo, and get their own ticket at once. No app and no sign-up.' },
  { question: 'Is it free?', answer: 'Yes. Hosting and playing are completely free, there is no entry fee and no money changes hands. Prizes are certificates and Dharamshala Stay discount codes.' },
  { question: 'How many people can play?', answer: `Up to ${MAX_PLAYERS.toLocaleString('en-IN')} phones in one game, and every player gets a different ticket.` },
  { question: 'What are the prizes?', answer: `1st prize is Full House (all 15 numbers), 2nd prize is First Line (any full row) and 3rd prize is Early Five (any 5 numbers). Each winner gets a certificate with their name, photo and the party name, and a discount code: ${PRIZE_ORDER.slice().reverse().map((p) => inr(PRIZES[p].amount) + ' for ' + placeLabel(PRIZES[p].place)).join(', ')}.` },
  { question: 'Can someone cheat by claiming early?', answer: 'No. Every claim is checked by our server against the numbers actually called, so a claim only wins when the numbers on that ticket have really come out. The first correct claim for each prize wins.' },
  { question: 'How do winners share their certificate?', answer: 'The certificate opens on the winner’s phone with buttons to share it on WhatsApp, save it for Instagram posts and stories, or use the phone’s share menu.' },
  { question: 'How do I use the discount code?', answer: `Send it to us on WhatsApp or write it in a booking enquiry. It takes the amount off a hotel stay, trek, taxi or paragliding booked with Dharamshala Stay worth ${inr(CODE_MIN_BOOKING)} or more, within ${CODE_VALID_DAYS} days. One use per code.` },
];

export default function PlayPage() {
  return (
    <>
      <JsonLd data={[
        breadcrumbSchema([{ name: 'Home', href: '/' }, { name: 'Tambola', href: '/play' }]),
        { '@context': 'https://schema.org', '@type': 'WebApplication', name: 'Dharamshala Stay Tambola', applicationCategory: 'GameApplication', operatingSystem: 'Any (web browser)',
          url: siteConfig.url + '/play', offers: { '@type': 'Offer', price: 0, priceCurrency: 'INR' }, publisher: { '@id': siteConfig.url + '/#organization' } },
        faqSchema(FAQS),
      ]} />

      <section className="bg-gradient-to-br from-brand-950 via-brand-900 to-orange-900 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
          <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Tambola' }]} />
          <h1 className="text-3xl sm:text-5xl font-heading font-bold mt-2">Online Tambola for Parties</h1>
          <p className="text-brand-100 mt-3 max-w-2xl text-lg"><strong className="text-white">Short answer:</strong> free tambola (housie) for birthday, anniversary and kitty parties. The host puts the game on a TV or laptop, guests join on their phones with a 6-digit code, and the top 3 winners get a shareable certificate with a discount code.</p>
          <div className="mt-8 grid md:grid-cols-2 gap-6">
            <div className="rounded-2xl bg-white/10 p-5 backdrop-blur">
              <p className="flex items-center gap-2 font-semibold"><Smartphone className="h-5 w-5 text-orange-300" />Got a code? Join the game</p>
              <div className="mt-3"><JoinCode /></div>
            </div>
            <div className="rounded-2xl bg-white/10 p-5 backdrop-blur flex flex-col">
              <p className="flex items-center gap-2 font-semibold"><Tv className="h-5 w-5 text-orange-300" />Hosting a party?</p>
              <p className="text-brand-100 mt-2 text-sm">Start a game on the screen everyone can see. Takes 30 seconds.</p>
              <Link href="/play/host" className="mt-auto inline-flex items-center justify-center rounded-xl bg-white px-6 py-4 text-lg font-semibold text-brand-900 hover:bg-orange-50">Host a free game</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <h2 className="text-2xl font-heading font-bold text-slate-900">How does online tambola work?</h2>
        <ol className="mt-6 grid md:grid-cols-4 gap-4">
          {[
            [Tv, 'Host starts a game', 'Party name and type, on a TV or laptop. You get a 6-digit code and a QR.'],
            [Users, 'Guests join', 'Phones open dharamshalastay.com/play, enter the code, name and photo. Everyone gets a different ticket.'],
            [ShieldCheck, 'Numbers are called', 'Tap Next, or Auto every few seconds. Numbers appear on every phone and are read aloud.'],
            [Award, 'Winners claim', 'Claims are checked instantly. Top 3 get a certificate to share on WhatsApp and Instagram.'],
          ].map(([I, t, d]: any, i) => (
            <li key={t} className="rounded-xl border border-slate-200 bg-white p-4">
              <span className="text-xs font-bold text-orange-600">Step {i + 1}</span>
              <I className="h-6 w-6 text-brand-600 mt-2" />
              <h3 className="font-heading font-semibold text-slate-900 mt-2">{t}</h3>
              <p className="text-sm text-slate-600 mt-1">{d}</p>
            </li>
          ))}
        </ol>

        <h2 className="text-2xl font-heading font-bold text-slate-900 mt-12">What are the prizes?</h2>
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-sm bg-white border border-slate-200 rounded-xl overflow-hidden">
            <thead className="bg-brand-900 text-white"><tr><th className="text-left p-3">Place</th><th className="text-left p-3">Prize</th><th className="text-left p-3">How to win</th><th className="text-left p-3">Discount code</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {PRIZE_ORDER.slice().reverse().map((p) => <tr key={p}><td className="p-3 font-semibold">{placeLabel(PRIZES[p].place)}</td><td className="p-3">{PRIZES[p].label}</td><td className="p-3">{PRIZES[p].rule}</td><td className="p-3">{inr(PRIZES[p].amount)} off</td></tr>)}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-slate-600 mt-3 flex gap-2"><Gift className="h-4 w-4 mt-0.5 shrink-0 text-orange-600" />Codes work on hotels, treks, taxis and paragliding booked with Dharamshala Stay worth {inr(CODE_MIN_BOOKING)} or more, for {CODE_VALID_DAYS} days. The game ends when Full House is won.</p>
        <p className="text-sm text-slate-600 mt-4">Planning a bigger celebration in the hills? See <Link href="/groups" className="text-brand-600 underline">group trips and offsites</Link> or <Link href="/events" className="text-brand-600 underline">event packages</Link>.</p>
      </section>

      <section className="bg-slate-50 py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl font-heading font-bold text-slate-900 text-center mb-6">Tambola questions</h2>
          <FAQSection faqs={FAQS} />
        </div>
      </section>
    </>
  );
}
