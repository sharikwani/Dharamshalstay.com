import { Metadata } from 'next';
import { siteConfig } from './config';
import { hasHindiVersion, localizePath, type Lang } from './i18n/core';
import { normalizeImages, roomImageUrls } from './images';
import { areaName, isDirectoryListing } from './listing';
import { mapLinks } from './location';
import type { PublicReview, ReviewFeed, ReviewSummary } from './reviews/types';

interface SEOProps {
  title: string;
  description: string;
  path: string;
  image?: string;
  type?: 'website' | 'article';
  noindex?: boolean;
  publishedTime?: string;
  modifiedTime?: string;
  keywords?: string[];
  /** Language of THIS page. `path` is always the English path. */
  lang?: Lang;
  /** Whether a Hindi version of this page exists (defaults to the section rule). */
  hindi?: boolean;
  /** Short label on the share image, e.g. 'From Rs.2,500/night' or '2 days - Moderate'. */
  ogTag?: string;
  /** Page has a Markdown twin at `path + '.md'` for AI assistants (see lib/llms.ts). */
  markdown?: boolean;
}

/**
 * Branded 1200x630 share image (app/og/route.tsx): the page photo with its
 * title on top, so every shared link gets a picture that says what it is.
 */
export function ogImageUrl(title: string, image?: string, tag?: string): string {
  const q = new URLSearchParams({ title });
  if (image) q.set('image', image);
  if (tag) q.set('tag', tag);
  return siteConfig.url + '/og.jpg?' + q.toString();
}

/**
 * Generates consistent SEO metadata for a page.
 *
 * Fixes:
 * 1. Title uses `absolute` so the layout title template can never append
 *    the site name a second time.
 * 2. Canonical URLs come from siteConfig.url which must match the serving
 *    domain (https://www.dharamshalastay.com).
 * 3. metadataBase set so relative URLs resolve correctly.
 */
export const TITLE_MAX = 60;

export function generateSEO({
  title,
  description,
  path,
  image,
  type = 'website',
  noindex = false,
  publishedTime,
  modifiedTime,
  keywords,
  lang = 'en',
  hindi,
  ogTag,
  markdown = false,
}: SEOProps): Metadata {
  const suffix = ' | ' + siteConfig.name;
  const baseTitle = title.endsWith(suffix) ? title.slice(0, -suffix.length) : title;
  // Google cuts titles at about 60 characters and already shows the site name above each result,
  // so the brand suffix is added only when it still fits.
  const fullTitle = baseTitle.includes(siteConfig.name) || (baseTitle + suffix).length > TITLE_MAX ? baseTitle : baseTitle + suffix;

  const hasHi = hindi ?? hasHindiVersion(path);
  const enUrl = siteConfig.url + (path === '/' ? '' : path);
  const hiUrl = siteConfig.url + localizePath(path, 'hi');
  // A Hindi URL without a real translation points search engines at the English page.
  const url = lang === 'hi' && hasHi ? hiUrl : enUrl;
  const languages = hasHi ? { 'en-IN': enUrl, 'hi-IN': hiUrl, 'x-default': enUrl } : undefined;
  const ogImage = ogImageUrl(baseTitle, image, ogTag);
  // AI assistants can fetch a clean Markdown copy (English only).
  const types = markdown && lang === 'en' ? { 'text/markdown': enUrl + '.md' } : undefined;

  return {
    metadataBase: new URL(siteConfig.url),
    title: { absolute: fullTitle },
    description,
    keywords: keywords?.join(', '),
    authors: [{ name: siteConfig.name }],
    creator: siteConfig.name,
    publisher: siteConfig.name,
    robots: noindex
      ? { index: false, follow: false }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
          },
        },
    alternates: { canonical: url, ...(languages && { languages }), ...(types && { types }) },
    openGraph: {
      type,
      url,
      title: fullTitle,
      description,
      siteName: siteConfig.name,
      locale: lang === 'hi' ? 'hi_IN' : 'en_IN',
      ...(hasHi && { alternateLocale: lang === 'hi' ? ['en_IN'] : ['hi_IN'] }),
      images: [{ url: ogImage, width: 1200, height: 630, alt: baseTitle, type: 'image/jpeg' }],
      ...(type === 'article' && publishedTime ? { publishedTime } : {}),
      ...(type === 'article' && modifiedTime ? { modifiedTime } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [{ url: ogImage, alt: baseTitle }],
    },
  };
}

