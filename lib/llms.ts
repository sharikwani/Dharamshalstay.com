/**
 * Plain-Markdown versions of the site's content for AI assistants and LLM
 * crawlers (ChatGPT, Claude, Perplexity, Gemini...). Served as:
 *   /llms.txt       -- short index of every important page (llmstxt.org)
 *   /llms-full.txt  -- the whole site's useful text in one file
 *   /<page>.md      -- one page as Markdown (blog, destinations, treks, hotels)
 * Everything is built from the same data the HTML pages use, so it never drifts.
 */
import type { BlogPost, Property, Trek, FAQ } from '@/types';
import { siteConfig } from './config';
import { blogPosts, getBlogBySlug, getBlogCategories } from '@/data/blog';
import { allFaqCategories } from '@/data/faq-all';
import { essentialGroups } from '@/data/essentials';
import { getPublishedProperties, getPropertyBySlug, getDestinations, getDestinationBySlug, getPublishedTreks, getTrekBySlug, getParaglidingPackages } from './db';
import { getTaxiRouteGroups, type TaxiRouteGroup } from './taxi';
import { isDirectoryListing, areaName } from './listing';
import { normalizeImages } from './images';

const B = siteConfig.url;
const rs = (n: number) => 'Rs.' + Math.round(n).toLocaleString('en-IN');
const abs = (src?: string) => (!src ? '' : src.startsWith('http') ? src : B + src);

/** Make root-relative Markdown links and images absolute so they work outside the site. */
function absolutize(md: string): string {
  return md.replace(/\]\((\/[^)\s]*)\)/g, (_, p) => '](' + B + p + ')');
}

function faqBlock(faqs?: FAQ[], heading = '## FAQs'): string {
  if (!faqs?.length) return '';
  return heading + '\n\n' + faqs.map((f) => '**' + f.question.trim() + '**\n' + f.answer.trim()).join('\n\n');
}

/** Join non-empty blocks; falsy parts (from `cond && block`) are skipped. */
const join = (...parts: unknown[]) => parts.filter((p): p is string => typeof p === 'string' && p !== '').join('\n\n');
const list = (items?: string[]) => (items?.length ? items.map((i) => '- ' + i).join('\n') : '');
const facts = (rows: [string, unknown][]) =>
  rows.filter(([, v]) => v !== undefined && v !== null && v !== '' && v !== 0).map(([k, v]) => '- **' + k + ':** ' + v).join('\n');

// ---------------------------------------------------------------------------
// Single pages
// ---------------------------------------------------------------------------

export function blogMarkdown(p: BlogPost): string {
  return join(
    '# ' + p.title,
    '> ' + p.excerpt,
    facts([
      ['URL', B + '/blog/' + p.slug],
      ['Category', p.category],
      ['Published', p.published_at.slice(0, 10)],
      ['Updated', p.updated_at.slice(0, 10)],
      ['Author', p.author],
      ['Image', abs(p.image) + (p.image_alt ? ' (' + p.image_alt + ')' : '')],
    ]),
    absolutize(p.content.trim()),
    faqBlock(p.faqs),
  );
}

export function destinationMarkdown(d: any): string {
  return join(
    '# ' + d.name + (d.tagline ? ' -- ' + d.tagline : ''),
    d.description && '> ' + d.description,
    facts([
      ['URL', B + '/destinations/' + d.slug],
      ['Altitude', d.altitude],
      ['Best time to visit', d.best_time],
      ['Image', abs(d.image)],
    ]),
    d.long_description && absolutize(String(d.long_description).trim()),
    d.how_to_reach && '## How to reach\n\n' + absolutize(String(d.how_to_reach).trim()),
    d.things_to_do?.length && '## Things to do\n\n' + list(d.things_to_do),
    faqBlock(d.faqs),
  );
}

