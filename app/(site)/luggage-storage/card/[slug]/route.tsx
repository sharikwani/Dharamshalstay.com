import sharp from 'sharp';
import { siteConfig } from '@/lib/config';
import { serviceBySlug, VERIFIED_SERVICES } from '@/lib/services/store';

/**
 * /luggage-storage/card/<slug> -- the business's share card as a JPEG (WhatsApp and link previews). Drawn by
 * /luggage-storage/card-render (edge); its QR code opens the business profile on our site.
 */
export const runtime = 'nodejs';
export const revalidate = 3600;

export async function GET(req: Request, { params }: { params: { slug: string } }) {
  const s = await serviceBySlug(params.slug);
  if (!s) return new Response('Not found\n', { status: 404 });
  const { origin } = new URL(req.url);
  const display = '+' + s.phone.replace(/^91(\d{5})(\d{5})$/, '91 $1 $2');
  const q = new URLSearchParams({
    n: s.name, a: s.area, p: s.price_text || '', f: s.features.join('|'), o: s.owner_name || '', ph: display,
    u: siteConfig.url.replace(/\/$/, '') + '/luggage-storage/' + s.slug, v: VERIFIED_SERVICES.has(s.slug) ? '1' : '0',
  });
  const png = await fetch(origin + '/luggage-storage/card-render?' + q.toString());
  if (!png.ok) return new Response('Could not render the card\n', { status: 502 });
  const jpg = await sharp(Buffer.from(await png.arrayBuffer())).jpeg({ quality: 88, mozjpeg: true, progressive: true }).toBuffer();
  return new Response(new Uint8Array(jpg), {
    headers: {
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      'Content-Disposition': `inline; filename="${s.slug}-card.jpg"`,
    },
  });
}