type RatingSummary = Pick<ReviewSummary, 'count' | 'average'>;

/** "Rated 4.7/5 by 3 guests" from approved reviews, or '' when there are none. */
export function ratedPhrase(reviews?: RatingSummary): string {
  const n = reviews?.count ?? 0;
  return n >= 1 ? 'Rated ' + reviews!.average + '/5 by ' + n + (n === 1 ? ' guest' : ' guests') : '';
}

/**
 * Auto-generated SEO for hotel pages. meta_title/meta_description win when set. Otherwise:
 * "<Name>, <Area> · Rated <x>/5 by <n> guests · Rooms from ₹<min>" (rating only from approved
 * reviews, n >= 1), falling back to the older keyword text when there is no rating and no price.
 */
export function generateHotelSEO(hotel: {
  name: string; meta_title?: string; meta_description?: string;
  short_description?: string; description?: string;
  type?: string; city?: string; destination_slug?: string;
  price_min?: number; price_max?: number;
  star_rating?: number; rating?: number; review_count?: number;
  slug: string; images?: any[];
}, lang: Lang = 'en', reviews?: RatingSummary): Metadata {
  if (lang === 'hi') return generateHotelSEOHindi(hotel, reviews);
  const area = hotel.destination_slug ? areaName(hotel.destination_slug) : hotel.city || 'Dharamshala';
  const typeLabel = hotel.type ? hotel.type.charAt(0).toUpperCase() + hotel.type.slice(1) : 'Hotel';
  const starText = hotel.star_rating ? hotel.star_rating + '-Star ' : '';
  const priceText = hotel.price_min ? ' from ₹' + hotel.price_min + '/night' : '';

  const parts = [
    hotel.name + ', ' + area,
    ratedPhrase(reviews),
    hotel.price_min && hotel.price_min > 0 ? 'Rooms from ₹' + hotel.price_min.toLocaleString('en-IN') : '',
  ].filter(Boolean);
  const templated = parts.length > 1 ? parts.join(' · ') : null;
  const tail = ' ' + (hotel.short_description || '') + ' Direct booking, best prices, local support.';

  const autoTitle = templated || hotel.name + ' – ' + starText + typeLabel + ' in ' + area + priceText;
  const autoDescription = ((templated
    ? templated + '.'
    : 'Book ' + hotel.name + ', a ' + starText.toLowerCase() + typeLabel.toLowerCase() + ' in ' + area + priceText + '.'
  ) + tail).replace(/\s+/g, ' ').trim().substring(0, 160);

  const title = hotel.meta_title || autoTitle;
  const description = hotel.meta_description || autoDescription;
  const primaryImage = hotel.images?.[0]?.url || hotel.images?.[0];
  const imageUrl = typeof primaryImage === 'string' ? primaryImage : undefined;

  const keywords = [
    hotel.name, 'hotel in ' + area, area + ' hotels',
    typeLabel.toLowerCase() + ' in Dharamshala', 'best hotels ' + area,
    'book ' + hotel.name, 'Dharamshala accommodation', 'McLeod Ganj stays',
    area + ' stay', 'Dharamshala booking',
  ];

  return generateSEO({
    title, description,
    path: '/hotels/' + hotel.slug,
    image: imageUrl,
    keywords,
    ogTag: hotel.price_min ? 'From ₹' + hotel.price_min.toLocaleString('en-IN') + '/night' : typeLabel + ' in ' + area,
    markdown: true,
  });
}