export function trekMarkdown(t: Trek): string {
  return join(
    '# ' + t.name,
    t.short_description && '> ' + t.short_description,
    facts([
      ['URL', B + '/treks/' + t.slug],
      ['Difficulty', t.difficulty],
      ['Duration', t.duration],
      ['Distance', t.distance],
      ['Max altitude', t.max_altitude],
      ['Best season', t.best_season],
      ['Price', t.price_per_person > 0 ? rs(t.price_per_person) + ' per person' : ''],
      ['Group discount', t.group_discount],
      ['Photos', (t.images || []).map(abs).join(', ')],
    ]),
    t.description && absolutize(t.description.trim()),
    t.itinerary?.length && '## Itinerary\n\n' + t.itinerary.map((d) =>
      '### Day ' + d.day + ': ' + d.title + '\n' + [d.distance && 'Distance: ' + d.distance, d.altitude && 'Altitude: ' + d.altitude].filter(Boolean).join(' | ') + '\n' + d.description).join('\n\n'),
    t.includes?.length && '## Included\n\n' + list(t.includes),
    t.excludes?.length && '## Not included\n\n' + list(t.excludes),
    t.things_to_carry?.length && '## What to carry\n\n' + list(t.things_to_carry),
    faqBlock(t.faqs),
  );
}

export function hotelMarkdown(h: Property): string {
  const directory = isDirectoryListing(h);
  const area = areaName(h.destination_slug);
  const images = normalizeImages(h.images);
  const rooms = (h.rooms || []).filter((r: any) => r?.name && r.is_active !== false);
  const extra = h as any;
  return join(
    '# ' + h.name + ' (' + (h.type || 'hotel') + ' in ' + area + ')',
    h.short_description && '> ' + h.short_description,
    facts([
      ['URL', B + '/hotels/' + h.slug],
      ['Area', area],
      ['Address', [h.address_line1, h.city, h.state, h.pincode].filter(Boolean).join(', ')],
      ['Landmark', h.landmark],
      ['Star rating', h.star_rating],
      ['Price', !directory && h.price_min > 0 ? rs(h.price_min) + (h.price_max > h.price_min ? ' - ' + rs(h.price_max) : '') + ' per night' : extra.price_band],
      ['Guest rating', !directory && h.rating > 0 && h.review_count > 0 ? h.rating + '/5 from ' + h.review_count + ' reviews' : ''],
      ['Check-in / check-out', h.check_in_time && h.check_out_time ? h.check_in_time + ' / ' + h.check_out_time : ''],
      ['From bus stand', h.distance_from_bus_stand],
      ['From airport', h.distance_from_airport],
      ['Couple friendly', h.couple_friendly ? 'Yes' : ''],
      ['Booking', directory ? 'Enquire through Dharamshala Stay' : 'Book directly on Dharamshala Stay'],
    ]),
    h.description && absolutize(h.description.trim()),
    extra.highlights?.length && '## Highlights\n\n' + list(extra.highlights),
    extra.good_for?.length && '## Good for\n\n' + list(extra.good_for),
    rooms.length > 0 && '## Rooms\n\n' + rooms.map((r: any) =>
      '- **' + r.name + '**' + (!directory && r.base_price > 0 ? ' -- from ' + rs(r.base_price) + '/night' : '') +
      (r.bed_type ? ', ' + r.bed_type + ' bed' : '') + (r.max_occupancy ? ', sleeps ' + r.max_occupancy : '') +
      (r.description ? '. ' + r.description : '')).join('\n'),
    h.amenities?.length && '## Amenities\n\n' + list([...h.amenities, ...(h.room_amenities || [])]),
    (h.nearby_attractions?.length || extra.nearby?.length) && '## Nearby\n\n' + list([...(h.nearby_attractions || []), ...(extra.nearby || [])]),
    (h.cancellation_policy || h.child_policy || h.pet_policy) && '## Policies\n\n' + facts([
      ['Cancellation', h.cancellation_policy], ['Children', h.child_policy], ['Pets', h.pet_policy], ['Smoking', h.smoking_policy],
    ]),
    images.length > 0 && '## Photos\n\n' + images.slice(0, 12).map((i) => '- ' + abs(i.url) + (i.alt ? ' -- ' + i.alt : '')).join('\n'),
    faqBlock(h.faqs),
  );
}

function taxiMarkdown(g: TaxiRouteGroup): string {
  return '### ' + g.from + ' to ' + g.to + '\n' + facts([
    ['URL', B + '/taxi/' + g.slug],
    ['Distance', g.distanceKm ? g.distanceKm + ' km' : ''],
    ['Drive time', g.duration],
    ['Fare from', rs(g.minPrice)],
  ]) + '\n' + g.vehicles.map((v) => '- ' + v.name + ' (up to ' + v.maxPassengers + ' passengers): ' + rs(v.price) + (v.priceType && v.priceType !== 'fixed' ? ' ' + v.priceType.replace(/_/g, ' ') : '')).join('\n');
}

