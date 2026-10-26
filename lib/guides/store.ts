/**
 * Local guides directory (migration v54). Guides sign up on /local-guides/register; the owner approves them in
 * /admin/guides before they are shown. Travellers book a guide through us (enquiry, then a GDE booking at 15%
 * commission), so a guide's phone and email are never shown on the public pages.
 */
import { z } from 'zod';
import { serviceClient, HttpError } from '@/lib/server-auth';
import { adminEmail, escHtml, sendEmail } from '@/lib/email';
import { siteConfig } from '@/lib/config';
import { GUIDE_AREAS, GUIDE_LANGUAGES, GUIDE_SPECIALITIES } from './options';

export type PublicGuide = {
  id: string; slug: string; name: string; photo: string | null; bio: string | null; experience_years: number;
  languages: string[]; specializations: string[]; areas: string[]; price_per_day: number | null;
  verified: boolean; hp_registration_verified: boolean; rating: number; review_count: number; published_at: string | null;
};

export { GUIDE_AREAS, GUIDE_LANGUAGES, GUIDE_SPECIALITIES } from './options';

const PUBLIC_COLS = 'id, slug, name, photo, bio, experience_years, languages, specializations, areas, price_per_day, verified, hp_registration_verified, rating, review_count, published_at';
const arr = (v: unknown): string[] => (Array.isArray(v) ? v.map(String).filter(Boolean) : []);

/** Approved guides with a profile photo, oldest first. Empty until migration v54 is run. */
export async function publishedGuides(): Promise<PublicGuide[]> {
  try {
    const { data, error } = await serviceClient().from('guides').select(PUBLIC_COLS)
      .eq('status', 'active').not('slug', 'is', null).not('photo', 'is', null).order('published_at', { ascending: true, nullsFirst: false });
    if (error) throw error;
    return (data || []).map((g: any) => ({
      ...g, languages: arr(g.languages), specializations: arr(g.specializations), areas: arr(g.areas),
      experience_years: Number(g.experience_years) || 0, rating: Number(g.rating) || 0, review_count: Number(g.review_count) || 0,
    }));
  } catch {
    return [];
  }
}

export async function guideBySlug(slug: string): Promise<PublicGuide | null> {
  return (await publishedGuides()).find((g) => g.slug === slug) || null;
}

const phone = z.string().trim().transform((v) => v.replace(/\D/g, '')).refine((d) => d.length === 10 || (d.length === 12 && d.startsWith('91')), 'Please enter a valid Indian mobile number')
  .transform((d) => (d.length === 10 ? '91' + d : d));
const pick = (allowed: readonly string[], max: number) => z.array(z.string().trim()).max(max).transform((a) => a.filter((x) => allowed.includes(x)));

export const guideSignupSchema = z.object({
  name: z.string().trim().min(3, 'Please enter your full name').max(80),
  phone,
  whatsapp: z.union([phone, z.literal('')]).optional(),
  email: z.union([z.string().trim().email('Please check your email').max(120), z.literal('')]).optional(),
  experience_years: z.coerce.number().int().min(0).max(60),
  languages: pick(GUIDE_LANGUAGES, 10).refine((a) => a.length > 0, 'Please choose at least one language'),
  other_languages: z.string().trim().max(100).optional(),
  specializations: pick(GUIDE_SPECIALITIES, 8).refine((a) => a.length > 0, 'Please choose what you guide'),
  areas: pick(GUIDE_AREAS, 7).refine((a) => a.length > 0, 'Please choose at least one area'),
  price_per_day: z.coerce.number().int().min(300, 'Please enter your day rate in rupees').max(50000),
  bio: z.string().trim().min(80, 'Please write at least a few lines about yourself (80 characters or more)').max(1500),
  hp_registration_no: z.string().trim().max(60).optional(),
  consent: z.literal(true, { errorMap: () => ({ message: 'Please confirm the details are correct and agree to the terms' }) }),
  website: z.string().max(0).optional(), // honeypot
});

const slugify = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

export const GUIDE_UPLOAD_BUCKET = 'guide-uploads';
export const GUIDE_PHOTO_BUCKET = 'guide-photos';

/**
 * The profile photo as a square portrait JPEG (900 px), cropped on the face/subject; re-encoding also drops the
 * camera's hidden details such as where the photo was taken.
 */
export async function guidePortrait(bytes: Buffer): Promise<Buffer> {
  const sharp = (await import('sharp')).default;
  return sharp(bytes).rotate().resize(900, 900, { fit: 'cover', position: 'attention' }).jpeg({ quality: 84, mozjpeg: true }).toBuffer();
}

