import Link from 'next/link';
import { Mountain, Mail, Phone, MapPin, Instagram } from 'lucide-react';
import { siteConfig, DESTINATION_LINKS } from '@/lib/config';
import { fmt, getDict } from '@/lib/i18n/dict';
import { localizePath, type Lang } from '@/lib/i18n/core';

const GUIDE_SLUGS = [
  'dharamshala-complete-travel-guide', 'places-to-visit-in-dharamshala', 'things-to-do-in-mcleod-ganj',
  'how-to-reach-dharamshala', 'best-time-to-visit-dharamshala', 'triund-trek-complete-guide',
  'dharamshala-in-winter-snowfall', 'palampur-travel-guide', 'himachal-itinerary-delhi-dharamshala-manali',
] as const;

// Server component: the root layout already knows the language, so no client JS is needed.
export default function Footer({ lang }: { lang: Lang }) {
  const t = getDict(lang);
  const href = (p: string) => localizePath(p, lang);
  const quick = [
    { label: t.nav.hotels, href: '/hotels' }, { label: t.nav.treks, href: '/treks' },
    { label: t.nav.paragliding, href: '/paragliding' }, { label: t.nav.taxi, href: '/taxi' },
    { label: t.nav.guides, href: '/blog' }, { label: t.nav.essentials, href: '/essentials' },
    { label: t.nav.faq, href: '/faq' },
    { label: t.nav.contact, href: '/contact' }, { label: t.footer.allDestinations, href: '/destinations' },
    { label: t.footer.aboutUs, href: '/about' },
  ];

  return (
    <footer className="bg-slate-900 text-slate-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          <div>
            <Link href={href('/')} className="flex items-center gap-2 mb-4"><Mountain className="h-6 w-6 text-orange-500" /><span className="text-lg font-heading font-bold text-white">Dharamshala Stay</span></Link>
            <p className="text-sm text-slate-400 mb-4">{t.footer.description}</p>
            <div className="space-y-2 text-sm">
              <a href={`tel:${siteConfig.phone}`} className="flex items-center gap-2 hover:text-orange-400"><Phone className="h-4 w-4 text-orange-500" /> {siteConfig.phone}</a>
              <a href={`mailto:${siteConfig.email}`} className="flex items-center gap-2 hover:text-orange-400"><Mail className="h-4 w-4 text-orange-500" /> {siteConfig.email}</a>
              <p className="flex items-start gap-2"><MapPin className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />{t.footer.address}</p>
              <a href={siteConfig.instagram} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-orange-400"><Instagram className="h-4 w-4 text-orange-500" /> @{siteConfig.instagramHandle}</a>
            </div>
          </div>
          <div>
            <h2 className="text-white font-semibold mb-4">{t.footer.quickLinks}</h2>
            <ul className="space-y-2 text-sm">
              {quick.map((l) => <li key={l.href}><Link href={href(l.href)} className="hover:text-orange-400">{l.label}</Link></li>)}
              <li><Link href="/partner/register" className="hover:text-orange-400">{t.nav.listProperty}</Link></li>
            </ul>
          </div>
          <div>
            <h2 className="text-white font-semibold mb-4">{t.footer.whereToStay}</h2>
            <ul className="space-y-2 text-sm">
              {DESTINATION_LINKS.map((l) => (
                <li key={l.href}><Link href={href(l.href)} className="hover:text-orange-400">{fmt(t.footer.hotelsIn, { place: t.places[l.slug] })}</Link></li>
              ))}
              <li><Link href={href('/blog/dharamshala-vs-mcleod-ganj')} className="hover:text-orange-400">{t.footer.dharamshalaVsMcleod}</Link></li>
            </ul>
          </div>
          <div>
            <h2 className="text-white font-semibold mb-4">{t.footer.travelGuides}</h2>
            <ul className="space-y-2 text-sm">
              {GUIDE_SLUGS.map((s) => <li key={s}><Link href={href('/blog/' + s)} className="hover:text-orange-400">{t.footer.guides[s]}</Link></li>)}
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-800 mt-10 pt-8 pb-20 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>&copy; {new Date().getFullYear()} {siteConfig.name}. {t.footer.rights}</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/privacy" className="hover:text-slate-300">{t.footer.privacy}</Link>
            <Link href="/terms" className="hover:text-slate-300">{t.footer.terms}</Link>
            <Link href="/cancellation-policy" className="hover:text-slate-300">{t.footer.cancellation}</Link>
            <Link href="/disclaimer" className="hover:text-slate-300">{t.footer.disclaimer}</Link>
            <Link href="/photo-credits" className="hover:text-slate-300">{t.footer.photoCredits}</Link>
            <Link href="/sitemap-html" className="hover:text-slate-300">{t.footer.sitemap}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