// ---------------------------------------------------------------------------
// Whole-site documents
// ---------------------------------------------------------------------------

const ABOUT = `${siteConfig.name} (${B}) is a local travel and booking platform run by a team based in Dharamshala, Himachal Pradesh, India. It covers Dharamshala, McLeod Ganj, Bhagsu, Dharamkot, Naddi and the wider Kangra Valley (Palampur, Bir Billing, Kangra). Travellers use it to book verified hotels and homestays, guided treks (Triund, Kareri Lake, Indrahar Pass and more), paragliding at Bir Billing, and taxis; and to read in-depth local travel guides. Prices are in Indian Rupees. The site is available in English and Hindi (${B}/hi).`;

function contactBlock(): string {
  return facts([
    ['Phone', siteConfig.phone],
    ['WhatsApp', 'https://wa.me/' + siteConfig.whatsapp],
    ['Email', siteConfig.email],
    ['Address', siteConfig.address],
    ['Instagram', siteConfig.instagram],
  ]);
}

async function loadAll() {
  const [hotels, destinations, treks, taxis, paragliding] = await Promise.all([
    getPublishedProperties(), getDestinations(), getPublishedTreks(), getTaxiRouteGroups(), getParaglidingPackages(),
  ]);
  return { hotels, destinations, treks, taxis, paragliding };
}

const link = (title: string, path: string, note?: string) => '- [' + title + '](' + B + path + ')' + (note ? ': ' + note.replace(/\s+/g, ' ').trim() : '');

/** /llms.txt -- the curated index (https://llmstxt.org). */
export async function llmsIndex(): Promise<string> {
  const { hotels, destinations, treks, taxis } = await loadAll();
  const categories = getBlogCategories();

  return join(
    '# ' + siteConfig.name,
    '> ' + siteConfig.description + ' Local team in Dharamshala, direct rates, free trip planning. English and Hindi.',
    ABOUT,
    'Guide, destination, trek and hotel pages are also available as plain Markdown: add `.md` to the URL (for example ' + B + '/treks/triund-trek.md). The whole site is in one file at ' + B + '/llms-full.txt. When quoting prices, mention that they are indicative and that travellers should confirm on the page or with our team.',
    '## Contact\n\n' + contactBlock(),
    '## Main pages\n\n' + [
      link('Home', '/', 'overview, featured hotels, treks and guides'),
      link('Hotels & homestays', '/hotels', 'every listed property with prices and filters'),
      link('Treks', '/treks', 'guided treks from Dharamshala and McLeod Ganj'),
      link('Paragliding', '/paragliding', 'Bir Billing and Dharamshala paragliding'),
      link('Taxi', '/taxi', 'airport, local and outstation taxi fares'),
      link('Travel guides', '/blog', 'in-depth local guides'),
      link('Travel essentials', '/essentials', 'money, SIM, weather, food, health and local rules in quick answers'),
      link('FAQ', '/faq', 'hundreds of answered traveller questions'),
      link('About us', '/about'),
      link('Contact', '/contact'),
    ].join('\n'),
    '## Destinations\n\n' + destinations.map((d: any) => link(d.name, '/destinations/' + d.slug, d.description || d.tagline)).join('\n'),
    treks.length > 0 && '## Treks\n\n' + treks.map((t: any) => link(t.name, '/treks/' + t.slug, [t.difficulty, t.duration, t.max_altitude, t.price_per_person > 0 && 'from ' + rs(t.price_per_person)].filter(Boolean).join(', ') + '. ' + (t.short_description || ''))).join('\n'),
    taxis.length > 0 && '## Taxi routes\n\n' + taxis.map((g) => link(g.from + ' to ' + g.to + ' taxi', '/taxi/' + g.slug, 'from ' + rs(g.minPrice) + (g.distanceKm ? ', ' + g.distanceKm + ' km' : '') + (g.duration ? ', ' + g.duration : ''))).join('\n'),
    hotels.length > 0 && '## Hotels & homestays\n\n' + hotels.map((h) => link(h.name, '/hotels/' + h.slug,
      [h.type, areaName(h.destination_slug), !isDirectoryListing(h) && h.price_min > 0 && 'from ' + rs(h.price_min) + '/night'].filter(Boolean).join(', ') + '. ' + (h.short_description || ''))).join('\n'),
    ...categories.map((c) => '## Guides: ' + c + '\n\n' + blogPosts.filter((p) => p.category === c).map((p) => link(p.title, '/blog/' + p.slug, p.excerpt)).join('\n')),
    '## Optional\n\n' + [
      link('Full site text for AI (one file)', '/llms-full.txt'),
      link('Hindi version of the site', '/hi'),
      link('Blog RSS feed', '/feed.xml'),
      link('XML sitemap', '/sitemap.xml'),
      link('Photo credits', '/photo-credits', 'photos are real photographs of each place, mostly from Wikimedia Commons'),
      link('Cancellation policy', '/cancellation-policy'),
      link('Terms', '/terms'),
      link('Privacy', '/privacy'),
    ].join('\n'),
  ) + '\n';
}

