import QRCode from 'qrcode';
import { siteConfig } from '@/lib/config';

export const runtime = 'nodejs';

/** QR code (SVG) for one of our own pages: /api/qr?u=https://www.dharamshalastay.com/... (other sites are refused). */
export async function GET(req: Request) {
  const u = new URL(req.url).searchParams.get('u') || '';
  const site = siteConfig.url.replace(/\/$/, '');
  if (!u.startsWith(site + '/') || u.length > 300) return new Response('Bad link', { status: 400 });
  const svg = await QRCode.toString(u, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#0c1726', light: '#ffffff' } });
  return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=86400' } });
}