const HI_AREAS: Record<string, string> = { dharamshala: 'धर्मशाला', 'mcleod-ganj': 'मैक्लोडगंज', bhagsu: 'भागसू', dharamkot: 'धर्मकोट', naddi: 'नड्डी' };
const HI_TYPES: Record<string, string> = { hotel: 'होटल', homestay: 'होमस्टे', hostel: 'हॉस्टल', guesthouse: 'गेस्टहाउस', resort: 'रिसॉर्ट', villa: 'विला', camp: 'कैंप' };

function generateHotelSEOHindi(hotel: { name: string; short_description?: string; type?: string; destination_slug?: string; price_min?: number; slug: string; images?: any[] }, reviews?: RatingSummary): Metadata {
  const area = HI_AREAS[hotel.destination_slug || ''] || 'धर्मशाला';
  const type = HI_TYPES[hotel.type || ''] || 'होटल';
  const price = hotel.price_min ? ' -- ₹' + hotel.price_min.toLocaleString('en-IN') + '/रात से' : '';
  const n = reviews?.count ?? 0;
  const rated = n >= 1 ? ' · ' + reviews!.average + '/5 रेटिंग (' + n + ' मेहमान)' : '';
  const primaryImage = hotel.images?.[0]?.url || hotel.images?.[0];
  return generateSEO({
    title: hotel.name + ' -- ' + area + ' में ' + type + price + rated,
    description: (hotel.name + ', ' + area + ' में ' + type + '।' + (n >= 1 ? ' मेहमानों की रेटिंग ' + reviews!.average + '/5 (' + n + ' रिव्यू)।' : '') + ' ' + (hotel.short_description || '') + ' लोकेशन, फ़ोटो, आसपास की जगहें और बुकिंग में मदद।').slice(0, 158),
    path: '/hotels/' + hotel.slug,
    image: typeof primaryImage === 'string' ? primaryImage : undefined,
    keywords: [hotel.name, area + ' में ' + type, area + ' होटल'],
    lang: 'hi',
    ogTag: hotel.price_min ? '₹' + hotel.price_min.toLocaleString('en-IN') + '/रात से' : area + ' में ' + type,
  });
}

