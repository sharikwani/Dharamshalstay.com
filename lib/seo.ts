import { Metadata } from 'next';
import { siteConfig } from './config';

interface SEOProps {
  title: string; description: string; path: string;
  image?: string; type?: 'website' | 'article'; noindex?: boolean;
  publishedTime?: string; modifiedTime?: string;
  keywords?: string[];
}

export function generateSEO({ title, description, path, image, type = 'website', noindex = false, publishedTime, modifiedTime, keywords }: SEOProps): Metadata {
  const url = `${siteConfig.url}${path}`;
  const fullTitle = title.includes('Dharamshala Stay') ? title : `${title} | Dharamshala Stay`;
  const ogImage = image?.startsWith('http') ? image : `${siteConfig.url}${image || '/images/og-default.jpg'}`;
  return {
    title: fullTitle,
    description,
    ...(keywords?.length ? { keywords: keywords.join(', ') } : {}),
    alternates: { canonical: url },
    robots: noindex ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: {
      title: fullTitle, description, url,
      siteName: siteConfig.name,
      type: type === 'article' ? 'article' : 'website',
      locale: 'en_IN',
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
      ...(publishedTime && { publishedTime }),
      ...(modifiedTime && { modifiedTime }),
    },
    twitter: { card: 'summary_large_image', title: fullTitle, description, images: [ogImage] },
  };
}

/**
 * Generate SEO-optimized metadata for a hotel detail page.
 * Auto-generates title/description if not explicitly set.
 */
export function generateHotelSEO(hotel: {
  name: string; meta_title?: string; meta_description?: string;
  short_description?: string; description?: string;
  type?: string; city?: string; destination_slug?: string;
  price_min?: number; price_max?: number;
  star_rating?: number; rating?: number; review_count?: number;
  slug: string; images?: any[];
}): Metadata {
  const area = hotel.destination_slug?.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) || hotel.city || 'Dharamshala';
  const typeLabel = hotel.type ? hotel.type.charAt(0).toUpperCase() + hotel.type.slice(1) : 'Hotel';
  const starText = hotel.star_rating ? `${hotel.star_rating}-Star ` : '';
  const priceText = hotel.price_min ? ` from ₹${hotel.price_min}/night` : '';
  const ratingText = hotel.rating ? ` · Rated ${hotel.rating}/5` : '';

  const autoTitle = `${hotel.name} - ${starText}${typeLabel} in ${area}${priceText}`;
  const autoDescription = `Book ${hotel.name}, a ${starText.toLowerCase()}${typeLabel.toLowerCase()} in ${area}${priceText}.${ratingText} ${hotel.short_description || ''} Direct booking, best prices, local support.`.trim().substring(0, 160);

  const title = hotel.meta_title || autoTitle;
  const description = hotel.meta_description || autoDescription;
  const primaryImage = hotel.images?.[0]?.url || hotel.images?.[0];
  const imageUrl = typeof primaryImage === 'string' ? primaryImage : undefined;

  const keywords = [
    hotel.name, `hotel in ${area}`, `${area} hotels`,
    `${typeLabel.toLowerCase()} in Dharamshala`, `best hotels ${area}`,
    `book ${hotel.name}`, 'Dharamshala accommodation', 'McLeod Ganj stays',
    `${area} stay`, 'Dharamshala booking',
  ];

  return generateSEO({
    title, description,
    path: `/hotels/${hotel.slug}`,
    image: imageUrl,
    keywords,
  });
}

