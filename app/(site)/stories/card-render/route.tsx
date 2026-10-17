import { ImageResponse } from 'next/og';

/**
 * /stories/card-render -- draws a story card as PNG from its query string (no database). Pages and
 * Instagram use /stories/card/<slug>, which looks the story up and returns this as a JPEG.
 *   f    story (1080x1920, our Instagram story) | fame (1080x1920, the storyteller's card) | og (1200x630)
 *   t    title   a  "Name · Traveller from Pune"   h  Instagram handle   p  place   img  cover photo URL (JPEG)
 * Photos only from our story-photos bucket or our own /images.
 */
export const runtime = 'edge';

const INK = '#0c1726';
const GOLD = '#e3b76a';
const SERIF = 'Cormorant Garamond';
const SANS = 'Poppins';
const FLAGS = ['#2f6fd6', '#f4f1e8', '#d63a2f', '#2f9e5b', '#f0c419'];

async function googleFont(family: string, weight: number, text: string): Promise<ArrayBuffer | null> {
  try {
    const css = await (await fetch('https://fonts.googleapis.com/css2?family=' + family.replace(/ /g, '+') + ':wght@' + weight + '&text=' + encodeURIComponent(text))).text();
    const url = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1];
    return url ? await (await fetch(url)).arrayBuffer() : null;
  } catch { return null; }
}

async function loadPhoto(src: string, origin: string): Promise<string | null> {
  const bucket = (process.env.NEXT_PUBLIC_SUPABASE_URL || '') + '/storage/v1/object/public/story-photos/';
  const url = src.startsWith(bucket) ? src : src.startsWith('/images/') ? origin + src : null;
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const type = res.headers.get('content-type') || '';
    if (!res.ok || !/image\/(jpeg|jpg|png)/i.test(type)) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + 0x8000)));
    return 'data:' + type.split(';')[0] + ';base64,' + btoa(bin);
  } catch { return null; }
}

function Flags({ width, size }: { width: number; size: number }) {
  const n = Math.ceil(width / (size + 10));
  return (
    <div style={{ display: 'flex', width, justifyContent: 'center', gap: 10, position: 'absolute', top: size * 0.8, left: 0 }}>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} style={{ display: 'flex', width: size, height: size * 1.25, background: FLAGS[i % 5], opacity: 0.93, transform: `rotate(${(i % 3) - 1}deg)` }} />
      ))}
    </div>
  );
}

export async function GET(req: Request) {
  const { searchParams: q, origin } = new URL(req.url);
  const f = ['story', 'fame', 'og'].includes(q.get('f') || '') ? q.get('f')! : 'story';
  const og = f === 'og';
  const W = og ? 1200 : 1080;
  const H = og ? 630 : 1920;
  const rawTitle = (q.get('t') || '').slice(0, 120);
  const title = rawTitle.length > 80 ? rawTitle.slice(0, 78) + '…' : rawTitle;
  const who = (q.get('a') || '').slice(0, 90);
  const handle = q.get('h') ? '@' + (q.get('h') || '').slice(0, 30) : '';
  const place = (q.get('p') || '').slice(0, 40);
  const kicker = f === 'fame' ? 'FEATURED STORYTELLER' : f === 'story' ? 'STORY OF THE DAY' : 'A DHARAMSHALA STORY';
  const foot = f === 'fame' ? 'My story is on dharamshalastay.com/stories' : 'Read it on dharamshalastay.com/stories';
  const text = kicker + title + who + handle + foot + place + 'Dharamshala Stay';
  const photoH = og ? H : Math.round(H * 0.68);

  const [photo, serif, sans, sansBold] = await Promise.all([
    q.get('img') ? loadPhoto(q.get('img')!, origin) : Promise.resolve(null),
    googleFont(SERIF, 700, text), googleFont(SANS, 500, text), googleFont(SANS, 700, text),
  ]);
  const fonts = [
    serif && { name: SERIF, data: serif, weight: 700 as const, style: 'normal' as const },
    sans && { name: SANS, data: sans, weight: 500 as const, style: 'normal' as const },
    sansBold && { name: SANS, data: sansBold, weight: 700 as const, style: 'normal' as const },
  ].filter(Boolean) as any[];

  const node = og ? (
    <div style={{ display: 'flex', width: W, height: H, background: INK, fontFamily: SANS }}>
      <div style={{ display: 'flex', width: 560, height: H, position: 'relative', background: '#20456f' }}>
        {photo && <img src={photo} width={560} height={H} style={{ objectFit: 'cover' }} />}
        <Flags width={560} size={26} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '48px 56px', width: W - 560 }}>
        <div style={{ display: 'flex', color: GOLD, fontSize: 22, letterSpacing: 5, fontWeight: 700 }}>{kicker}</div>
        <div style={{ display: 'flex', color: '#fff', fontFamily: SERIF, fontSize: title.length > 50 ? 50 : 60, lineHeight: 1.05, marginTop: 18 }}>{title}</div>
        <div style={{ display: 'flex', color: '#c5d7ed', fontSize: 24, marginTop: 24 }}>{who}</div>
        <div style={{ display: 'flex', color: '#98b8dd', fontSize: 20, marginTop: 'auto' }}>{place} · Dharamshala Stay</div>
      </div>
    </div>
  ) : (
    <div style={{ display: 'flex', flexDirection: 'column', width: W, height: H, background: INK, fontFamily: SANS, position: 'relative' }}>
      <div style={{ display: 'flex', width: W, height: photoH, position: 'relative', background: '#20456f' }}>
        {photo && <img src={photo} width={W} height={photoH} style={{ objectFit: 'cover' }} />}
        <div style={{ display: 'flex', position: 'absolute', left: 0, bottom: 0, width: W, height: 620, backgroundImage: `linear-gradient(to bottom, rgba(12,23,38,0), ${INK})` }} />
        <Flags width={W} size={44} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', padding: '0 80px', marginTop: -380 }}>
        <div style={{ display: 'flex' }}>
          <div style={{ display: 'flex', background: GOLD, color: INK, fontSize: 30, fontWeight: 700, letterSpacing: 6, padding: '12px 26px', borderRadius: 999 }}>{kicker}</div>
        </div>
        <div style={{ display: 'flex', color: '#fff', fontFamily: SERIF, fontSize: title.length > 50 ? 92 : 110, lineHeight: 1.02, marginTop: 34 }}>{title}</div>
        <div style={{ display: 'flex', color: '#e3ecf7', fontSize: 38, marginTop: 38 }}>{who}</div>
        {handle && <div style={{ display: 'flex', color: GOLD, fontSize: 40, fontWeight: 700, marginTop: 14 }}>{handle}</div>}
        <div style={{ display: 'flex', color: '#98b8dd', fontSize: 32, marginTop: 14 }}>{place}</div>
      </div>
      <div style={{ display: 'flex', position: 'absolute', bottom: 250, left: 80, right: 80, justifyContent: 'space-between', alignItems: 'center', borderTop: '2px solid rgba(227,183,106,0.5)', paddingTop: 34 }}>
        <div style={{ display: 'flex', color: '#fff', fontSize: 30 }}>{foot}</div>
        <div style={{ display: 'flex', color: GOLD, fontSize: 30, fontWeight: 700 }}>Dharamshala Stay</div>
      </div>
    </div>
  );

  return new ImageResponse(node, { width: W, height: H, fonts: fonts.length ? fonts : undefined, headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=86400' } });
}
