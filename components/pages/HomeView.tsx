import Link from 'next/link';
import Image from 'next/image';
import { Shield, HeadphonesIcon, ArrowRight, Star, MessageCircle, IndianRupee, Heart, Building, Compass, BedDouble, Mountain, BookOpen, MapPin } from 'lucide-react';
import { FAQSection, BlogCard } from '@/components/ui/Cards';
import HeroSearch from '@/components/sections/HeroSearch';
import HeroAtmosphere from '@/components/home/HeroAtmosphere';
import HeroClock from '@/components/home/HeroClock';
import StaySlider from '@/components/home/StaySlider';
import TrailSection from '@/components/home/TrailSection';
import HomeEffects from '@/components/home/HomeEffects';
import Divider from '@/components/home/Divider';
import MonasteryDay from '@/components/home/MonasteryDay';
import { monasteryDay } from '@/data/monasteries';
import { monasteryPhotos } from '@/data/monastery-photos';
import JsonLd from '@/components/seo/JsonLd';
import { getDestinations, getPublishedProperties, getPublishedTreks } from '@/lib/db';
import { blogPosts, getFeaturedBlogPosts } from '@/data/blog';
import { gaddiPhotos } from '@/data/gaddi-photos';
import { faqSchema } from '@/lib/seo';
import { formatPrice, getWhatsAppLink } from '@/lib/utils';
import { pickFeaturedStays } from '@/lib/home-helpers';
import { placeImage } from '@/lib/place-images';
import { display, mono } from '@/lib/fonts';
import { UNSPLASH_IMAGES } from '@/types';
import { serverT } from '@/lib/i18n/server';
import { fmt } from '@/lib/i18n/dict';
import { getHomepageFAQs, localizeDestination, localizePost } from '@/lib/i18n/content';
import type { Lang } from '@/lib/i18n/core';
import '@/components/home/home.css';

const TRUST_ICONS = [IndianRupee, Shield, HeadphonesIcon, Heart];
const WHY_ICONS = [Building, Compass, IndianRupee];
const EXP = [
  { href: '/treks', image: UNSPLASH_IMAGES.trek1 },
  { href: '/paragliding', image: UNSPLASH_IMAGES.paragliding },
  { href: '/taxi', image: UNSPLASH_IMAGES.taxi },
];
const SEASON_IMAGE = { spring: 'triund', monsoon: 'bhagsu-waterfall', autumn: 'kareri-lake', winter: 'dharamshala-snow' } as const;
// Altitudes shown in the place ticker, where a well-documented figure exists.
const TICKER_ALT: Record<number, string> = { 0: '2,082 m', 3: '2,828 m', 5: '2,934 m', 9: '4,342 m' };
const RIDGE = 'M0 96V62l70-18 55 14 80-34 62 22 48-10 90 30 70-26 60 8 85-40 58 26 44-6 96 34 66-20 52 10 90-38 70 28 48-8 82 30 64-18 50 10 100-30V96z';

