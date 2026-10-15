import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import {
  ArrowRight, MapPin, ExternalLink, MessageCircle, BedDouble, RotateCw, Shirt, Footprints, CameraOff, Armchair,
  VolumeX, HeartHandshake, Flag, Gift, Lock,
} from 'lucide-react';
import { Breadcrumb } from '@/components/ui/Cards';
import JsonLd from '@/components/seo/JsonLd';
import MonasteryEffects from '@/components/monasteries/MonasteryEffects';
import Breathe from '@/components/monasteries/Breathe';
import { generateSEO, breadcrumbSchema, faqSchema } from '@/lib/seo';
import { siteConfig } from '@/lib/config';
import { getWhatsAppLink } from '@/lib/utils';
import { display, mono } from '@/lib/fonts';
import { monasteries, moreMonasteries, monasteryDay, meditation, etiquette, festivals, monasteryFaqs, monasterySources, type Monastery } from '@/data/monasteries';
import { monasteryPhotos } from '@/data/monastery-photos';
import '@/components/monasteries/monasteries.css';

const PATH = '/monasteries-meditation';
const HERO = 'gyuto-monastery-dhauladhar';
const ETIQUETTE_ICONS = [RotateCw, Shirt, Footprints, CameraOff, Armchair, VolumeX, HeartHandshake, Flag, Gift, Lock];
const FLAG_COLOURS = ['#2f6fb5', '#f4f4ef', '#c8372d', '#2f8f5b', '#e8b923'];

const photo = (file: string) => {
  const p = monasteryPhotos.find((x) => x.file === file)!;
  return { src: `/images/monasteries/${file}.jpg`, alt: p.alt, credit: p };
};

const mapUrl = (m: Monastery) => 'https://www.google.com/maps/search/?api=1&query='
  + encodeURIComponent(m.lat !== undefined ? `${m.lat},${m.lng}` : `${m.name}, ${m.area}`);

function Credit({ file }: { file: string }) {
  const { credit: c } = photo(file);
  return (
    <span className="mm-credit">
      Photo: <a href={c.source} target="_blank" rel="noopener noreferrer">{c.author}</a>,{' '}
      <a href={c.license_url} target="_blank" rel="noopener noreferrer license">{c.license}</a>
    </span>
  );
}

/** A string of prayer flags, swaying. */
function Flags({ count = 22 }: { count?: number }) {
  return (
    <div className="mm-flags" aria-hidden="true">
      <svg viewBox="0 0 1000 60" preserveAspectRatio="none"><path d="M0 8 Q500 70 1000 8" /></svg>
      {Array.from({ length: count }, (_, i) => {
        const t = (i + 0.5) / count;
        const y = 8 + (1 - (2 * t - 1) ** 2) * 31; // follows the curve above, in % of 60
        return <i key={i} style={{ left: t * 100 + '%', top: (y / 60) * 100 + '%', background: FLAG_COLOURS[i % 5], animationDelay: `${(i % 7) * -0.45}s` }} />;
      })}
    </div>
  );
}

/** Slow rising motes of light, like embers from butter lamps. Positions are fixed so server and client agree. */
function Motes({ n = 26 }: { n?: number }) {
  return (
    <div className="mm-motes" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <i key={i} style={{ left: ((i * 37) % 100) + '%', animationDuration: 14 + ((i * 7) % 12) + 's', animationDelay: -((i * 3.1) % 20) + 's', ['--s' as string]: 0.5 + ((i * 13) % 10) / 10 }} />
      ))}
    </div>
  );
}

export function monasteriesMetadata(): Metadata {
  return generateSEO({
    title: 'Monasteries & Meditation in Dharamshala and McLeod Ganj',
    description: 'The Dalai Lama Temple, Namgyal debates, Gyuto, Norbulingka and the kora, plus Tushita and Vipassana courses: timings, how to book and temple etiquette, checked October 2026.',
    path: PATH,
    image: photo(HERO).src,
    keywords: [
      'monasteries in dharamshala', 'mcleod ganj monastery', 'dalai lama temple timings', 'namgyal monastery debate',
      'gyuto monastery', 'norbulingka institute', 'tushita meditation centre', 'vipassana dharamshala',
      'meditation in mcleod ganj', 'buddhist courses dharamshala', 'kora mcleod ganj',
    ],
  });
}

