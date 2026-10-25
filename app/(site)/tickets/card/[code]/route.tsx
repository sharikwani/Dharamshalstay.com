import sharp from 'sharp';
import { ticketByCode } from '@/lib/parties/tickets';
import { partyDateLabel } from '@/data/parties';

/**
 * /tickets/card/<code> -- a paid party ticket as a JPEG card (WhatsApp image headers need JPEG or PNG; email
 * clients show JPEG best). Drawn by /tickets/card-render (edge); this route looks the ticket up and converts it.
 */
export const runtime = 'nodejs';
export const revalidate = 3600;

export async function GET(req: Request, { params }: { params: { code: string } }) {
  const t = await ticketByCode(decodeURIComponent(params.code).toUpperCase());
  if (!t) return new Response('Not found\n', { status: 404 });
  const { origin } = new URL(req.url);
  const q = new URLSearchParams({
    p: t.party.name, d: partyDateLabel(t.party), v: `${t.party.venue}, ${t.party.area}`,
    n: t.booking.guest_name || '', t: t.line, c: t.booking.ticket_code, k: t.party.kind,
  });
  const png = await fetch(origin + '/tickets/card-render?' + q.toString());
  if (!png.ok) return new Response('Could not render the ticket\n', { status: 502 });
  const jpg = await sharp(Buffer.from(await png.arrayBuffer())).jpeg({ quality: 88, mozjpeg: true, progressive: true }).toBuffer();
  return new Response(new Uint8Array(jpg), {
    headers: {
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      'Content-Disposition': `inline; filename="ticket-${t.booking.ticket_code}.jpg"`,
      'X-Robots-Tag': 'noindex',
    },
  });
}
