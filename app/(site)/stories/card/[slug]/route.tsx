import sharp from 'sharp';
import { getPublicStory } from '@/lib/stories/store';

/**
 * /stories/card/<slug>?f=story|fame|og -- an approved story as a JPEG card (Instagram only accepts JPEG).
 *   story  1080x1920  our Instagram story when it is Story of the day
 *   fame   1080x1920  the storyteller's own card to post
 *   og     1200x630   link previews (WhatsApp, Facebook, X)
 * Drawn by /stories/card-render (edge); this route looks the story up and converts the PNG.
 */
export const runtime = 'nodejs';
export const revalidate = 3600;

export async function GET(req: Request, { params }: { params: { slug: string } }) {
  const s = await getPublicStory(params.slug);
  if (!s) return new Response('Not found\n', { status: 404 });
  const { searchParams, origin } = new URL(req.url);
  const f = ['story', 'fame', 'og'].includes(searchParams.get('f') || '') ? searchParams.get('f')! : 'story';
  const q = new URLSearchParams({
    f, t: s.title, p: s.place,
    a: `${s.author_name} · ${s.author_kind === 'local' ? 'Local' : 'Traveller'}${s.author_from ? ' from ' + s.author_from : ''}`,
  });
  if (s.instagram) q.set('h', s.instagram);
  if (s.photos[0]) q.set('img', s.photos[0]);
  const png = await fetch(origin + '/stories/card-render?' + q.toString());
  if (!png.ok) return new Response('Could not render the card\n', { status: 502 });
  const jpg = await sharp(Buffer.from(await png.arrayBuffer())).jpeg({ quality: 86, mozjpeg: true, progressive: true }).toBuffer();
  return new Response(new Uint8Array(jpg), {
    headers: {
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400',
      ...(f === 'fame' ? { 'Content-Disposition': 'inline; filename="my-dharamshala-story.jpg"' } : {}),
    },
  });
}
