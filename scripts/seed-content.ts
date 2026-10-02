/**
 * Inserts bookable content into Supabase so it is managed from the admin panel:
 *   - new guided treks        (supabase/seed/treks/new-treks.ts)    -> /admin/treks
 *   - station & outstation taxis (supabase/seed/taxi/new-routes.json) -> /admin/taxis
 *   - paragliding packages    (below)                               -> /admin/paragliding
 *
 * Idempotent: rows that already exist (same slug, or same from/to/vehicle for taxis) are skipped,
 * so edits made in the admin panel are never overwritten.
 *
 *   npx tsx scripts/seed-content.ts
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { newTreks } from '../supabase/seed/treks/new-treks';
import { treks as coreTreks } from '../data/treks';

const root = join(__dirname, '..');
const env = Object.fromEntries(
  readFileSync(join(root, '.env.local'), 'utf8').split(/\r?\n/)
    .filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).replace(/^"|"$/g, '')]),
);
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const H = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY, 'Content-Type': 'application/json' };

async function get(path: string) {
  const r = await fetch(URL_ + '/rest/v1/' + path, { headers: H });
  if (!r.ok) throw new Error(path + ': ' + (await r.text()));
  return r.json();
}
async function insert(table: string, rows: any[]) {
  if (!rows.length) return 0;
  // A bulk insert needs every row to have the same keys.
  const keys = Array.from(new Set(rows.flatMap((x) => Object.keys(x))));
  rows = rows.map((x) => Object.fromEntries(keys.map((k) => [k, x[k] ?? null])));
  const r = await fetch(URL_ + '/rest/v1/' + table, { method: 'POST', headers: { ...H, Prefer: 'return=representation' }, body: JSON.stringify(rows) });
  if (!r.ok) throw new Error(table + ': ' + (await r.text()));
  return (await r.json()).length;
}

const PARAGLIDING = [
  { slug: 'tandem-bir-billing', name: 'Tandem Paragliding - Bir Billing', destination: 'Bir Billing', package_type: 'tandem', duration: '15-25 min flight', altitude: 'Launch at 2,400m', price_per_person: 3500,
    short_description: 'Fly tandem with a certified pilot from the world-famous Bir Billing launch site. Soar over tea gardens and the Kangra Valley with Dhauladhar views.',
    includes: ['Certified pilot', 'All safety equipment', 'GoPro video & photos', 'Transport to launch site', 'Landing field pickup'], featured: true, available_months: 'Mid-September to mid-July' },
  { slug: 'tandem-dharamshala', name: 'Tandem Paragliding - Dharamshala', destination: 'Dharamshala', package_type: 'tandem', duration: '10-15 min flight', altitude: 'Launch at about 1,600 m (Indrunag)', price_per_person: 2500,
    short_description: 'A shorter but equally thrilling flight from the hills above Dharamshala. Perfect for first-timers wanting a taste of the skies.',
    includes: ['Certified pilot', 'Safety equipment', 'GoPro video', 'Transport'], featured: true, available_months: 'Mid-September to mid-July' },
  { slug: 'scenic-long-bir', name: 'Scenic Long Flight - Bir Billing', destination: 'Bir Billing', package_type: 'scenic', duration: '30-45 min flight', altitude: 'Launch at 2,400m, thermal soaring', price_per_person: 5500,
    short_description: 'An extended flight for those who want more airtime. Ride thermals higher, cover more distance, and get panoramic shots of the entire valley.',
    includes: ['Certified pilot', 'Extended flight time', 'GoPro HD video', 'Transport', 'Snacks'], featured: false, available_months: 'Mid-September to mid-July' },
];

async function main() {
  // Treks
  // Triund and Kareri used to be served from data/treks.ts only while the table was empty;
  // they must live in the database too or they disappear once other treks exist.
  const allTreks = [
    ...coreTreks.map(({ id, created_at, updated_at, images, ...t }) => ({ ...t, images: [] })),
    ...newTreks,
  ];
  const haveTreks = new Set((await get('treks?select=slug')).map((t: any) => t.slug));
  const trekRows = allTreks.filter((t) => !haveTreks.has(t.slug)).map((t) => ({ ...t, status: 'published' }));
  console.log('treks inserted:', await insert('treks', trekRows), '(skipped', allTreks.length - trekRows.length + ')');

  // Taxi routes
  const routes = JSON.parse(readFileSync(join(root, 'supabase/seed/taxi/new-routes.json'), 'utf8'));
  const key = (r: any) => [r.from_location, r.to_location, r.vehicle_category].join('|').toLowerCase();
  const haveRoutes = new Set((await get('taxi_routes?select=from_location,to_location,vehicle_category')).map(key));
  const routeRows = routes.filter((r: any) => !haveRoutes.has(key(r))).map((r: any) => ({ ...r, price_type: 'fixed', status: 'active' }));
  console.log('taxi routes inserted:', await insert('taxi_routes', routeRows), '(skipped', routes.length - routeRows.length + ')');

  // Paragliding packages
  const havePg = new Set((await get('paragliding_packages?select=slug')).map((p: any) => p.slug));
  const pgRows = PARAGLIDING.filter((p) => !havePg.has(p.slug)).map((p) => ({ ...p, description: p.short_description, status: 'published' }));
  console.log('paragliding packages inserted:', await insert('paragliding_packages', pgRows), '(skipped', PARAGLIDING.length - pgRows.length + ')');
}

main().catch((e) => { console.error(e.message || e); process.exit(1); });
