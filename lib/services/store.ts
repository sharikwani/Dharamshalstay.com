/**
 * Local services directory (migration v52). First category: luggage storage. Businesses sign up themselves; the owner
 * approves them before they are shown. Until v52 is run, the public pages fall back to the listing the owner added.
 */
import { z } from 'zod';
import { serviceClient, HttpError } from '@/lib/server-auth';
import { adminEmail, escHtml, sendEmail } from '@/lib/email';
import { siteConfig } from '@/lib/config';

export type LocalService = {
  id: string; slug: string; category: 'luggage_storage'; name: string; owner_name: string | null;
  phone: string; whatsapp: string | null; email: string | null; area: string; address: string | null; maps_url: string | null;
  price_text: string | null; hours: string | null; description: string | null; features: string[];
  status: 'pending' | 'published' | 'rejected' | 'hidden'; created_at: string; published_at: string | null;
};

export const SERVICE_CATEGORIES = {
  luggage_storage: { label: 'Luggage storage', path: '/luggage-storage' },
} as const;

/** Shown while migration v52 has not been run (same data as its seed row). */
const FALLBACK: LocalService[] = [{
  id: 'makkar', slug: 'makkar-luggage-storage-kandi', category: 'luggage_storage', name: 'Makkar Luggage Storage and Luggage Holding Services',
  owner_name: 'Viren Makkar', phone: '917833000062', whatsapp: null, email: null, area: 'Kandi, Dharamshala', address: null, maps_url: null,
  price_text: 'About Rs 80 to 100 per bag per day', hours: null,
  description: 'A local luggage storage and luggage holding service in Kandi, lower Dharamshala. Leave your bags for a few hours or a few days while you trek, sightsee or wait for a night bus.',
  features: ['All types of luggage accepted', 'Pick-up and drop within 5 km (charged extra)', 'Hourly and day storage'],
  status: 'published', created_at: '2026-10-25T00:00:00Z', published_at: '2026-10-25T00:00:00Z',
}];

const PUBLIC_COLS = 'id, slug, category, name, owner_name, phone, whatsapp, email, area, address, maps_url, price_text, hours, description, features, status, created_at, published_at';

export async function publishedServices(category: keyof typeof SERVICE_CATEGORIES = 'luggage_storage'): Promise<LocalService[]> {
  try {
    const { data, error } = await serviceClient().from('local_services').select(PUBLIC_COLS)
      .eq('category', category).eq('status', 'published').order('published_at', { ascending: true });
    if (error) throw error;
    return (data as LocalService[]) || [];
  } catch {
    return FALLBACK.filter((s) => s.category === category);
  }
}

export async function serviceBySlug(slug: string): Promise<LocalService | null> {
  return (await publishedServices()).find((s) => s.slug === slug) || null;
}

const phone = z.string().trim().transform((v) => v.replace(/\D/g, '')).refine((d) => d.length === 10 || (d.length === 12 && d.startsWith('91')), 'Please enter a valid Indian mobile number')
  .transform((d) => (d.length === 10 ? '91' + d : d));

export const serviceSignupSchema = z.object({
  name: z.string().trim().min(3, 'Please enter your business name').max(100),
  owner_name: z.string().trim().min(2, 'Please enter your name').max(80),
  phone,
  whatsapp: z.union([phone, z.literal('')]).optional(),
  email: z.union([z.string().trim().email('Please check your email').max(120), z.literal('')]).optional(),
  area: z.string().trim().min(3, 'Please enter your area').max(100),
  address: z.string().trim().max(300).optional(),
  maps_url: z.union([z.string().trim().url().max(500), z.literal('')]).optional(),
  price_text: z.string().trim().min(3, 'Please enter your price').max(120),
  hours: z.string().trim().max(120).optional(),
  description: z.string().trim().max(1000).optional(),
  features: z.array(z.string().trim().max(80)).max(8).optional(),
  consent: z.literal(true, { errorMap: () => ({ message: 'Please confirm the details are correct and may be shown on the site' }) }),
  website: z.string().max(0).optional(), // honeypot
});

const slugify = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70);

export async function submitService(input: z.infer<typeof serviceSignupSchema>, ipHash: string | null) {
  const sb = serviceClient();
  if (ipHash) {
    const since = new Date(Date.now() - 24 * 3600e3).toISOString();
    const { count } = await sb.from('local_services').select('id', { count: 'exact', head: true }).eq('ip_hash', ipHash).gte('created_at', since);
    if ((count || 0) >= 3) throw new HttpError(429, 'Too many sign-ups from this connection today. Please WhatsApp us instead.');
  }
  const base = slugify(`${input.name} ${input.area.split(',')[0]}`) || 'luggage-storage';
  let slug = base;
  for (let i = 2; i < 20; i++) {
    const { data } = await sb.from('local_services').select('id').eq('slug', slug).maybeSingle();
    if (!data) break;
    slug = `${base}-${i}`;
  }
  const { error } = await sb.from('local_services').insert({
    slug, category: 'luggage_storage', name: input.name, owner_name: input.owner_name, phone: input.phone,
    whatsapp: input.whatsapp || null, email: input.email || null, area: input.area, address: input.address || null, maps_url: input.maps_url || null,
    price_text: input.price_text, hours: input.hours || null, description: input.description || null, features: (input.features || []).filter(Boolean),
    status: 'pending', ip_hash: ipHash,
  });
  if (error) { console.error('Service sign-up failed:', error); throw new HttpError(500, 'Could not save your sign-up. Please try again.'); }
  await sendEmail({
    to: adminEmail(), subject: `New partner sign-up: luggage storage – ${input.name}`,
    html: `<h2>New luggage storage sign-up</h2><p><strong>${escHtml(input.name)}</strong> (${escHtml(input.owner_name)}, +${escHtml(input.phone)}) in ${escHtml(input.area)}: ${escHtml(input.price_text)}.</p>`
      + `<p>Approve or reject it here: <a href="${siteConfig.url}/admin/services">${siteConfig.url}/admin/services</a></p>`,
  }).catch((e) => console.error('Service sign-up email failed:', e));
  return { slug };
}
