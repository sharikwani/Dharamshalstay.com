import { ImageResponse } from 'next/og';

/**
 * /og -- branded 1200x630 share image for any page: the page's own photo with
 * its title on top. This is the picture WhatsApp, Facebook, X, LinkedIn,
 * Slack and AI answer engines show when someone shares a link.
 *
 *   /og.jpg?title=Triund Trek&image=/images/places/triund.jpg&tag=2 days, Moderate  (JPEG, via app/og.jpg)
 *
 * Built by generateSEO() in lib/seo.ts; pages never call it directly.
 */
export const runtime = 'edge';

const W = 1200;
const H = 630;
const FALLBACK_IMAGE = '/images/places/dhauladhar-hero.jpg';
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

const fontCache = new Map<string, Promise<ArrayBuffer | null>>();

/** Load a Google font subset with just the glyphs we draw (TTF, which Satori needs). */
function googleFont(family: string, weight: number, text: string): Promise<ArrayBuffer | null> {
  const key = family + weight + text;
  if (!fontCache.has(key)) {
    fontCache.set(key, (async () => {
      try {
        const css = await (await fetch('https://fonts.googleapis.com/css2?family=' + family.replace(/ /g, '+') + ':wght@' + weight + '&text=' + encodeURIComponent(text))).text();
        const url = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1];
        return url ? await (await fetch(url)).arrayBuffer() : null;
      } catch {
        return null;
      }
    })());
    // Don't let one-off titles grow the cache forever.
    if (fontCache.size > 200) fontCache.delete(fontCache.keys().next().value as string);
  }
  return fontCache.get(key)!;
}

/** Local paths and public https hosts only; JPEG/PNG only (what Satori can draw). */
async function loadImage(src: string | null, origin: string): Promise<string | null> {
  if (!src) return null;
  let url: URL;
  try {
    url = new URL(src, origin);
  } catch {
    return null;
  }
  const local = url.origin === origin;
  if (!local && (url.protocol !== 'https:' || /^(localhost|\d+\.\d+\.\d+\.\d+|\[.*\])$/i.test(url.hostname))) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const type = res.headers.get('content-type') || '';
    if (!res.ok || !/image\/(jpeg|jpg|png)/i.test(type)) return null;
    if (Number(res.headers.get('content-length') || 0) > MAX_IMAGE_BYTES) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.byteLength > MAX_IMAGE_BYTES) return null;
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + 0x8000)));
    return 'data:' + type.split(';')[0] + ';base64,' + btoa(bin);
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url);
  // Satori can't shape Devanagari (matras and conjuncts come out in the wrong
  // order), so Hindi pages get the photo and brand only; the Hindi og:title is
  // shown under the image by every platform anyway.
  const deva = /[ऀ-ॿ]/;
  const rawTitle = (searchParams.get('title') || 'Dharamshala Stay').slice(0, 110);
  const rawTag = (searchParams.get('tag') || '').slice(0, 60);
  const title = deva.test(rawTitle) ? '' : rawTitle;
  const tag = deva.test(rawTag) ? '' : rawTag;

  const brand = 'Dharamshala Stay';
  const site = 'dharamshalastay.com';
  const [photo, logo, heading, small] = await Promise.all([
    loadImage(searchParams.get('image'), origin).then((p) => p || loadImage(FALLBACK_IMAGE, origin)),
    loadImage('/icon-192.png', origin),
    googleFont('Poppins', 700, title + brand),
    googleFont('Poppins', 500, tag + site),
  ]);

  const fonts = [
    heading && { name: 'Poppins', data: heading, weight: 700 as const, style: 'normal' as const },
    small && { name: 'Poppins', data: small, weight: 500 as const, style: 'normal' as const },
  ].filter(Boolean) as { name: string; data: ArrayBuffer; weight: 500 | 700; style: 'normal' }[];

  const titleSize = title.length > 70 ? 52 : title.length > 40 ? 62 : 74;

  return new ImageResponse(
    (
      <div style={{ width: W, height: H, display: 'flex', position: 'relative', backgroundColor: '#1e3a5f', fontFamily: 'Poppins' }}>
        {photo && <img src={photo} width={W} height={H} style={{ position: 'absolute', top: 0, left: 0, width: W, height: H, objectFit: 'cover' }} />}
        <div style={{ position: 'absolute', top: 0, left: 0, width: W, height: H, display: 'flex', backgroundImage: 'linear-gradient(180deg, rgba(16,32,50,0.25) 0%, rgba(16,32,50,0.35) 40%, rgba(16,32,50,0.92) 100%)' }} />
        <div style={{ position: 'absolute', top: 0, left: 0, width: W, height: H, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '48px 60px' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 999, padding: '10px 24px 10px 10px' }}>
              {logo && <img src={logo} width={44} height={44} style={{ borderRadius: 12 }} />}
              <span style={{ fontSize: 26, fontWeight: 700, color: '#1e3a5f' }}>{brand}</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {tag && (
              <div style={{ display: 'flex' }}>
                <span style={{ fontSize: 26, fontWeight: 500, color: '#fff', backgroundColor: '#ee5a24', borderRadius: 10, padding: '6px 18px' }}>{tag}</span>
              </div>
            )}
            {title && <div style={{ display: 'flex', fontSize: titleSize, fontWeight: 700, color: '#fff', lineHeight: 1.12, letterSpacing: -1, textShadow: '0 2px 16px rgba(0,0,0,0.35)' }}>{title}</div>}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 24, fontWeight: 500, color: 'rgba(255,255,255,0.85)' }}>
              <div style={{ width: 36, height: 4, backgroundColor: '#ee5a24', borderRadius: 2 }} />
              {site}
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: W,
      height: H,
      fonts: fonts.length ? fonts : undefined,
      headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400' },
    },
  );
}