const absUrl = (u: string) => (/^https?:\/\//.test(u) ? u : siteConfig.url + (u.startsWith('/') ? u : '/' + u));

/** Up to `max` absolute photo URLs: property photos first, then photos of active rooms, no duplicates. */
export function hotelImageUrls(h: { images?: any[]; rooms?: any[] }, max = 10): string[] {
  const roomUrls = (h.rooms || []).filter((r: any) => r?.is_active !== false).map(roomImageUrls);
  const all = normalizeImages(h.images).map((i) => i.url).concat(...roomUrls).map(absUrl);
  return Array.from(new Set(all)).slice(0, max);
}

function hotelRoomSchema(r: any, priced = true) {
  const image = roomImageUrls(r)[0];
  return {
    '@type': 'HotelRoom',
    name: r.name,
    ...(r.description ? { description: r.description } : {}),
    ...(image ? { image: absUrl(image) } : {}),
    ...(r.max_occupancy > 0 ? { occupancy: { '@type': 'QuantitativeValue', maxValue: r.max_occupancy, unitCode: 'C62' } } : {}),
    ...(r.bed_type ? { bed: { '@type': 'BedDetails', typeOfBed: r.bed_type } } : {}),
    ...(priced && r.base_price > 0 ? { offers: { '@type': 'Offer', price: r.base_price, priceCurrency: 'INR', availability: 'https://schema.org/InStock' } } : {}),
  };
}

function reviewSchema(r: PublicReview) {
  return {
    '@type': 'Review',
    author: { '@type': 'Person', name: r.name },
    datePublished: r.created_at.slice(0, 10),
    name: r.title,
    reviewRating: { '@type': 'Rating', ratingValue: r.rating, bestRating: 5, worstRating: 1 },
    reviewBody: r.body.length > 500 ? r.body.slice(0, 499).trimEnd() + '…' : r.body,
  };
}

/**
 * Full Hotel schema: photos, rooms (HotelRoom + Offer), amenities and, only when there are
 * approved reviews, aggregateRating and the latest 5 reviews. properties.rating is never used.
 * A directory listing shows no prices on its page, so its schema carries no offers or price range.
 */
export function hotelSchemaFull(h: {
  name: string; description?: string; short_description?: string;
  address_line1?: string; city?: string; state?: string; pincode?: string;
  destination_slug?: string;
  rating?: number; review_count?: number;
  price_min?: number; price_max?: number;
  latitude?: number; longitude?: number;
  slug: string; type?: string; star_rating?: number;
  check_in_time?: string; check_out_time?: string;
  amenities?: string[]; images?: any[]; total_rooms?: number;
  rooms?: any[]; listing_type?: string;
}, reviews?: ReviewFeed, lang: Lang = 'en') {
  const priced = !isDirectoryListing(h);
  const area = h.destination_slug ? areaName(h.destination_slug) : h.city || 'Dharamshala';
  const images = hotelImageUrls(h);
  const activeRooms = (h.rooms || []).filter((r: any) => r?.name && r.is_active !== false);
  const s = reviews?.summary;
  const rated = !!s && s.count > 0;

  const roomOffers = (priced ? h.rooms || [] : []).filter((r: any) => r.base_price > 0).map((r: any) => ({
    '@type': 'Offer',
    name: r.name || 'Room',
    description: r.description || '',
    price: r.base_price,
    priceCurrency: 'INR',
    availability: r.is_active === false ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock',
    ...(r.bed_type && { additionalProperty: { '@type': 'PropertyValue', name: 'Bed Type', value: r.bed_type } }),
  }));

  return {
    '@context': 'https://schema.org',
    '@type': 'Hotel',
    name: h.name,
    description: h.description || h.short_description || '',
    url: siteConfig.url + localizePath('/hotels/' + h.slug, lang),
    ...(images.length > 0 ? { image: images } : {}),
    ...(h.star_rating && { starRating: { '@type': 'Rating', ratingValue: h.star_rating } }),
    address: {
      '@type': 'PostalAddress',
      streetAddress: h.address_line1 || '',
      addressLocality: area,
      addressRegion: h.state || 'Himachal Pradesh',
      postalCode: h.pincode || '176215',
      addressCountry: 'IN',
    },
    ...(h.latitude && h.longitude && {
      geo: { '@type': 'GeoCoordinates', latitude: Number(h.latitude), longitude: Number(h.longitude) },
      hasMap: mapLinks(h.latitude, h.longitude).view,
    }),
    ...(rated ? {
      aggregateRating: { '@type': 'AggregateRating', ratingValue: s!.average, ratingCount: s!.count, reviewCount: s!.count, bestRating: 5, worstRating: 1 },
    } : {}),
    ...(rated && reviews!.latest.length > 0 ? { review: reviews!.latest.slice(0, 5).map(reviewSchema) } : {}),
    ...(priced && h.price_min && h.price_max && {
      priceRange: '₹' + h.price_min + '–₹' + h.price_max,
    }),
    ...(h.check_in_time && { checkinTime: h.check_in_time }),
    ...(h.check_out_time && { checkoutTime: h.check_out_time }),
    ...(h.total_rooms && h.total_rooms > 0 ? { numberOfRooms: h.total_rooms } : {}),
    ...(h.amenities?.length && {
      amenityFeature: h.amenities.map((a: string) => ({
        '@type': 'LocationFeatureSpecification', name: a, value: true,
      })),
    }),
    // No telephone/email: the hotel's phone is shared with guests only after they book.
    ...(activeRooms.length > 0 ? { containsPlace: activeRooms.map((r: any) => hotelRoomSchema(r, priced)) } : {}),
    ...(roomOffers.length > 0 && { makesOffer: roomOffers }),
  };
}

// Backward-compatible simple version
export function hotelSchema(h: { name: string; description: string; address_line1: string; rating: number; review_count: number; price_min: number; price_max: number; latitude?: number; longitude?: number; slug: string }) {
  return hotelSchemaFull(h as any);
}

export function localBusinessSchema() {
  // Same @id as the Organization block, so search engines read them as one business.
  return { '@context': 'https://schema.org', '@type': 'TravelAgency', '@id': siteConfig.url + '/#organization', name: siteConfig.name, url: siteConfig.url, telephone: siteConfig.phone, email: siteConfig.email, address: { '@type': 'PostalAddress', streetAddress: 'VPO Khaniyara', addressLocality: 'Dharamshala', addressRegion: 'Himachal Pradesh', postalCode: '176215', addressCountry: 'IN' }, geo: { '@type': 'GeoCoordinates', latitude: 32.219, longitude: 76.3234 }, image: siteConfig.url + '/images/og-default.jpg', areaServed: ['Dharamshala', 'McLeod Ganj', 'Bhagsu', 'Dharamkot', 'Naddi', 'Kangra Valley', 'Palampur', 'Bir Billing'], description: siteConfig.description, priceRange: '\u20B9\u20B9', sameAs: [siteConfig.instagram] };
}

/** A bookable trip (trek, paragliding flight) with its starting price, sold by us. */
export function touristTripSchema(t: {
  name: string; description: string; path: string; image?: string; price?: number;
  itinerary?: { name: string; description?: string }[]; touristType?: string;
}, lang: Lang = 'en') {
  const url = siteConfig.url + localizePath(t.path, lang);
  return {
    '@context': 'https://schema.org',
    '@type': 'TouristTrip',
    name: t.name,
    description: t.description,
    url,
    ...(t.image && { image: t.image.startsWith('http') ? t.image : siteConfig.url + t.image }),
    ...(t.touristType && { touristType: t.touristType }),
    ...(t.itinerary?.length && {
      itinerary: { '@type': 'ItemList', itemListElement: t.itinerary.map((d, i) => ({ '@type': 'ListItem', position: i + 1, item: { '@type': 'TouristAttraction', name: d.name, ...(d.description && { description: d.description }) } })) },
    }),
    provider: { '@id': siteConfig.url + '/#organization' },
    ...(t.price && t.price > 0 && {
      offers: { '@type': 'Offer', price: t.price, priceCurrency: 'INR', url, availability: 'https://schema.org/InStock', seller: { '@id': siteConfig.url + '/#organization' } },
    }),
  };
}

export function faqSchema(faqs: { question: string; answer: string }[]) {
  return { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })) };
}