/** Places of worship as structured data, with their map pins. */
function placesSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Monasteries and temples in Dharamshala and McLeod Ganj',
    itemListElement: [...monasteries, ...moreMonasteries].map((m, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': m.id === 'tibet-museum' ? 'Museum' : 'BuddhistTemple',
        name: m.name,
        ...(m.aka && { alternateName: m.aka }),
        description: m.about,
        address: { '@type': 'PostalAddress', streetAddress: m.area, addressRegion: 'Himachal Pradesh', addressCountry: 'IN' },
        ...(m.lat !== undefined && { geo: { '@type': 'GeoCoordinates', latitude: m.lat, longitude: m.lng } }),
        ...(m.photo && { image: siteConfig.url + photo(m.photo).src }),
        ...(m.official && { sameAs: m.official }),
      },
    })),
  };
}

const JUMP = [
  ['day', 'A day'], ['monasteries', 'Monasteries'], ['kora', 'Debate & kora'],
  ['meditation', 'Meditation'], ['etiquette', 'Etiquette'], ['festivals', 'Festivals'], ['faq', 'Questions'],
] as const;

export default function MonasteriesView() {
  const hero = photo(HERO);
  return (
    <div className={`mm ${display.variable} ${mono.variable}`}>
      <JsonLd data={[
        breadcrumbSchema([{ name: 'Home', href: '/' }, { name: 'Monasteries & Meditation', href: PATH }]),
        faqSchema(monasteryFaqs),
        placesSchema(),
      ]} />
      <MonasteryEffects labels={{ on: 'Ambient sound', off: 'Sound on' }} />

      {/* HERO */}
      <section className="mm-hero">
        <div className="bg"><Image src={hero.src} alt={hero.alt} fill priority sizes="100vw" /></div>
        <Flags />
        <Motes />
        <div className="mm-wrap in">
          <div className="crumb"><Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Monasteries & Meditation' }]} /></div>
          <p className="eyebrow">Little Lhasa · Dharamshala</p>
          <h1><span>Monasteries &amp; Meditation</span><em>in Dharamshala and McLeod Ganj</em></h1>
          <p className="lede">The home of the Dalai Lama and the Tibetan community in exile. Walk the kora at dawn, sit quietly
            while monks chant, watch them debate in the courtyard, and learn to meditate in the cedar forest above town.</p>
          <div className="cta">
            <a href="#day" className="mm-btn solid">Plan a calm day <ArrowRight className="h-4 w-4" /></a>
            <a href="#meditation" className="mm-btn ghost">Meditation courses</a>
          </div>
          <p className="checked">Checked against official sources in October 2026 · <Credit file={HERO} /></p>
        </div>
        <svg className="mm-ridge" viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 120V70l90-30 70 22 110-48 80 30 60-14 120 40 90-34 80 12 110-52 76 34 60-8 120 44 90-26 70 14 124-40 90 30V120z" />
        </svg>
      </section>

      {/* MANTRA */}
      <section className="mm-mantra">
        <p className="om rv" lang="bo">ༀ་མ་ཎི་པ་དྨེ་ཧཱུྃ</p>
        <p className="tr rv">Om mani padme hum</p>
        <p className="say rv">Slow down. Walk clockwise. Listen.</p>
      </section>

      <nav className="mm-jump" aria-label="On this page">
        <ul>{JUMP.map(([id, label]) => <li key={id}><a href={'#' + id}>{label}</a></li>)}</ul>
      </nav>

      {/* A DAY: the sky follows the scroll from dawn to night */}
      <section id="day" className="mm-day">
        <div className="mm-wrap grid">
          <div className="sky" aria-hidden="true">
            <div className="layer dawn" /><div className="layer noon" /><div className="layer dusk" /><div className="layer night" />
            <div className="stars" />
            <span className="sun" /><span className="moon" />
            <svg className="hills" viewBox="0 0 400 140" preserveAspectRatio="none">
              <path className="far" d="M0 140V60l40-20 30 14 46-34 36 22 30-10 50 28 40-24 36 12 50-30 42 26v96z" />
              <path className="snow" d="M116 20L105 28L112 27L117 30L122 26L124 24.9ZM358 18L347 24.6L353 24L358 27L363 24L367 23.6ZM40 40L30 45L36 44.5L41 47L45 44L48 43.7Z" />
              <path className="near" d="M0 140V100l60-14 50 16 70-26 60 22 80-18 80 20v40z" />
              <g className="temple"><rect x="186" y="74" width="28" height="18" /><path d="M180 76h40l-6-8h-28z" /><rect x="198" y="58" width="4" height="10" /></g>
            </svg>
          </div>
          <div className="steps">
            <p className="eyebrow">A day in the monasteries</p>
            <h2>From dawn kora <em>to evening lamps</em></h2>
            <p className="note">No monastery publishes a prayer timetable, so treat this as the usual rhythm of the day and ask at the temple the evening before.</p>
            <ol>
              {monasteryDay.map((m) => {
                const p = photo(m.photo);
                return (
                  <li key={m.id} className="mm-step">
                    <span className="dot" aria-hidden="true" />
                    <div className="ph"><Image src={p.src} alt={p.alt} fill sizes="(max-width:900px) 90vw, 260px" /></div>
                    <div className="tx">
                      <span className="time">{m.time}</span>
                      <h3>{m.title}</h3>
                      <p>{m.desc}</p>
                      <Credit file={m.photo} />
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </section>

      {/* MONASTERIES */}
      <section id="monasteries" className="mm-sec">
        <div className="mm-wrap">
          <header className="mm-head rv">
            <p className="eyebrow">Monasteries and temples</p>
            <h2>Places of <em>quiet devotion</em></h2>
            <p>From the Dalai Lama&apos;s own temple in McLeod Ganj to the chanting halls of Gyuto and the artists of Norbulingka down the valley.</p>
          </header>
          <div className="mm-places">
            {monasteries.map((m, i) => {
              const p = m.photo ? photo(m.photo) : null;
              return (
                <article key={m.id} className={'mm-place rv' + (i % 2 ? ' flip' : '')}>
                  {p && (
                    <figure>
                      <div className="arch"><Image src={p.src} alt={p.alt} fill sizes="(max-width:900px) 90vw, 520px" /></div>
                      <figcaption><Credit file={m.photo!} /></figcaption>
                    </figure>
                  )}
                  <div className="tx">
                    <span className="num">{String(i + 1).padStart(2, '0')}</span>
                    <p className="trad">{m.tradition}</p>
                    <h3>{m.name}</h3>
                    {m.aka && <p className="aka">Also called {m.aka}</p>}
                    <p className="area"><MapPin className="h-4 w-4" />{m.area}</p>
                    <p className="about">{m.about}</p>
                    {m.see.length > 0 && <ul className="lotus">{m.see.map((s) => <li key={s}>{s}</li>)}</ul>}
                    <p className="visit"><b>Visiting</b>{m.visit}</p>
                    <div className="links">
                      <a href={mapUrl(m)} target="_blank" rel="noopener noreferrer"><MapPin className="h-4 w-4" />Map</a>
                      <Link href={'/destinations/' + m.stay}><BedDouble className="h-4 w-4" />Stay nearby</Link>
                      {m.official && <a href={m.official} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" />Official site</a>}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <h3 className="mm-sub rv">More places nearby</h3>
          <div className="mm-more">
            {moreMonasteries.map((m) => (
              <div key={m.id} className="rv">
                <p className="trad">{m.tradition}</p>
                <h4>{m.name}</h4>
                {m.aka && <p className="aka">{m.aka}</p>}
                <p className="area"><MapPin className="h-3.5 w-3.5" />{m.area}</p>
                <p>{m.about}</p>
                <p className="visit">{m.visit}</p>
                <a href={mapUrl(m)} target="_blank" rel="noopener noreferrer"><MapPin className="h-4 w-4" />Map</a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* KORA, CHANTING, DEBATE */}
      <section id="kora" className="mm-sec mm-maroon">
        <Motes n={14} />
        <div className="mm-wrap mm-kora">
          <div className="copy">
            <header className="mm-head rv">
              <p className="eyebrow">Chanting, debate and the kora</p>
              <h2>Walk clockwise, <em>listen closely</em></h2>
            </header>
            <div className="rv"><h3>The kora (Lingkhor)</h3><p>A forest footpath loops around the hill of the main temple and the Dalai Lama&apos;s residence, past prayer wheels, prayer flags, carved mani stones and memorials. It takes 30–40 minutes, with a few steep, uneven parts. Go early, when Tibetans walk it with their prayer beads; always clockwise, and watch out for monkeys.</p></div>
            <div className="rv"><h3>Monks&apos; debate at Namgyal</h3><p>A standing monk fires questions on Buddhist philosophy, clapping and stamping to drive each point home, while a seated monk defends. It usually happens in the early afternoon, but times differ and debates pause for holidays, exams and big events. Watch quietly from the side.</p></div>
            <div className="rv"><h3>Prayers and chanting</h3><p>Monks and nuns chant at morning and evening sessions, but no monastery publishes a timetable. Your best chances are early morning and late afternoon at the main temple and at Gyuto, famous for its deep chanting.</p></div>
            <div className="rv"><h3>Prayer wheels and butter lamps</h3><p>Anyone may turn the prayer wheels, always clockwise; pilgrims recite <i>Om mani padme hum</i> as they go. Butter lamps burn before the altars as offerings; ask at the temple if you would like to offer one.</p></div>
          </div>
          <div className="loop rv" aria-label="The kora walks clockwise around the temple hill in 30 to 40 minutes" role="img">
            <svg viewBox="0 0 400 400" aria-hidden="true">
              <defs><radialGradient id="mm-glow"><stop offset="0" stopColor="#ffd28a" stopOpacity=".55" /><stop offset="1" stopColor="#ffd28a" stopOpacity="0" /></radialGradient></defs>
              <circle cx="200" cy="200" r="150" className="path" />
              <circle cx="200" cy="200" r="150" className="path2" pathLength={100} />
              {Array.from({ length: 24 }, (_, i) => {
                const a = (i / 24) * Math.PI * 2;
                return <rect key={i} className="wheel" x={200 + Math.cos(a) * 150 - 3} y={200 + Math.sin(a) * 150 - 5} width="6" height="10" rx="2"
                  transform={`rotate(${(a * 180) / Math.PI + 90} ${200 + Math.cos(a) * 150} ${200 + Math.sin(a) * 150})`} style={{ animationDelay: `${i * 0.15}s` }} />;
              })}
              <circle cx="200" cy="200" r="110" fill="url(#mm-glow)" />
              <g className="hill"><path d="M120 250 Q200 140 280 250z" /><rect x="186" y="186" width="28" height="22" /><path d="M180 188h40l-7-10h-26z" /><rect x="198" y="168" width="4" height="10" /></g>
              <g className="orbit"><g className="walker" transform="translate(350 200)"><circle r="16" className="halo" /><circle r="7" /></g></g>
              <path className="arrow" d="M330 120 a150 150 0 0 1 22 40" />
              <text x="200" y="300" className="lbl">30–40 min · clockwise</text>
            </svg>
          </div>
        </div>
        <div className="mm-wrap mm-mosaic">
          {['kora-prayer-flags', 'tsuglagkhang-prayer-wheels', 'kalachakra-mandala', 'prayer-flags-dharamkot'].map((f) => {
            const p = photo(f);
            return (
              <figure key={f} className="rv">
                <div className="ph"><Image src={p.src} alt={p.alt} fill sizes="(max-width:900px) 45vw, 300px" /></div>
                <figcaption><Credit file={f} /></figcaption>
              </figure>
            );
          })}
        </div>
      </section>

      {/* MEDITATION, under a night sky */}
      <section id="meditation" className="mm-sec mm-night">
        <div className="stars" aria-hidden="true" />
        <div className="mm-wrap">
          <div className="mm-calm rv">
            <div>
              <p className="eyebrow">Meditation and Buddhist courses</p>
              <h2>Learn to <em>sit still</em></h2>
              <p>The cedar forests above McLeod Ganj hold some of India&apos;s best-known meditation courses. Most serious courses fill weeks ahead, so book these before your hotel. Before you do, try a minute here.</p>
            </div>
            <Breathe labels={{ start: 'Begin a minute of calm', stop: 'Stop', inhale: 'Breathe in', exhale: 'Breathe out', done: 'Well done. Carry it with you.', idle: 'Six slow breaths' }} />
          </div>
          <div className="mm-courses">
            {meditation.map((c) => (
              <article key={c.id} className="rv">
                <h3>{c.name}</h3>
                <p className="where"><MapPin className="h-3.5 w-3.5" />{c.where}</p>
                <p>{c.what}</p>
                <dl>
                  <div><dt>How to join</dt><dd>{c.how}</dd></div>
                  <div><dt>Cost</dt><dd>{c.cost}</dd></div>
                </dl>
                {c.rules && <ul>{c.rules.map((r) => <li key={r}>{r}</li>)}</ul>}
                <a href={c.official} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" />Official site</a>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ETIQUETTE */}
      <section id="etiquette" className="mm-sec">
        <div className="mm-wrap">
          <header className="mm-head center rv">
            <p className="eyebrow">Temple etiquette</p>
            <h2>A little care <em>goes a long way</em></h2>
            <p>These are living places of worship and homes for monks and nuns.</p>
          </header>
          <ul className="mm-etiquette">
            {etiquette.map((e, i) => {
              const Icon = ETIQUETTE_ICONS[i];
              return (
                <li key={e.title} className="rv">
                  <span className="ic"><Icon className="h-5 w-5" aria-hidden="true" /></span>
                  <h3>{e.title}</h3>
                  <p>{e.desc}</p>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* FESTIVALS */}
      <section id="festivals" className="mm-sec mm-cream">
        <div className="mm-wrap">
          <header className="mm-head rv">
            <p className="eyebrow">Festivals and teachings</p>
            <h2>When the town <em>gathers</em></h2>
          </header>
          <ol className="mm-fest">
            {festivals.map((f) => (
              <li key={f.name} className="rv">
                <span className="when">{f.when}</span>
                <h3>{f.name}</h3>
                <p>{f.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mm-sec">
        <div className="mm-wrap mm-faq">
          <header className="mm-head rv">
            <p className="eyebrow">Questions travellers ask</p>
            <h2>Before <em>you go</em></h2>
            <p>Can&apos;t find yours? Ask our local team on WhatsApp.</p>
          </header>
          <div className="qs">
            {monasteryFaqs.map((f) => (
              <details key={f.question} className="rv"><summary>{f.question}</summary><p>{f.answer}</p></details>
            ))}
          </div>
        </div>
      </section>

      {/* CLOSING */}
      <section className="mm-close">
        <Flags count={16} />
        <Motes n={18} />
        <div className="mm-wrap">
          <p className="wish rv">May all beings be happy.</p>
          <h2 className="rv">Stay within walking distance of the temple</h2>
          <p className="rv">McLeod Ganj puts the main temple and the kora at your door; Dharamkot is a short walk from Tushita and Dhamma Sikhara.</p>
          <div className="cta rv">
            <Link href="/destinations/mcleod-ganj" className="mm-btn solid">Stays in McLeod Ganj <ArrowRight className="h-4 w-4" /></Link>
            <Link href="/destinations/dharamkot" className="mm-btn ghost">Stays in Dharamkot</Link>
            <a href={getWhatsAppLink('Hi! I would like help planning monastery visits / a meditation course in Dharamshala.')} target="_blank" rel="noopener noreferrer" className="mm-btn wa">
              <MessageCircle className="h-4 w-4" />Ask on WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* SOURCES */}
      <div className="mm-wrap mm-sources">
        <h2>How we checked this</h2>
        <p>Facts on this page were checked in October 2026 against the official sources below. Timings change with the ritual calendar and His Holiness&apos;s schedule, so confirm locally before you plan around them.</p>
        <ul>{monasterySources.map((s) => <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer">{s.name}</a></li>)}</ul>
      </div>
    </div>
  );
}
