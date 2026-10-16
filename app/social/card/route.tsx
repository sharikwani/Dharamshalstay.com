import { ImageResponse } from 'next/og';

/**
 * /social/card -- branded 1080x1350 (4:5) slide for Instagram and Facebook posts.
 * Styles: cover (photo + big hook), tip (photo on top, numbered tip below), cta (navy brand card).
 *   /social/card.jpg?s=cover&img=triund&k=Trek guide&t=5 things to know before Triund&n=1&of=6
 * Use the .jpg route for publishing (Instagram only accepts JPEG). Pages never call this directly.
 */
export const runtime = 'edge';

const W = 1080;
const H = 1350;
const NAVY = '#1e3a5f';
const SAFF = '#ee5a24';

const fontCache = new Map<string, Promise<ArrayBuffer | null>>();
function googleFont(family: string, weight: number, text: string): Promise<ArrayBuffer | null> {
  const key = family + weight + text;
  if (!fontCache.has(key)) {
    fontCache.set(key, (async () => {
      try {
        const css = await (await fetch('https://fonts.googleapis.com/css2?family=' + family.replace(/ /g, '+') + ':wght@' + weight + '&text=' + encodeURIComponent(text))).text();
        const url = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1];
        return url ? await (await fetch(url)).arrayBuffer() : null;
      } catch { return null; }
    })());
    if (fontCache.size > 200) fontCache.delete(fontCache.keys().next().value as string);
  }
  return fontCache.get(key)!;
}

/** Our own images only: a place key (/images/places/<key>.jpg) or a site path. */
async function loadImage(src: string | null, origin: string): Promise<string | null> {
  if (!src) return null;
  const path = /^[a-z0-9-]+$/.test(src) ? `/images/places/${src}.jpg` : src;
  if (!path.startsWith('/') || path.startsWith('//')) return null;
  try {
    const res = await fetch(new URL(path, origin), { signal: AbortSignal.timeout(6000) });
    const type = res.headers.get('content-type') || '';
    if (!res.ok || !/image\/(jpeg|jpg|png)/i.test(type)) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + 0x8000)));
    return 'data:' + type.split(';')[0] + ';base64,' + btoa(bin);
  } catch { return null; }
}

