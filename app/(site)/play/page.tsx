import Link from 'next/link';
import { Smartphone, Tv, Gift } from 'lucide-react';
import { Breadcrumb, FAQSection } from '@/components/ui/Cards';
import JsonLd from '@/components/seo/JsonLd';
import JoinCode from '@/components/game/JoinCode';
import GameArt from '@/components/game/GameArt';
import { generateSEO, faqSchema, breadcrumbSchema } from '@/lib/seo';
import { siteConfig } from '@/lib/config';
import { party } from '@/lib/fonts';
import { CODE_MIN_BOOKING, CODE_VALID_DAYS, PRIZES, placeLabel } from '@/lib/game/tambola';
import { MAX_PLAYERS } from '@/lib/game/store';
import { MIN_PLAYERS_FOR_CODES, PLACE_AMOUNTS } from '@/lib/game/winners';
import { GAMES, type GameType } from '@/lib/game/party';

export const metadata = generateSEO({
  title: 'Free Online Tambola & Party Games on Phones',
  description: 'Free tambola, party quiz, lucky draw and Most Likely To for birthday, anniversary and kitty parties. Guests join on phones with a code.',
  path: '/play', lang: 'en', ogTag: 'Free tambola',
});

const inr = (n: number) => '₹' + n.toLocaleString('en-IN');

const FAQS = [
  { question: 'Can we play tambola on a TV?', answer: 'Yes. Open dharamshalastay.com/tv on the TV’s web browser (Android TV, Google TV, Samsung or LG), scan the QR on the TV with the phone that started the game and tap Show on this TV. The TV then hosts: it shows the big numbers and board, calls numbers out loud on Auto and celebrates each winner with their photo, while your phone becomes the remote. It works for all four games.' },
  { question: 'Does it work with Chromecast?', answer: 'Yes. In Chrome on a laptop, open your game and tap Cast to TV on the host screen to send it to a Chromecast or Google TV; the laptop becomes the remote. On any phone or browser you can also use Chrome’s Cast tab or your phone’s Screen cast, then press Full screen on the host screen.' },
  { question: 'How do guests join the game?', answer: 'The host starts a game at dharamshalastay.com/play/host on a laptop or TV. It shows a 6-digit code and a QR code. Guests open dharamshalastay.com/play on their phones, type the code or scan the QR, and enter their name, photo, email and mobile number. No app to install.' },
  { question: 'Which party games can we play?', answer: 'Tambola (housie), Party Quiz (KBC-style with your own questions about the guest of honour, plus Bollywood, India and Himachal rounds), Lucky Draw (a reel of everyone’s photos picks up to 3 winners) and Who’s Most Likely To (funny votes about the guests).' },
  { question: 'Is it free?', answer: 'Yes. Hosting and playing are completely free, there is no entry fee and no money changes hands. Prizes are certificates and Dharamshala Stay discount codes.' },
  { question: 'How many people can play?', answer: `Up to ${MAX_PLAYERS.toLocaleString('en-IN')} phones in one game, and every player gets a different ticket.` },
  { question: 'What are the prizes?', answer: `1st prize is Full House (all 15 numbers), 2nd prize is First Line (any full row) and 3rd prize is Early Five (any 5 numbers). Each winner gets a certificate with their name, photo and the party name. In games with ${MIN_PLAYERS_FOR_CODES} or more players they also get a discount coupon by email: ${PLACE_AMOUNTS.map((a, i) => inr(a) + ' for ' + placeLabel(i + 1)).join(', ')}. The other games give 1st, 2nd and 3rd prizes the same way.` },
  { question: 'Can someone cheat by claiming early?', answer: 'No. Every claim is checked by our server against the numbers actually called, so a claim only wins when the numbers on that ticket have really come out. The first correct claim for each prize wins.' },
  { question: 'How do winners share their certificate?', answer: 'The certificate opens on the winner’s phone with buttons to share it on WhatsApp, save it for Instagram posts and stories, or use the phone’s share menu.' },
  { question: 'Why do players enter an email and phone number?', answer: 'So a winner’s coupon can be sent to them. Emails and numbers are never shown to other players, and we only send offers to people who tick the box to receive them.' },
  { question: 'How do I use the discount code?', answer: `The code arrives by email. Send it to us on WhatsApp or write it in a booking enquiry. It takes the amount off a hotel stay, trek, taxi or paragliding booked with Dharamshala Stay worth ${inr(CODE_MIN_BOOKING)} or more, within ${CODE_VALID_DAYS} days. One use per code.` },
];

