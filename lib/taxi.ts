/**
 * Taxi route pages: one SEO page per from -> to pair, generated from the
 * active routes in Supabase (/admin/taxis). Add a route there and its page,
 * sitemap entry and links appear automatically.
 */
import { getActiveTaxiRoutes } from './db';

export interface TaxiRouteGroup {
  slug: string;
  from: string;
  to: string;
  routeType: string;
  distanceKm: number;
  duration: string;
  minPrice: number;
  updatedAt: string;
  vehicles: { name: string; category: string; maxPassengers: number; price: number; priceType: string; includes: string[]; excludes: string[] }[];
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function taxiRouteSlug(from: string, to: string): string {
  return slugify(from) + '-to-' + slugify(to) + '-taxi';
}

export async function getTaxiRouteGroups(): Promise<TaxiRouteGroup[]> {
  const routes = await getActiveTaxiRoutes();
  const groups = new Map<string, TaxiRouteGroup>();
  for (const r of routes as any[]) {
    if (!r.from_location || !r.to_location || !(r.price > 0)) continue;
    const slug = taxiRouteSlug(r.from_location, r.to_location);
    const g: TaxiRouteGroup = groups.get(slug) || {
      slug, from: r.from_location, to: r.to_location, routeType: r.route_type,
      distanceKm: r.distance_km || 0, duration: r.duration || '', minPrice: r.price,
      updatedAt: r.updated_at || r.created_at || '', vehicles: [],
    };
    g.minPrice = Math.min(g.minPrice, r.price);
    if ((r.updated_at || '') > g.updatedAt) g.updatedAt = r.updated_at;
    g.vehicles.push({
      name: r.vehicle_name || r.vehicle_category, category: r.vehicle_category,
      maxPassengers: r.max_passengers || 4, price: r.price, priceType: r.price_type || 'fixed',
      includes: r.includes || [], excludes: r.excludes || [],
    });
    groups.set(slug, g);
  }
  return Array.from(groups.values()).map((g) => ({ ...g, vehicles: g.vehicles.sort((a, b) => a.price - b.price) }));
}

export async function getTaxiRouteGroup(slug: string): Promise<TaxiRouteGroup | undefined> {
  return (await getTaxiRouteGroups()).find((g) => g.slug === slug);
}

/**
 * Hand-written local notes for common routes, matched on from/to keywords so
 * they apply however the route is named in the admin panel.
 */
const ROUTE_NOTES: { from: RegExp; to: RegExp; notes: string[] }[] = [
  {
    from: /gaggal|kangra airport|airport/i, to: /mcleod/i,
    notes: [
      'The drive climbs from Kangra (Gaggal) Airport through Dharamshala town and up the hill road to McLeod Ganj. Traffic around Kotwali Bazaar and the last stretch into McLeod Ganj can be slow in peak season, so allow extra time in May-June and October.',
      'Most hotels in McLeod Ganj, Bhagsu and Dharamkot are on narrow lanes. Tell us your hotel when booking so the driver can get as close as the roads allow.',
    ],
  },
  {
    from: /gaggal|kangra airport|airport/i, to: /dharamshala|dharamsala/i,
    notes: [
      'Kangra (Gaggal) Airport is the nearest airport to Dharamshala. The road runs through the valley on the main Pathankot-Mandi highway and then up to Dharamshala town -- one of the easiest transfers in the region.',
      'Flights into Gaggal are small turboprops and delays are common in bad weather. Share your flight number and the driver will track the arrival.',
    ],
  },
  {
    from: /pathankot|chakki/i, to: /.*/,
    notes: [
      'Pathankot Junction and Chakki Bank are the nearest broad-gauge railway stations to Dharamshala. The road follows the Kangra highway through Nurpur and Shahpur; it is a well-paved route of roughly 2.5-3 hours.',
      'Overnight trains from Delhi reach Pathankot early in the morning, so a pre-booked taxi saves waiting for buses.',
    ],
  },
  {
    from: /.*/, to: /manali/i,
    notes: [
      'The usual route runs via Palampur, Baijnath, Joginder Nagar and Mandi before following the Beas valley to Kullu and Manali. Many travellers stop at Bir Billing or Palampur on the way.',
      'This is a full-day mountain drive. Start early, especially in monsoon (July-September) when landslides can slow the Mandi-Kullu stretch.',
    ],
  },
  {
    from: /.*/, to: /delhi/i,
    notes: [
      'Drivers take either the Pathankot-Jalandhar route (NH44) or the Una-Chandigarh route, depending on traffic and your stops. Expect a long day of 9-12 hours with meal breaks.',
      'An early start avoids the evening traffic entering Delhi. Read our [Dharamshala to Delhi taxi guide](/blog/dharamshala-to-delhi-taxi-guide) for routes and stops.',
    ],
  },
  {
    from: /.*/, to: /amritsar/i,
    notes: [
      'The route descends via Kangra and Pathankot into the Punjab plains. Many travellers time arrival in Amritsar for the evening at the Golden Temple or the Wagah-Attari border ceremony.',
    ],
  },
  {
    from: /.*/, to: /sightseeing|local/i,
    notes: [
      'A typical local tour covers the Tsuglagkhang (Dalai Lama Temple), St. John in the Wilderness church, Bhagsunag temple and waterfall, Dal Lake and Naddi viewpoint, with the HPCA cricket stadium and the War Memorial on the way down. Tell the driver your priorities and they will plan around traffic.',
    ],
  },
  {
    from: /.*/, to: /kangra|valley|palampur/i,
    notes: [
      'A Kangra Valley day can include Kangra Fort, Brajeshwari Devi temple, the Masroor rock-cut temples or the Palampur tea gardens and Baijnath. See our [places to visit in Kangra](/blog/places-to-visit-in-kangra) guide to plan stops.',
    ],
  },
];

export function getRouteNotes(from: string, to: string): string[] {
  const hit = ROUTE_NOTES.find((n) => n.from.test(from) && n.to.test(to));
  return hit ? hit.notes : [];
}
