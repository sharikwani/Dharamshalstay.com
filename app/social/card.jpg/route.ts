import sharp from 'sharp';

/** /social/card.jpg -- the /social/card slide as a JPEG (Instagram only accepts JPEG). Same query string. */
export const runtime = 'nodejs';

export async function GET(req: Request) {
  const { search, origin } = new URL(req.url);
  const png = await fetch(origin + '/social/card' + search);
  if (!png.ok) return new Response('Could not render image\n', { status: 502 });
  const jpg = await sharp(Buffer.from(await png.arrayBuffer())).jpeg({ quality: 86, mozjpeg: true, progressive: true }).toBuffer();
  return new Response(new Uint8Array(jpg), {
    headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=86400, s-maxage=2592000, stale-while-revalidate=86400' },
  });
}