/** "What's special right now" follows the real calendar. */
function seasonFor(month: number): keyof typeof SEASON_IMAGE {
  if (month >= 2 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'monsoon';
  if (month >= 9 && month <= 10) return 'autumn';
  return 'winter';
}

function SecHead({ eyebrow, title, lede, action }: { eyebrow: string; title: string; lede?: string; action?: { href: string; label: string; external?: boolean } }) {
  return (
    <div className="sec-head rv">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
        {lede && <p className="lede">{lede}</p>}
      </div>
      {action && (action.external
        ? <a className="link" href={action.href} target="_blank" rel="noopener noreferrer">{action.label} <ArrowRight className="ico" aria-hidden="true" /></a>
        : <Link className="link" href={action.href}>{action.label} <ArrowRight className="ico" aria-hidden="true" /></Link>)}
    </div>
  );
}

export default async function HomeView({ lang }: { lang: Lang }) {
  const { t, href } = serverT(lang);
  const h = t.home;
  const v = h.v2;
  const destinations = (await getDestinations()).map((d: any) => localizeDestination(d, lang));
  const featuredBlogs = getFeaturedBlogPosts(6).map((p) => localizePost(p, lang));
  const faqs = getHomepageFAQs(lang);
  const [stays, treks] = await Promise.all([getPublishedProperties(), getPublishedTreks()]);
  // Only stays with their own photos are featured; the slideshows never show stand-in pictures.
  const featured = pickFeaturedStays(stays, 5);
  // Real counts only -- nothing here is a marketing number.
  const proof = [
    stays.length > 0 && { icon: BedDouble, text: fmt(h.proofStays, { n: stays.length }) },
    treks.length > 0 && { icon: Mountain, text: fmt(h.proofTreks, { n: treks.length }) },
    { icon: BookOpen, text: fmt(h.proofGuides, { n: blogPosts.length }) },
    { icon: MapPin, text: h.proofLocal },
  ].filter(Boolean) as { icon: typeof MapPin; text: string }[];
  const now = new Date();
  const seasonKey = seasonFor(now.getMonth());
  const season = h.seasons[seasonKey];
  const month = new Intl.DateTimeFormat(lang === 'hi' ? 'hi-IN' : 'en-IN', { month: 'long', timeZone: 'Asia/Kolkata' }).format(now);
  const [big, ...areaRest] = destinations;
  const triund = (treks as any[]).find((x) => x.slug === 'triund-trek');

  const sections = [
    featured.length > 0 && 'stays', 'areas', 'trail', 'experiences', 'gaddi', 'monk', 'season', 'packages', featuredBlogs.length > 0 && 'guides', 'faq',
  ].filter(Boolean).map((id) => ({ id: id as string, label: v.nav[id as string] }));

  return (
    <div className={`hm ${display.variable} ${mono.variable}`}>
      <JsonLd data={faqSchema(faqs)} />

      {/* HERO: the Dhauladhar, a living sky, and the booking panel beside the headline */}
      <section className="hero">
        <div className="hero-bg">
          <Image src={UNSPLASH_IMAGES.hero} alt={h.heroAlt} fill priority quality={75} sizes="100vw" />
        </div>
        <HeroAtmosphere />
        <div className="wrap">
          <div className="hero-grid">
            <div className="hero-copy">
              <span className="badge"><i aria-hidden="true" />{h.badge}</span>
              <h1 className="h1"><span className="ln">{h.h1a}</span><em className="ln">{h.h1b}</em></h1>
              <p className="intro">{h.intro}</p>
              <ul className="proof">
                {proof.map((p) => <li key={p.text}><p.icon className="ico" aria-hidden="true" />{p.text}</li>)}
              </ul>
            </div>
            <HeroSearch />
          </div>
          <div className="hero-foot">
            <a className="scrollcue" href={featured.length > 0 ? '#stays' : '#areas'}><i aria-hidden="true" />{v.exploreStays}</a>
            <div className="r">
              <HeroClock template={v.clock} phases={v.tod} />
              <p className="caption">{v.heroCaption}</p>
            </div>
          </div>
        </div>
        <svg className="ridge" viewBox="0 0 1440 96" preserveAspectRatio="none" aria-hidden="true"><path d={RIDGE} /></svg>
      </section>

      <HomeEffects sections={sections} navLabel={v.onThisPage} searchLabel={v.panelTitle} />

      {/* TRUST + WHY US */}
      <div className="wrap">
        <div className="trust rv">
          {h.trust.map((item, i) => {
            const Icon = TRUST_ICONS[i];
            return <div key={item.label}><Icon className="ico" aria-hidden="true" /><p><b>{item.label}</b><span>{item.desc}</span></p></div>;
          })}
        </div>
        <div className="why">
          <h2 className="why-title rv">{h.whyTitle}</h2>
          {h.why.map((item, i) => {
            const Icon = WHY_ICONS[i];
            return (
              <div key={item.title} className="rv">
                <span className="eyebrow" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Icon className="ico" aria-hidden="true" />{item.highlight}</span>
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      <Divider />

      {/* FEATURED STAYS: each card is a slideshow of the property's own photos */}
      {featured.length > 0 && (
        <section id="stays" className="sec">
          <div className="wrap">
            <SecHead eyebrow={v.staysEyebrow} title={v.staysTitle} lede={v.staysIntro} action={{ href: href('/hotels'), label: h.browseAllHotels }} />
            <div className={'stays' + (featured.length < 3 ? ' few' : '')}>
              {featured.map((p, i) => {
                const reviewed = (p.review_count || 0) > 0 && p.rating > 0;
                const typeLabel = (t.common.propertyTypes[p.type] || p.type) + (p.star_rating ? ` · ${p.star_rating}★` : '');
                const dest = destinations.find((d: any) => d.slug === p.destination_slug);
                return (
                  <StaySlider key={p.id} index={i} lead={featured.length >= 3 && i === 0}
                    href={href('/hotels/' + p.slug)} name={p.name} photos={p.photos}
                    typeLabel={typeLabel} area={t.places[p.destination_slug] || p.destination_slug} altitude={dest?.altitude}
                    price={p.price_min > 0 ? formatPrice(p.price_min) : undefined} perNight={t.common.perNight} from={v.from}
                    rating={reviewed ? p.rating : undefined} desc={p.short_description}
                    labels={{ photoOf: v.photoOf, prev: v.prevPhoto, next: v.nextPhoto }} />
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* PLACE TICKER */}
      <div className="ticker" aria-hidden="true">
        <ul>
          {[0, 1].flatMap((copy) => v.ticker.map((name, i) => (
            <li key={copy + '-' + i}>{name}{TICKER_ALT[i] && <span className="alt">{TICKER_ALT[i]}</span>}</li>
          )))}
        </ul>
      </div>

      {/* BEST AREAS TO STAY */}
      <section id="areas" className="sec">
        <div className="wrap">
          <SecHead eyebrow={v.areasEyebrow} title={h.areasTitle} lede={h.areasSubtitle} action={{ href: href('/hotels'), label: h.browseAllHotels }} />
          <div className="bento">
            {big && (
              <Link className="area big rv" href={href('/destinations/' + big.slug)}>
                <Image src={big.image} alt={big.image_alt || big.name} fill sizes="(max-width:560px) 100vw, 50vw" />
                {big.altitude && <span className="alt">{big.altitude}</span>}
                <h3>{big.name}</h3><p>{big.tagline}</p>
              </Link>
            )}
            {areaRest.map((d: any) => (
              <Link key={d.id} className="area rv" href={href('/destinations/' + d.slug)}>
                <Image src={d.image} alt={d.image_alt || d.name} fill sizes="(max-width:560px) 100vw, 25vw" />
                {d.altitude && <span className="alt">{d.altitude}</span>}
                <h3>{d.name}</h3><p>{d.tagline}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ON THE TRAIL */}
      <TrailSection beats={v.trekBeats} bookHref={href(triund ? '/treks/' + triund.slug : '/treks')} allHref={href('/treks')}
        labels={{ eyebrow: v.trekEyebrow, title: v.trekTitle, intro: v.trekIntro, book: v.trekBook, all: v.trekCta, photos: v.trekPhotos, photoBy: v.trekPhotoBy }}
        stats={triund ? [
          { icon: 'time' as const, label: v.trekStatTime, value: triund.duration },
          { icon: 'top' as const, label: v.trekStatTop, value: v.trekBeats[3].alt },
          ...(triund.price_per_person > 0 ? [{ icon: 'price' as const, label: v.trekStatFrom, value: formatPrice(triund.price_per_person) + ' ' + t.common.perPerson }] : []),
        ] : []} />

      {/* EXPERIENCES */}
      <section id="experiences" className="sec dark">
        <div className="wrap split">
          <SecHead eyebrow={v.expEyebrow} title={h.expTitle} lede={h.expIntro} />
          <div className="exp">
            {h.experiences.map((exp, i) => (
              <Link key={exp.title} className="xp rv" href={href(EXP[i].href)}>
                <span className="glare" aria-hidden="true" />
                <Image src={EXP[i].image} alt={exp.title} fill sizes="(max-width:960px) 100vw, 33vw" />
                <span className="from">{exp.price}</span>
                <h3>{exp.title}</h3>
                <p>{exp.desc}</p>
                <span className="link">{v.expCtas[i]} <ArrowRight className="ico" aria-hidden="true" /></span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* GADDI SHEPHERDS AND THE GADDAN: one compact section of real photos */}
      <section id="gaddi" className="sec gaddi">
        <div className="wrap gaddi-grid">
          <div className="gaddi-copy rv">
            <span className="eyebrow">{v.gaddiEyebrow}</span>
            <h2>{v.gaddiTitleA} <em>{v.gaddiTitleB}</em></h2>
            <p className="lede">{v.gaddiIntro}</p>
            <ol className="gyear">
              {v.cycle.map((c) => <li key={c.title}><span className="alt">{c.alt}</span><b>{c.title}</b><span>{c.desc}</span></li>)}
            </ol>
            <div className="gpair">
              {[v.shepherd, v.gaddan].map((c) => (
                <div key={c.title}><span className="eyebrow">{c.eyebrow}</span><h3>{c.title}</h3><p>{c.intro}</p></div>
              ))}
            </div>
            <p className="respect">{v.respect}</p>
          </div>
          <div className="gcollage" role="region" aria-label={v.reelLabel}>
            {gaddiPhotos.map((ph, i) => (
              <figure key={ph.file} className="rv">
                <Image src={`/images/gaddi/${ph.file}.jpg`} alt={v.photos[i]} fill sizes={i === 0 ? '(max-width:960px) 100vw, 30vw' : '(max-width:960px) 50vw, 15vw'} />
                <figcaption>{v.photos[i]}<small>{v.photoCredit.split('{name}')[0]}<a href={ph.source} target="_blank" rel="noopener noreferrer">{ph.author}</a>{v.photoCredit.split('{name}')[1]}</small></figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* MONASTERIES: dawn kora to evening lamps */}
      <section id="monk" className="sec monk">
        <div className="wrap split">
          <SecHead eyebrow={v.monkEyebrow} title={`${v.monkTitleA} ${v.monkTitleB}`} lede={v.monkIntro} action={{ href: '/monasteries-meditation', label: v.monkCta }} />
          <div>
          <MonasteryDay
            moments={[0, 1, 3, 4].map((d, i) => {
              const ph = monasteryPhotos.find((x) => x.file === monasteryDay[d].photo)!;
              return { ...v.monkMoments[i], img: `/images/monasteries/${ph.file}.jpg`, alt: ph.alt, credit: { author: ph.author, license: ph.license, licenseUrl: ph.license_url, source: ph.source } };
            })}
            labels={{ soundOn: v.monkSoundOn, soundOff: v.monkSoundOff, moment: v.monkMoment }} />
          <p className="monk-note">{v.monkNote}</p>
          </div>
        </div>
      </section>

      {/* THIS MONTH */}
      <section id="season" className="sec">
        <div className="wrap">
          <div className="month rv">
            <div className="ph">
              <Image src={placeImage(SEASON_IMAGE[seasonKey])} alt={v.seasonTitles[seasonKey]} fill sizes="(max-width:960px) 100vw, 45vw" />
              <span className="tag">{month}</span>
            </div>
            <div className="bd">
              <span className="eyebrow">{h.nowTitle}</span>
              <h2>{v.seasonTitles[seasonKey]}</h2>
              <p className="lede">{season.intro}</p>
              <ul className="picks">
                {season.items.map((s) => <li key={s.title}><b>{s.title}</b><span>{s.desc}</span></li>)}
              </ul>
              <Link className="link" href={href('/blog/best-time-to-visit-dharamshala')}>{h.monthGuide} <ArrowRight className="ico" aria-hidden="true" /></Link>
            </div>
          </div>
        </div>
      </section>

      <Divider />

      {/* PACKAGES */}
      <section id="packages" className="sec">
        <div className="wrap split">
          <SecHead eyebrow={v.pkgEyebrow} title={h.pkgTitle} lede={`${h.pkgIntro} ${h.customizable}`} action={{ href: getWhatsAppLink(h.customMsg), label: h.customQuote, external: true }} />
          <div className="pkgs">
            {h.packages.map((pkg, i) => (
              <div key={pkg.title} className={'pkg rv' + (i === 0 ? ' hot' : '')}>
                <div className="top"><span className="tagl">{pkg.tag}</span><span className="dur">{pkg.duration}</span></div>
                <h3>{pkg.title}</h3>
                <p className="inc">{pkg.desc}</p>
                <p className="amt">{pkg.price} <small>{t.common.perPerson}</small></p>
                <a className={'btn ' + (i === 0 ? 'btn-sf' : 'btn-line')} href={getWhatsAppLink(fmt(h.pkgWhatsApp, { name: pkg.title }))} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="ico" aria-hidden="true" />{h.enquire}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TRAVEL GUIDES */}
      {featuredBlogs.length > 0 && (
        <>
        <Divider />
        <section id="guides" className="sec">
          <div className="wrap">
            <SecHead eyebrow={v.guidesEyebrow} title={h.guidesTitle} lede={h.guidesSubtitle} action={{ href: href('/blog'), label: h.allGuides }} />
            <div className="guides-grid">
              {featuredBlogs.map((p) => <div key={p.id} className="rv"><BlogCard post={p} lang={lang} /></div>)}
            </div>
            <div className="guides-more">
              <Link href={href('/faq')} className="btn btn-line">{t.common.qa}</Link>
            </div>
            <nav className="popular" aria-label={h.popularTitle}>
              <h3>{h.popularTitle}</h3>
              <ul>{h.popular.map((l) => <li key={l.href}><Link href={href(l.href)}>{l.label}</Link></li>)}</ul>
            </nav>
          </div>
        </section>
        </>
      )}

      {/* REVIEWS -- only real Google reviews; set NEXT_PUBLIC_GOOGLE_REVIEW_URL to show this */}
      {process.env.NEXT_PUBLIC_GOOGLE_REVIEW_URL && (
        <section className="sec" style={{ paddingTop: 0, textAlign: 'center' }}>
          <div className="wrap">
            <h2 style={{ fontSize: 'clamp(26px,3.4vw,36px)' }}>{h.reviewTitle}</h2>
            <p style={{ color: 'var(--muted)', margin: '12px auto 20px', maxWidth: 520 }}>{h.reviewIntro}</p>
            <a href={process.env.NEXT_PUBLIC_GOOGLE_REVIEW_URL} target="_blank" rel="noopener noreferrer" className="btn btn-sf"><Star className="ico" aria-hidden="true" /> {h.reviewCta}</a>
          </div>
        </section>
      )}

      <Divider />

      {/* FAQ */}
      <section id="faq" className="sec">
        <div className="wrap faq">
          <div className="rv"><span className="eyebrow">{v.faqEyebrow}</span><h2>{h.faqTitle}</h2>
            <p style={{ marginTop: 16 }}><Link className="link" href={href('/faq')}>{h.allQa} <ArrowRight className="ico" aria-hidden="true" /></Link></p>
          </div>
          <div><FAQSection faqs={faqs} /></div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="cta">
        <Image src={placeImage('dharamshala-snow')} alt="" fill sizes="100vw" />
        <svg className="ridge-top" viewBox="0 0 1440 96" preserveAspectRatio="none" aria-hidden="true"><path d={RIDGE} /></svg>
        <div className="wrap">
          <div className="cta-in">
            <h2>{v.ctaLead} <em>{v.ctaEm}</em></h2>
            <p>{h.ctaIntro}</p>
            <div className="btns">
              <Link href={href('/hotels')} className="btn btn-sf">{t.common.browseHotels} <ArrowRight className="ico" aria-hidden="true" /></Link>
              <a href={getWhatsAppLink(h.ctaMsg)} target="_blank" rel="noopener noreferrer" className="btn btn-ghost"><MessageCircle className="ico" aria-hidden="true" />{h.ctaWhatsApp}</a>
            </div>
          </div>
        </div>
      </section>

      {/* LIST YOUR PROPERTY -- aimed at owners, so it waits until the traveller content is done */}
      <section className="partner">
        <div className="wrap">
          <div><h2 style={{ font: '600 20px/1.2 var(--display)' }}>{h.ownerTitle}</h2><span>{h.ownerIntro}</span></div>
          <Link href="/partner/register" className="btn btn-ghost">{h.ownerCta} <ArrowRight className="ico" aria-hidden="true" /></Link>
        </div>
      </section>
    </div>
  );
}
