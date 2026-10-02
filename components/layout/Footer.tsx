import Link from 'next/link';
import { Mountain, Mail, Phone, MapPin } from 'lucide-react';
import { siteConfig, NAV_LINKS, DESTINATION_LINKS } from '@/lib/config';

const GUIDE_LINKS = [
  { href: '/blog/places-to-visit-in-dharamshala', label: 'Places to Visit in Dharamshala' },
  { href: '/blog/things-to-do-in-mcleod-ganj', label: 'Things to Do in McLeod Ganj' },
  { href: '/blog/how-to-reach-dharamshala', label: 'How to Reach Dharamshala' },
  { href: '/blog/best-time-to-visit-dharamshala', label: 'Best Time to Visit' },
  { href: '/blog/triund-trek-complete-guide', label: 'Triund Trek Guide' },
  { href: '/blog/dharamshala-in-winter-snowfall', label: 'Snowfall in Dharamshala' },
  { href: '/blog/palampur-travel-guide', label: 'Palampur Travel Guide' },
  { href: '/blog/places-to-visit-in-kangra', label: 'Places to Visit in Kangra' },
  { href: '/blog/himachal-itinerary-delhi-dharamshala-manali', label: 'Himachal 7-Day Itinerary' },
];

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          <div>
            <Link href="/" className="flex items-center gap-2 mb-4"><Mountain className="h-6 w-6 text-orange-500" /><span className="text-lg font-heading font-bold text-white">Dharamshala Stay</span></Link>
            <p className="text-sm text-slate-400 mb-4">{siteConfig.description}</p>
            <div className="space-y-2 text-sm">
              <a href={`tel:${siteConfig.phone}`} className="flex items-center gap-2 hover:text-orange-400"><Phone className="h-4 w-4 text-orange-500" /> {siteConfig.phone}</a>
              <a href={`mailto:${siteConfig.email}`} className="flex items-center gap-2 hover:text-orange-400"><Mail className="h-4 w-4 text-orange-500" /> {siteConfig.email}</a>
              <p className="flex items-start gap-2"><MapPin className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />{siteConfig.address}</p>
            </div>
          </div>
          <div>
            <h2 className="text-white font-semibold mb-4">Quick Links</h2>
            <ul className="space-y-2 text-sm">
              {NAV_LINKS.map((l) => <li key={l.href}><Link href={l.href} className="hover:text-orange-400">{l.label}</Link></li>)}
              <li><Link href="/destinations" className="hover:text-orange-400">All Destinations</Link></li>
              <li><Link href="/about" className="hover:text-orange-400">About Us</Link></li>
              <li><Link href="/partner/register" className="hover:text-orange-400">List Your Property</Link></li>
            </ul>
          </div>
          <div>
            <h2 className="text-white font-semibold mb-4">Where to Stay</h2>
            <ul className="space-y-2 text-sm">
              {DESTINATION_LINKS.map((l) => <li key={l.href}><Link href={l.href} className="hover:text-orange-400">Hotels in {l.label}</Link></li>)}
              <li><Link href="/blog/dharamshala-vs-mcleod-ganj" className="hover:text-orange-400">Dharamshala vs McLeod Ganj</Link></li>
            </ul>
          </div>
          <div>
            <h2 className="text-white font-semibold mb-4">Travel Guides</h2>
            <ul className="space-y-2 text-sm">
              {GUIDE_LINKS.map((l) => <li key={l.href}><Link href={l.href} className="hover:text-orange-400">{l.label}</Link></li>)}
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-800 mt-10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>&copy; {new Date().getFullYear()} {siteConfig.name}. All rights reserved.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/privacy" className="hover:text-slate-300">Privacy</Link>
            <Link href="/terms" className="hover:text-slate-300">Terms</Link>
            <Link href="/cancellation-policy" className="hover:text-slate-300">Cancellation</Link>
            <Link href="/disclaimer" className="hover:text-slate-300">Disclaimer</Link>
            <Link href="/photo-credits" className="hover:text-slate-300">Photo Credits</Link>
            <Link href="/sitemap-html" className="hover:text-slate-300">Sitemap</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