/** On approval: copy the private sign-up photo to the public bucket and return its URL (null when there is none). */
export async function publishGuidePhoto(uploadPath: string | null | undefined): Promise<string | null> {
  if (!uploadPath) return null;
  const sb = serviceClient();
  const { data, error } = await sb.storage.from(GUIDE_UPLOAD_BUCKET).download(uploadPath);
  if (error || !data) throw new HttpError(409, 'The guide photo is missing from storage. Ask the guide to send it on WhatsApp and add it in Edit.');
  const { error: upErr } = await sb.storage.from(GUIDE_PHOTO_BUCKET).upload(uploadPath, data, { contentType: 'image/jpeg', upsert: true });
  if (upErr) throw new HttpError(500, 'Could not publish the guide photo');
  return sb.storage.from(GUIDE_PHOTO_BUCKET).getPublicUrl(uploadPath).data.publicUrl;
}

export async function submitGuide(input: z.infer<typeof guideSignupSchema>, ipHash: string | null, photo: Buffer) {
  const sb = serviceClient();
  if (ipHash) {
    const since = new Date(Date.now() - 24 * 3600e3).toISOString();
    const { count } = await sb.from('guides').select('id', { count: 'exact', head: true }).eq('ip_hash', ipHash).gte('created_at', since);
    if ((count || 0) >= 3) throw new HttpError(429, 'Too many sign-ups from this connection today. Please WhatsApp us instead.');
  }
  const { count: dup } = await sb.from('guides').select('id', { count: 'exact', head: true }).eq('phone', input.phone);
  if (dup) throw new HttpError(409, 'A guide with this mobile number has already signed up. WhatsApp us if you want to update your profile.');

  const base = slugify(`${input.name} guide ${input.areas[0] || 'mcleod ganj'}`) || 'local-guide';
  let slug = base;
  for (let i = 2; i < 20; i++) {
    const { data } = await sb.from('guides').select('id').eq('slug', slug).maybeSingle();
    if (!data) break;
    slug = `${base}-${i}`;
  }
  const languages = [...input.languages, ...String(input.other_languages || '').split(/[,/]/).map((s) => s.trim()).filter((s) => s.length > 1)].slice(0, 12);
  const id = crypto.randomUUID();
  const photoPath = `${id}.jpg`;
  const { error: upErr } = await sb.storage.from(GUIDE_UPLOAD_BUCKET).upload(photoPath, photo, { contentType: 'image/jpeg', upsert: false });
  if (upErr) {
    console.error('Guide photo upload failed:', upErr);
    throw new HttpError(500, 'Could not save your photo. Please try again or WhatsApp us.');
  }
  const { error } = await sb.from('guides').insert({
    id, photo_upload: photoPath, slug, name: input.name, phone: input.phone, whatsapp: input.whatsapp || null, email: input.email || null,
    experience_years: input.experience_years, languages, specializations: input.specializations, areas: input.areas,
    price_per_day: input.price_per_day, bio: input.bio, hp_registration_no: input.hp_registration_no || null,
    status: 'pending', ip_hash: ipHash, whatsapp_alerts: true,
  });
  if (error) {
    await sb.storage.from(GUIDE_UPLOAD_BUCKET).remove([photoPath]);
    console.error('Guide sign-up failed:', error);
    throw new HttpError(500, 'Could not save your sign-up. Please try again or WhatsApp us.');
  }
  // "New partner sign-up" in the subject also reaches the owner's WhatsApp (lib/owner-alerts.ts).
  await sendEmail({
    to: adminEmail(), subject: `New partner sign-up: local guide – ${input.name}`,
    html: `<h2>New local guide sign-up</h2><p><strong>${escHtml(input.name)}</strong> (+${escHtml(input.phone)}), ${escHtml(input.experience_years)} years, ₹${escHtml(input.price_per_day)} a day.</p>`
      + `<p>${escHtml(input.specializations.join(', '))} · ${escHtml(input.areas.join(', '))} · ${escHtml(languages.join(', '))}</p>`
      + `<p>HP Tourism registration: ${escHtml(input.hp_registration_no || 'not given')}</p>`
      + `<p>Approve or reject it here: <a href="${siteConfig.url}/admin/guides">${siteConfig.url}/admin/guides</a></p>`,
  }).catch((e) => console.error('Guide sign-up email failed:', e));
  return { slug };
}