export function articleSchema(p: { title: string; excerpt: string; slug: string; author: string; published_at: string; updated_at: string; image: string; tags?: string[]; category?: string; sources?: { title: string; url: string }[] }, lang: Lang = 'en') {
  const url = siteConfig.url + localizePath('/blog/' + p.slug, lang);
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: p.title,
    description: p.excerpt,
    url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    inLanguage: lang === 'hi' ? 'hi-IN' : 'en-IN',
    author: { '@type': 'Organization', name: p.author, url: siteConfig.url + '/about' },
    publisher: {
      '@type': 'Organization',
      name: siteConfig.name,
      url: siteConfig.url,
      logo: { '@type': 'ImageObject', url: siteConfig.url + '/brand/logo-mark-512.png', width: 512, height: 512 },
    },
    datePublished: p.published_at,
    dateModified: p.updated_at,
    image: p.image.startsWith('http') ? p.image : siteConfig.url + p.image,
    ...(p.category && { articleSection: p.category }),
    ...(p.tags?.length && { keywords: p.tags.join(', ') }),
    ...(p.sources?.length && { citation: p.sources.map((s) => ({ '@type': 'CreativeWork', name: s.title, url: s.url })) }),
    about: { '@type': 'Place', name: 'Dharamshala, Himachal Pradesh, India' },
  };
}

