import QRCode from 'qrcode';

export const runtime = 'nodejs';

/** QR code (SVG) for a game's join link: /api/game/qr?code=123456 */
export async function GET(req: Request) {
  const code = new URL(req.url).searchParams.get('code') || '';
  if (!/^\d{6}$/.test(code)) return new Response('Bad code', { status: 400 });
  const origin = new URL(req.url).origin;
  const svg = await QRCode.toString(origin + '/play?code=' + code, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#102032', light: '#ffffff' } });
  return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=86400' } });
}
