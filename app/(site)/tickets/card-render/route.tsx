import { renderTicketCard } from '@/lib/parties/ticket-card';

/**
 * /tickets/card-render -- draws a party ticket as PNG from its query string (no database). Emails, WhatsApp and
 * the ticket page use /tickets/card/<code>, which looks the ticket up and returns this as a JPEG.
 *   p party   d date and time   v venue   n guest   t ticket line   r room   c code   f booking ref   k kind
 *   tot total   pd paid online (balance = total - paid)   u ticket page URL for the QR code
 */
export const runtime = 'edge';

export async function GET(req: Request) {
  const { searchParams: q, origin } = new URL(req.url);
  const num = (k: string) => (q.get(k) ? Number(q.get(k)) : undefined);
  const total = num('tot'), paid = num('pd');
  const url = (q.get('u') || '').slice(0, 200);
  let qr: string | null = null;
  if (url) {
    try {
      const svg = await (await fetch(origin + '/api/qr?u=' + encodeURIComponent(url))).text();
      if (svg.startsWith('<svg')) qr = 'data:image/svg+xml;base64,' + btoa(svg);
    } catch { /* card without QR */ }
  }
  return renderTicketCard({
    party: q.get('p') || '', date: q.get('d') || '', venue: q.get('v') || '', name: q.get('n') || '', line: q.get('t') || '',
    room: q.get('r') || '', code: q.get('c') || '', ref: q.get('f') || '', christmas: q.get('k') === 'christmas',
    total, paid, balance: total !== undefined && paid !== undefined ? total - paid : undefined, qr,
  });
}