export function breadcrumbSchema(items: { name: string; href: string }[], lang: Lang = 'en') {
  items = items.map((i) => ({ ...i, href: localizePath(i.href, lang) }));
  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map((item, i) => ({ '@type': 'ListItem', position: i + 1, name: item.name, item: siteConfig.url + item.href })) };
}

export function organizationSchema() {
  return {
    '@context': 'https://schema.org', '@type': 'Organization', '@id': siteConfig.url + '/#organization',
    name: siteConfig.name, url: siteConfig.url, description: siteConfig.description,
    logo: { '@type': 'ImageObject', url: siteConfig.url + '/brand/logo-mark-512.png', width: 512, height: 512 },
    image: siteConfig.url + '/images/og-default.jpg',
    email: siteConfig.email, telephone: siteConfig.phone,
    address: { '@type': 'PostalAddress', streetAddress: 'VPO Khaniyara', addressLocality: 'Dharamshala', addressRegion: 'Himachal Pradesh', postalCode: '176215', addressCountry: 'IN' },
    sameAs: [siteConfig.instagram],
    contactPoint: { '@type': 'ContactPoint', telephone: siteConfig.phone, contactType: 'customer service', areaServed: 'IN', availableLanguage: ['English', 'Hindi'] },
    // Tells search and AI engines what this business is an authority on, and where.
    areaServed: ['Dharamshala', 'McLeod Ganj', 'Bhagsu', 'Dharamkot', 'Naddi', 'Kangra Valley', 'Bir Billing', 'Palampur'].map((name) => ({ '@type': 'Place', name })),
    knowsAbout: [
      'Dharamshala', 'McLeod Ganj', 'Triund trek', 'Kareri Lake trek', 'Indrahar Pass', 'Dalai Lama Temple (Tsuglagkhang)',
      'Tibet Museum', 'Tushita Meditation Centre', 'Vipassana at Dhamma Sikhara', 'Bir Billing paragliding',
      'Dharamshala Skyway ropeway', 'Kangra Valley', 'Dhauladhar range', 'Tibetan culture in exile', 'Hotels and homestays in Dharamshala',
    ],
    subjectOf: { '@type': 'Dataset', name: 'Dharamshala and McLeod Ganj travel facts', url: siteConfig.url + '/facts' },
  };
}

export function websiteSchema() {
  return { '@context': 'https://schema.org', '@type': 'WebSite', '@id': siteConfig.url + '/#website', name: siteConfig.name, url: siteConfig.url, description: siteConfig.description, inLanguage: ['en-IN', 'hi-IN'], publisher: { '@id': siteConfig.url + '/#organization' }, potentialAction: { '@type': 'SearchAction', target: siteConfig.url + '/hotels?q={search_term_string}', 'query-input': 'required name=search_term_string' } };
}

export function itemListSchema(items: { name: string; href: string }[], lang: Lang = 'en') {
  items = items.map((i) => ({ ...i, href: localizePath(i.href, lang) }));
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: items.map((item, i) => ({ '@type': 'ListItem', position: i + 1, name: item.name, url: siteConfig.url + item.href })),
  };
}

export function touristDestinationSchema(d: { name: string; description: string; slug: string; image?: string }, lang: Lang = 'en') {
  return {
    '@context': 'https://schema.org',
    '@type': 'TouristDestination',
    name: d.name,
    description: d.description,
    url: siteConfig.url + localizePath('/destinations/' + d.slug, lang),
    ...(d.image && { image: d.image.startsWith('http') ? d.image : siteConfig.url + d.image }),
    containedInPlace: { '@type': 'AdministrativeArea', name: 'Kangra district, Himachal Pradesh, India' },
  };
}