/** Each game has its own colour world so it is recognisable at a glance (and on the host screen). */
const TILE: Record<GameType, { bg: string; ink: string; sub: string; btn: string; best: string }> = {
  tambola: { bg: 'bg-[#ffb627]', ink: 'text-[#2a0f3d]', sub: 'text-[#2a0f3d]/80', btn: 'bg-[#2a0f3d] text-white', best: 'kitty parties, family get-togethers' },
  quiz: { bg: 'bg-[#0b8f8f]', ink: 'text-white', sub: 'text-white/90', btn: 'bg-white text-[#0b6f6f]', best: 'birthdays, office parties' },
  lucky_draw: { bg: 'bg-[#d6306f]', ink: 'text-white', sub: 'text-white/90', btn: 'bg-white text-[#b21e62]', best: 'prize giveaways at any party' },
  most_likely: { bg: 'bg-[#4cc26a]', ink: 'text-[#2a0f3d]', sub: 'text-[#2a0f3d]/80', btn: 'bg-[#2a0f3d] text-white', best: 'friends, cousins, reunions' },
};

/** Called tambola numbers scattered behind the hero. Decorative only. */
const SCATTER = [7, 18, 23, 34, 41, 56, 62, 75, 88, 90, 3, 49, 67, 12, 81, 29];
const PARTY = 'font-[family-name:var(--font-party)]';
const PLUM = '#2a0f3d';