/**
 * Full Hotel schema markup with rooms as Offers.
 * This is what makes properties rank on Google with rich snippets.
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
  amenities?: string[]; images?: any[];
  rooms?: any[]; contact_phone?: string; contact_email?: string;
}) {
  const area = h.destination_slug?.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) || h.city || 'Dharamshala';
  const primaryImage = h.images?.[0]?.url || (typeof h.images?.[0] === 'string' ? h.images[0] : undefined);

  // Room-level Offer schema -- one per rate plan for richer Google results
  const roomOffers: any[] = [];
  (h.rooms || []).forEach((r: any) => {
    if (r.rate_plans && Array.isArray(r.rate_plans) && r.rate_plans.length > 0) {
      r.rate_plans.forEach((rp: any) => {
        if (rp.price > 0) {
          roomOffers.push({
            '@type': 'Offer',
            name: (r.name || 'Room') + ' - ' + (rp.name || ''),
            description: rp.includes?.join(', ') || '',
            price: rp.price,
            priceCurrency: 'INR',
            availability: r.is_active === false ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock',
          });
        }
      });
    } else if (r.base_price > 0) {
      roomOffers.push({
        '@type': 'Offer',
        name: r.name || 'Room',
        description: r.description || '',
        price: r.base_price,
        priceCurrency: 'INR',
        availability: r.is_active === false ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock',
      });
    }
  });

  return {
    '@context': 'https://schema.org',
    '@type': 'Hotel',
    name: h.name,
    description: h.description || h.short_description || '',
    url: `${siteConfig.url}/hotels/${h.slug}`,
    ...(primaryImage && { image: primaryImage }),
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
      geo: { '@type': 'GeoCoordinates', latitude: h.latitude, longitude: h.longitude },
    }),
    ...(h.rating && h.rating > 0 && h.review_count && h.review_count > 0 && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: h.rating,
        reviewCount: h.review_count,
        bestRating: 5,
        worstRating: 1,
      },
    }),
    ...(h.price_min && h.price_max && {
      priceRange: `₹${h.price_min}-₹${h.price_max}`,
    }),
    ...(h.check_in_time && { checkinTime: h.check_in_time }),
    ...(h.check_out_time && { checkoutTime: h.check_out_time }),
    ...(h.amenities?.length && {
      amenityFeature: h.amenities.map((a: string) => ({
        '@type': 'LocationFeatureSpecification', name: a, value: true,
      })),
    }),
    ...(h.contact_phone && { telephone: h.contact_phone }),
    ...(h.contact_email && { email: h.contact_email }),
    ...(roomOffers.length > 0 && {
      makesOffer: roomOffers,
    }),
    // Containment -- tells Google this hotel is in Dharamshala
    containedInPlace: {
      '@type': 'City',
      name: 'Dharamshala',
      containedInPlace: { '@type': 'State', name: 'Himachal Pradesh', containedInPlace: { '@type': 'Country', name: 'India' } },
    },
  };
}

// Keep backward-compatible simple version
export function hotelSchema(h: { name: string; description: string; address_line1: string; rating: number; review_count: number; price_min: number; price_max: number; latitude?: number; longitude?: number; slug: string }) {
  return hotelSchemaFull(h as any);
}

export function localBusinessSchema() {
  return { '@context': 'https://schema.org', '@type': 'TravelAgency', name: siteConfig.name, url: siteConfig.url, telephone: siteConfig.phone, email: siteConfig.email, address: { '@type': 'PostalAddress', addressLocality: 'Dharamshala', addressRegion: 'Himachal Pradesh', postalCode: '176215', addressCountry: 'IN' }, geo: { '@type': 'GeoCoordinates', latitude: 32.219, longitude: 76.3234 }, areaServed: ['Dharamshala', 'McLeod Ganj', 'Bhagsu', 'Dharamkot', 'Naddi', 'Kangra Valley'], description: siteConfig.description, priceRange: '₹₹' };
}

export function faqSchema(faqs: { question: string; answer: string }[]) {
  return { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })) };
}

export function articleSchema(p: { title: string; excerpt: string; slug: string; author: string; published_at: string; updated_at: string; image: string }) {
  return { '@context': 'https://schema.org', '@type': 'Article', headline: p.title, description: p.excerpt, url: `${siteConfig.url}/blog/${p.slug}`, author: { '@type': 'Organization', name: p.author }, publisher: { '@type': 'Organization', name: siteConfig.name, url: siteConfig.url }, datePublished: p.published_at, dateModified: p.updated_at, image: p.image.startsWith('http') ? p.image : `${siteConfig.url}${p.image}` };
}

export function breadcrumbSchema(items: { name: string; href: string }[]) {
  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map((item, i) => ({ '@type': 'ListItem', position: i + 1, name: item.name, item: `${siteConfig.url}${item.href}` })) };
}

export function organizationSchema() {
  return { '@context': 'https://schema.org', '@type': 'Organization', name: siteConfig.name, url: siteConfig.url, contactPoint: { '@type': 'ContactPoint', telephone: siteConfig.phone, contactType: 'customer service', availableLanguage: ['English', 'Hindi'] } };
}

export function websiteSchema() {
  return { '@context': 'https://schema.org', '@type': 'WebSite', name: siteConfig.name, url: siteConfig.url, potentialAction: { '@type': 'SearchAction', target: `${siteConfig.url}/hotels?q={search_term_string}`, 'query-input': 'required name=search_term_string' } };
}