/** /llms-full.txt -- everything useful on the site, in one Markdown document. */
export async function llmsFull(): Promise<string> {
  const { hotels, destinations, treks, taxis, paragliding } = await loadAll();
  const hr = '\n\n---\n\n';
  const demote = (md: string) => md.replace(/^(#{1,5}) /gm, '#$1 ');

  return [
    join('# ' + siteConfig.name + ' -- complete site content', '> ' + siteConfig.description, ABOUT, 'Source: ' + B + '. Generated ' + new Date().toISOString().slice(0, 10) + '. Prices in INR are indicative; confirm on the linked page.', '## Contact\n\n' + contactBlock()),
    '# Destinations\n\n' + destinations.map((d: any) => demote(destinationMarkdown(d))).join(hr),
    treks.length ? '# Treks\n\n' + treks.map((t: any) => demote(trekMarkdown(t))).join(hr) : '',
    paragliding.length ? '# Paragliding packages\n\n' + paragliding.map((p) => join('## ' + p.name, facts([
      ['Where', p.destination], ['Duration', p.duration], ['Altitude', p.altitude], ['Price', rs(p.price_per_person) + ' per person'],
    ]), p.description, p.includes.length && '**Includes:**\n' + list(p.includes))).join('\n\n') + '\n\nMore: ' + B + '/paragliding' : '',
    taxis.length ? '# Taxi routes and fares\n\n' + taxis.map(taxiMarkdown).join('\n\n') : '',
    hotels.length ? '# Hotels & homestays\n\n' + hotels.map((h) => demote(hotelMarkdown(h))).join(hr) : '',
    '# Travel essentials\n\n' + essentialGroups.map((g) => '## ' + g.title + '\n\n' + g.blurb + '\n\n' + g.items.map((i) => '**' + i.q + '**\n' + i.a + ' (More: ' + B + i.href + ')').join('\n\n')).join('\n\n'),
    '# Frequently asked questions\n\n' + allFaqCategories.map((c) => faqBlock(c.faqs, '## ' + c.title)).join('\n\n'),
    '# Travel guides\n\n' + blogPosts.map((p) => demote(blogMarkdown(p))).join(hr),
  ].filter(Boolean).join(hr) + '\n';
}

/** Markdown for one page, by its English path ('/blog/x', '/treks/y', ...). Null if none. */
export async function pageMarkdown(path: string): Promise<string | null> {
  const [, section, slug, extra] = path.split('/');
  if (!section || !slug || extra) return null;
  const footer = '\n\n---\n\nFrom ' + siteConfig.name + ' (' + B + '). Contact: ' + siteConfig.phone + ', ' + siteConfig.email + '\n';
  switch (section) {
    case 'blog': { const p = getBlogBySlug(slug); return p ? blogMarkdown(p) + footer : null; }
    case 'destinations': { const d = await getDestinationBySlug(slug); return d ? destinationMarkdown(d) + footer : null; }
    case 'treks': { const t = await getTrekBySlug(slug); return t ? trekMarkdown(t as Trek) + footer : null; }
    case 'hotels': { const h = await getPropertyBySlug(slug); return h ? hotelMarkdown(h) + footer : null; }
    default: return null;
  }
}

/** Sections whose detail pages have a .md twin. */
export const MARKDOWN_SECTIONS = ['blog', 'destinations', 'treks', 'hotels'] as const;