export async function GET(req: Request) {
  const { searchParams: q, origin } = new URL(req.url);
  const style = (q.get('s') || 'cover') as 'cover' | 'tip' | 'cta';
  const kicker = (q.get('k') || '').slice(0, 40);
  const title = (q.get('t') || 'Dharamshala Stay').slice(0, 110);
  const body = (q.get('b') || '').slice(0, 260);
  const n = Number(q.get('n') || 0), of = Number(q.get('of') || 0);

  const all = kicker + title + body + 'Dharamshala Stay Swipe dharamshalastay.com Your home in the Himalayas 0123456789/→';
  const [photo, logo, bold, medium] = await Promise.all([
    style === 'cta' ? Promise.resolve(null) : loadImage(q.get('img'), origin).then((p) => p || loadImage('dhauladhar-hero', origin)),
    loadImage('/brand/logo-badge-icon-512.png', origin),
    googleFont('Poppins', 700, all),
    googleFont('Poppins', 500, all),
  ]);
  const fonts = [
    bold && { name: 'Poppins', data: bold, weight: 700 as const, style: 'normal' as const },
    medium && { name: 'Poppins', data: medium, weight: 500 as const, style: 'normal' as const },
  ].filter(Boolean) as { name: string; data: ArrayBuffer; weight: 500 | 700; style: 'normal' }[];

  const brand = (dark: boolean) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, backgroundColor: dark ? 'rgba(255,255,255,0.96)' : 'rgba(255,255,255,0.96)', borderRadius: 999, padding: '10px 26px 10px 10px' }}>
      {logo && <img src={logo} width={58} height={58} style={{ borderRadius: 999 }} />}
      <span style={{ display: 'flex', fontSize: 28, fontWeight: 700, color: NAVY }}>Dharamshala<span style={{ color: SAFF, marginLeft: 8 }}>Stay</span></span>
    </div>
  );
  const counter = n && of ? <span style={{ fontSize: 26, fontWeight: 500, color: '#fff', backgroundColor: 'rgba(15,33,56,0.6)', borderRadius: 999, padding: '8px 18px' }}>{n}/{of}</span> : null;
  const titleSize = (len: number, big: number) => (len > 80 ? big * 0.7 : len > 50 ? big * 0.82 : big);

  let content;
  if (style === 'cta') {
    content = (
      <div style={{ width: W, height: H, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: NAVY, backgroundImage: 'radial-gradient(circle at 50% 30%, rgba(238,90,36,0.25), transparent 60%)', padding: 90, gap: 34 }}>
        {logo && <img src={logo} width={260} height={260} style={{ borderRadius: 999 }} />}
        <div style={{ display: 'flex', fontSize: 50, fontWeight: 700, color: '#fff' }}>Dharamshala<span style={{ color: SAFF, marginLeft: 14 }}>Stay</span></div>
        <div style={{ display: 'flex', fontSize: 26, fontWeight: 500, color: '#b8c6d8', letterSpacing: 4 }}>YOUR HOME IN THE HIMALAYAS</div>
        <div style={{ display: 'flex', textAlign: 'center', justifyContent: 'center', fontSize: titleSize(title.length, 62), fontWeight: 700, color: '#fff', lineHeight: 1.15, marginTop: 30 }}>{title}</div>
        {body && <div style={{ display: 'flex', textAlign: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 500, color: '#dbe5f0', lineHeight: 1.4 }}>{body}</div>}
        <div style={{ display: 'flex', marginTop: 20, backgroundColor: SAFF, color: '#fff', fontSize: 34, fontWeight: 700, borderRadius: 999, padding: '20px 48px' }}>dharamshalastay.com</div>
      </div>
    );
  } else if (style === 'tip') {
    content = (
      <div style={{ width: W, height: H, display: 'flex', flexDirection: 'column', backgroundColor: '#f3f6fa' }}>
        <div style={{ position: 'relative', display: 'flex', width: W, height: 660 }}>
          {photo && <img src={photo} width={W} height={660} style={{ width: W, height: 660, objectFit: 'cover' }} />}
          <div style={{ position: 'absolute', top: 40, left: 44, right: 44, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>{brand(false)}{counter}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 28, padding: '40px 70px 60px', flex: 1 }}>
          {kicker && <div style={{ display: 'flex' }}><span style={{ fontSize: 28, fontWeight: 700, color: '#fff', backgroundColor: SAFF, borderRadius: 12, padding: '8px 20px' }}>{kicker}</span></div>}
          <div style={{ display: 'flex', fontSize: titleSize(title.length, 74), fontWeight: 700, color: NAVY, lineHeight: 1.08 }}>{title}</div>
          {body && <div style={{ display: 'flex', fontSize: 40, fontWeight: 500, color: '#334155', lineHeight: 1.45 }}>{body}</div>}
        </div>
      </div>
    );
  } else {
    content = (
      <div style={{ width: W, height: H, display: 'flex', position: 'relative', backgroundColor: NAVY }}>
        {photo && <img src={photo} width={W} height={H} style={{ position: 'absolute', top: 0, left: 0, width: W, height: H, objectFit: 'cover' }} />}
        <div style={{ position: 'absolute', top: 0, left: 0, width: W, height: H, display: 'flex', backgroundImage: 'linear-gradient(180deg, rgba(16,32,50,0.35) 0%, rgba(16,32,50,0.1) 30%, rgba(16,32,50,0.55) 62%, rgba(16,32,50,0.95) 100%)' }} />
        <div style={{ position: 'absolute', top: 0, left: 0, width: W, height: H, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '50px 64px 70px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>{brand(true)}{counter}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
            {kicker && <div style={{ display: 'flex' }}><span style={{ fontSize: 30, fontWeight: 700, color: '#fff', backgroundColor: SAFF, borderRadius: 12, padding: '8px 22px' }}>{kicker}</span></div>}
            <div style={{ display: 'flex', fontSize: titleSize(title.length, 92), fontWeight: 700, color: '#fff', lineHeight: 1.05, letterSpacing: -1 }}>{title}</div>
            {body && <div style={{ display: 'flex', fontSize: 36, fontWeight: 500, color: '#e2e8f0', lineHeight: 1.4 }}>{body}</div>}
            {of > 1 && <div style={{ display: 'flex', fontSize: 30, fontWeight: 700, color: '#ffb38a' }}>Swipe →</div>}
          </div>
        </div>
      </div>
    );
  }

  return new ImageResponse(content, {
    width: W, height: H, fonts: fonts.length ? fonts : undefined,
    headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=2592000, stale-while-revalidate=86400' },
  });
}
