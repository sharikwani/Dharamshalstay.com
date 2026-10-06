import sharp from 'sharp';

/**
 * /og.jpg -- the /og share card as a JPEG under 300 KB. /og renders PNG only,
 * and a photo card as PNG is ~1 MB; WhatsApp silently drops link previews
 * whose image is over ~300 KB. Takes the same query string as /og.
 */
export const runtime = 'nodejs';

const MAX_BYTES = 290 * 1024;

export async function GET(req: Request) {
  const { search, origin } = new URL(req.url);
  const png = await fetch(origin + '/og' + search);
  if (!png.ok) return new Response('Could not render image\n', { status: 502 });
  const source = Buffer.from(await png.arrayBuffer());

  let jpg: Buffer = source;
  for (const quality of [80, 70, 60, 50]) {
    jpg = await sharp(source).jpeg({ quality, mozjpeg: true, progressive: true }).toBuffer();
    if (jpg.byteLength <= MAX_BYTES) break;
  }

  return new Response(new Uint8Array(jpg), {
    headers: {
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400',
    },
  });
}
