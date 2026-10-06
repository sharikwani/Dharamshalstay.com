const CANONICAL_ORIGIN = 'https://www.dharamshalastay.com';

function normaliseSiteUrl(envUrl?: string): string {
  if (!envUrl) return CANONICAL_ORIGIN;
  const trimmed = envUrl.trim().replace(/\/+$/, '');
  // Production domain must always be https + www, whatever the env var says.
  if (/^https?:\/\/(www\.)?dharamshalastay\.com$/i.test(trimmed)) return CANONICAL_ORIGIN;
  return trimmed;
}

export const siteConfig = {
  name: 'Dharamshala Stay',
  // IMPORTANT: must match the domain the site actually serves on (www).
  // next.config.js 301s the bare domain to www, so a non-www value here makes
  // every canonical/sitemap URL a redirect. We normalise whatever the env says.
  url: normaliseSiteUrl(process.env.NEXT_PUBLIC_SITE_URL),
  description: 'Discover the best hotels, homestays, treks, paragliding, and experiences in Dharamshala, McLeod Ganj & the Kangra Valley.',
  phone: process.env.NEXT_PUBLIC_PHONE || '+91-98057-00665',
  email: process.env.NEXT_PUBLIC_EMAIL || 'hello@dharamshalastay.com',
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '919805700665',
  address: 'Dharamshala, Kangra District, Himachal Pradesh 176215, India',
  instagram: 'https://www.instagram.com/dharamshala.stay/',
  instagramHandle: 'dharamshala.stay',
};

export const NAV_LINKS = [
  { label: 'Hotels', href: '/hotels' },
  { label: 'Treks', href: '/treks' },
  { label: 'Paragliding', href: '/paragliding' },
  { label: 'Taxi', href: '/taxi' },
  { label: 'Travel Guides', href: '/blog' },
  { label: 'FAQ', href: '/faq' },
  { label: 'Contact', href: '/contact' },
] as const;

export const DESTINATION_LINKS = [
  { label: 'Dharamshala', href: '/destinations/dharamshala', slug: 'dharamshala' },
  { label: 'McLeod Ganj', href: '/destinations/mcleod-ganj', slug: 'mcleod-ganj' },
  { label: 'Bhagsu', href: '/destinations/bhagsu', slug: 'bhagsu' },
  { label: 'Dharamkot', href: '/destinations/dharamkot', slug: 'dharamkot' },
  { label: 'Naddi', href: '/destinations/naddi', slug: 'naddi' },
] as const;

export const BOOKING_CATEGORIES = ['hotel', 'taxi', 'trek', 'paragliding'] as const;
export type BookingCategory = (typeof BOOKING_CATEGORIES)[number];