export default function PlayPage() {
  const games = Object.keys(GAMES) as GameType[];
  // Shown 2nd, 1st, 3rd so the winner stands in the middle of the podium.
  const podium = [PRIZES.first_line, PRIZES.full_house, PRIZES.early_five];
  return (
    <div className={party.variable}>
      <JsonLd data={[
        breadcrumbSchema([{ name: 'Home', href: '/' }, { name: 'Tambola', href: '/play' }]),
        { '@context': 'https://schema.org', '@type': 'WebApplication', name: 'Dharamshala Stay Tambola', applicationCategory: 'GameApplication', operatingSystem: 'Any (web browser)',
          url: siteConfig.url + '/play', offers: { '@type': 'Offer', price: 0, priceCurrency: 'INR' }, publisher: { '@id': siteConfig.url + '/#organization' } },
        faqSchema(FAQS),
      ]} />

      <section className="relative overflow-hidden text-white" style={{ backgroundColor: PLUM }}>
        <div aria-hidden className="pointer-events-none absolute inset-0 select-none">
          {SCATTER.map((n, i) => {
            const size = 44 + (i % 4) * 14;
            return (
              <span key={n} className={`absolute flex items-center justify-center rounded-full border-2 border-white/10 ${PARTY} font-bold text-white/10`}
                style={{ left: `${(i * 37) % 94}%`, top: `${(i * 53) % 86}%`, width: size, height: size, fontSize: 16 + (i % 4) * 6 }}>{n}</span>
            );
          })}
        </div>
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-14">
          <div className="[&_a]:text-white/70 [&_a:hover]:text-white [&_span]:text-white/90 [&_svg]:text-white/50"><Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Tambola' }]} /></div>
          <h1 className={`${PARTY} font-extrabold leading-[0.95] text-5xl sm:text-7xl max-w-3xl`}>Free Online Tambola and Party Games</h1>
          <p className="mt-5 max-w-2xl text-lg text-white/80"><strong className="text-white">Short answer:</strong> free tambola (housie), party quiz, lucky draw and Who’s Most Likely To for birthday, anniversary and kitty parties. The host puts the game on a TV or laptop, guests join on their phones with a 6-digit code, and the top 3 winners get a shareable certificate and a discount coupon by email.</p>

          <div className="mt-9 grid gap-5 md:grid-cols-[1.1fr_1fr]">
            <div className="rounded-[28px] bg-white p-6 shadow-[0_14px_0_-4px_#ffb627]" style={{ color: PLUM }}>
              <p className={`flex items-center gap-2 ${PARTY} text-2xl font-bold`}><Smartphone className="h-6 w-6 text-[#d6306f]" />Got a code? Join the game</p>
              <p className="mt-1 text-sm opacity-70">Type the 6 digits on the host’s screen. No app needed.</p>
              <div className="mt-4 rounded-2xl p-4" style={{ backgroundColor: PLUM }}><JoinCode /></div>
            </div>
            <div className="flex flex-col rounded-[28px] border-2 border-white/25 p-6">
              <p className={`flex items-center gap-2 ${PARTY} text-2xl font-bold`}><Tv className="h-6 w-6 text-[#ffb627]" />Hosting a party?</p>
              <p className="mt-1 text-white/75">Put a game on the TV or laptop everyone can see. It takes 30 seconds and it is free, for up to {MAX_PLAYERS.toLocaleString('en-IN')} phones.</p>
              <Link href="/play/host" className={`mt-6 inline-flex items-center justify-center rounded-2xl bg-[#ffb627] px-6 py-4 ${PARTY} text-xl font-bold hover:bg-[#ffc54d] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-white`} style={{ color: PLUM }}>Host a free game</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="pb-16" style={{ backgroundColor: PLUM }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className={`${PARTY} text-4xl sm:text-5xl font-extrabold text-white`}>Which games can we play?</h2>
          <p className="mt-2 text-white/70">Pick one to host. Every game runs on the big screen, and guests play on their phones.</p>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {games.map((g) => {
              const t = TILE[g];
              return (
                <Link key={g} href={'/play/host?game=' + g}
                  className={`group flex flex-col rounded-[32px] ${t.bg} p-6 sm:p-8 transition-transform motion-safe:hover:-translate-y-1 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-white`}>
                  <div className="flex justify-center">
                    <GameArt game={g} className="h-44 w-44 sm:h-56 sm:w-56 drop-shadow-[0_8px_0_rgba(42,15,61,0.18)] transition-transform motion-safe:group-hover:-rotate-3 motion-safe:group-hover:scale-105" />
                  </div>
                  <h3 className={`mt-4 ${PARTY} text-3xl sm:text-4xl font-extrabold leading-none ${t.ink}`}>{GAMES[g].name}</h3>
                  <p className={`mt-2 text-lg font-semibold ${t.ink}`}>{GAMES[g].short}</p>
                  <p className={`mt-2 flex-1 ${t.sub}`}>{GAMES[g].how}</p>
                  <p className={`mt-3 text-sm ${t.sub}`}>Great for {t.best}</p>
                  <span className={`mt-5 inline-flex w-fit items-center rounded-2xl px-5 py-3 ${PARTY} text-lg font-bold ${t.btn}`}>Host {GAMES[g].name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-[#faf6fd]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14" style={{ color: PLUM }}>
          <h2 className={`${PARTY} text-4xl font-extrabold`}>How does online tambola work?</h2>
          <ol className="mt-8 grid gap-6 md:grid-cols-4">
            {[
              ['Host starts a game', 'Party name and type, on a TV or laptop. You get a 6-digit code and a QR.'],
              ['Guests join', 'Phones open dharamshalastay.com/play, enter the code, name and photo. Everyone gets a different ticket.'],
              ['Numbers are called', 'Tap Next, or Auto every few seconds. Numbers appear on every phone and are read aloud.'],
              ['Winners claim', 'Claims are checked instantly. The top 3 get a certificate to share on WhatsApp and Instagram.'],
            ].map(([t, d], i) => (
              <li key={t}>
                <span className={`flex h-14 w-14 items-center justify-center rounded-full ${PARTY} text-2xl font-extrabold text-[#ffb627]`} style={{ backgroundColor: PLUM }}>{i + 1}</span>
                <h3 className={`mt-3 ${PARTY} text-2xl font-bold`}>{t}</h3>
                <p className="mt-1 text-slate-600">{d}</p>
              </li>
            ))}
          </ol>

          <h2 className={`mt-16 ${PARTY} text-4xl font-extrabold`}>Can you play on a TV or Chromecast?</h2>
          <p className="mt-2 max-w-3xl text-lg text-slate-700"><strong>Yes, all four games.</strong> The TV becomes the host: big numbers and board from across the room, numbers called out loud, a full-screen moment for every winner, and your phone works as the remote.</p>
          <ol className="mt-6 grid gap-5 md:grid-cols-3">
            {[
              ['Smart TV', 'Open dharamshalastay.com/tv in the TV’s browser. Scan the QR on the TV with the phone that started the game and tap Show on this TV.'],
              ['Chromecast or Google TV', 'In Chrome on a laptop, start the game and tap Cast to TV on the host screen. Or use Chrome’s Cast tab, or your phone’s Screen cast, and press Full screen.'],
              ['Laptop on HDMI', 'Plug the laptop into the TV, start the game and press Full screen. Everything runs from the laptop.'],
            ].map(([t, d]) => (
              <li key={t} className="rounded-2xl bg-white p-5 ring-1 ring-[#2a0f3d]/10">
                <h3 className={`${PARTY} text-2xl font-bold`}>{t}</h3>
                <p className="mt-1 text-slate-600">{d}</p>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-sm text-slate-600">On the TV, open <Link href="/tv" className="text-[#b21e62] underline">dharamshalastay.com/tv</Link>. No camera on your phone? Type the TV’s 8-letter code at <Link href="/play/tv" className="text-[#b21e62] underline">dharamshalastay.com/play/tv</Link>.</p>

          <h2 className={`mt-16 ${PARTY} text-4xl font-extrabold`}>What are the prizes?</h2>
          <p className="mt-2 text-slate-600">Tambola prizes are below. The quiz, lucky draw and Most Likely To give 1st, 2nd and 3rd places the same way.</p>
          <ol className="mt-8 grid max-w-3xl grid-cols-3 items-end gap-3 sm:gap-5">
            {podium.map((p) => {
              const pad = p.place === 1 ? 'pt-10 pb-8' : p.place === 2 ? 'pt-7 pb-6' : 'pt-5 pb-5';
              const col = p.place === 1 ? 'bg-[#ffb627] text-[#2a0f3d]' : p.place === 2 ? 'bg-[#0b8f8f] text-white' : 'bg-[#d6306f] text-white';
              return (
                <li key={p.label} className={`rounded-t-[24px] px-2 sm:px-4 text-center ${pad} ${col}`}>
                  <span className={`block ${PARTY} text-4xl sm:text-6xl font-extrabold leading-none`}>{placeLabel(p.place)}</span>
                  <span className={`mt-2 block ${PARTY} text-lg sm:text-2xl font-bold`}>{p.label}</span>
                  <span className="mt-1 block text-xs sm:text-sm opacity-90">{p.rule}</span>
                  <span className="mt-3 inline-block rounded-full bg-white px-3 py-1 text-sm font-bold text-[#2a0f3d]">{inr(p.amount)} off</span>
                </li>
              );
            })}
          </ol>
          <p className="mt-5 flex max-w-3xl gap-2 text-sm text-slate-600"><Gift className="mt-0.5 h-4 w-4 shrink-0 text-[#d6306f]" />Coupons are emailed to winners in games with {MIN_PLAYERS_FOR_CODES}+ players and work on hotels, treks, taxis and paragliding booked with Dharamshala Stay worth {inr(CODE_MIN_BOOKING)} or more, for {CODE_VALID_DAYS} days. Tambola ends when Full House is won.</p>

          <h2 className={`mt-16 ${PARTY} text-3xl font-extrabold`}>Quick facts</h2>
          <div className="mt-4 max-w-3xl overflow-x-auto">
            <table className="w-full overflow-hidden rounded-2xl bg-white text-sm ring-1 ring-[#2a0f3d]/10">
              <tbody className="divide-y divide-[#2a0f3d]/10">
                {[
                  ['Price', 'Free to host and play, no entry fee'],
                  ['Games', games.map((g) => GAMES[g].name).join(', ')],
                  ['Players', `Up to ${MAX_PLAYERS.toLocaleString('en-IN')} phones per game`],
                  ['What you need', 'One TV (smart TV browser or Chromecast) or a laptop for the host, and a phone for each guest (no app)'],
                  ['Prizes', `Certificates for the top 3, plus ${PLACE_AMOUNTS.map(inr).join(' / ')} discount codes when ${MIN_PLAYERS_FOR_CODES}+ play`],
                  ['Coupon validity', `${CODE_VALID_DAYS} days, on bookings of ${inr(CODE_MIN_BOOKING)} or more`],
                ].map(([k, v]) => (
                  <tr key={k}><th scope="row" className="w-36 p-3 text-left font-semibold align-top">{k}</th><td className="p-3 text-slate-700">{v}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-6 text-sm text-slate-600">Planning a bigger celebration in the hills? See <Link href="/groups" className="text-[#b21e62] underline">group trips and offsites</Link>, <Link href="/events" className="text-[#b21e62] underline">event packages</Link> or <Link href="/hotels" className="text-[#b21e62] underline">places to stay in Dharamshala</Link>.</p>
        </div>
      </section>

      <section className="bg-white py-14">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h2 className={`mb-6 text-center ${PARTY} text-4xl font-extrabold text-[#2a0f3d]`}>Tambola questions</h2>
          <FAQSection faqs={FAQS} />
        </div>
      </section>
    </div>
  );
}
