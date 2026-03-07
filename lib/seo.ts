import { Metadata } from 'next';
import { siteConfig } from './config';

interface SEOProps {
  title: string; description: string; path: string;
  image?: string; type?: 'website' | 'article'; noindex?: boolean;
  publishedTime?: string; modifiedTime?: string;
}

export function generateSEO({ title, description, path, image = '/images/og-default.jpg', type = 'website', noindex = false, publishedTime, modifiedTime }: SEOProps): Metadata {
  const url = `${siteConfig.url}${path}`;
  const fullTitle = title.includes('Dharamshala Stay') ? title : `${title} | Dharamshala Stay`;
  return {
    title: fullTitle, description,
    alternates: { canonical: url },
    robots: noindex ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: { title: fullTitle, description, url, siteName: siteConfig.name, type: type === 'article' ? 'article' : 'website', images: [{ url: image.startsWith('http') ? image : `${siteConfig.url}${image}`, width: 1200, height: 630, alt: title }], ...(publishedTime && { publishedTime }), ...(modifiedTime && { modifiedTime }) },
    twitter: { card: 'summary_large_image', title: fullTitle, description },
  };
}

export function localBusinessSchema() {
  return { '@context': 'https://schema.org', '@type': 'TravelAgency', name: siteConfig.name, url: siteConfig.url, telephone: siteConfig.phone, email: siteConfig.email, address: { '@type': 'PostalAddress', addressLocality: 'Dharamshala', addressRegion: 'Himachal Pradesh', postalCode: '176215', addressCountry: 'IN' }, geo: { '@type': 'GeoCoordinates', latitude: 32.219, longitude: 76.3234 }, areaServed: ['Dharamshala', 'McLeod Ganj', 'Bhagsu', 'Dharamkot', 'Naddi', 'Kangra Valley'], description: siteConfig.description, priceRange: '₹₹' };
}

export function hotelSchema(h: { name: string; description: string; address_line1: string; rating: number; review_count: number; price_min: number; price_max: number; latitude?: number; longitude?: number; slug: string }) {
  return { '@context': 'https://schema.org', '@type': 'Hotel', name: h.name, description: h.description, address: { '@type': 'PostalAddress', streetAddress: h.address_line1, addressLocality: 'Dharamshala', addressRegion: 'Himachal Pradesh', addressCountry: 'IN' }, ...(h.latitude && { geo: { '@type': 'GeoCoordinates', latitude: h.latitude, longitude: h.longitude } }), url: `${siteConfig.url}/hotels/${h.slug}`, aggregateRating: { '@type': 'AggregateRating', ratingValue: h.rating, reviewCount: h.review_count, bestRating: 5 }, priceRange: `₹${h.price_min}–₹${h.price_max}` };
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

