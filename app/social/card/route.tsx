import { ImageResponse } from 'next/og';

/**
 * /social/card -- branded 1080x1350 (4:5) slide for Instagram and Facebook posts, in the look of our
 * welcome post: full-bleed mountain photos, a serif display face, spaced capitals and a gold accent.
 * Styles: cover (photo + hook), tip (photo, then a point on deep navy), fact (one big line on a darkened
 * photo), question (a prompt to comment), cta (the brand card).
 *   /social/card.jpg?s=cover&img=triund&k=Hidden Dharamshala&t=Most visitors walk past this&n=1&of=6
 * Use the .jpg route for publishing (Instagram only accepts JPEG). Pages never call this directly.
 */
export const runtime = 'edge';

const W = 1080;
const H = 1350;
const INK = '#0c1726';
const NAVY = '#13243b';
const GOLD = '#e3b76a';
const SAFF = '#ee5a24';
const SERIF = 'Cormorant Garamond';
const SANS = 'Poppins';

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

type Style = 'cover' | 'tip' | 'fact' | 'question' | 'cta';

export async function GET(req: Request) {
  const { searchParams: q, origin } = new URL(req.url);
  const raw = q.get('s') || 'cover';
  const style: Style = (['cover', 'tip', 'fact', 'question', 'cta'] as const).includes(raw as Style) ? (raw as Style) : 'cover';
  const kicker = (q.get('k') || '').slice(0, 40);
  const title = (q.get('t') || 'Dharamshala Stay').slice(0, 110);
  const body = (q.get('b') || '').slice(0, 260);
  const n = Number(q.get('n') || 0), of = Number(q.get('of') || 0);

  const label = (kicker + ' Dharamshala Stay Your home in the Himalayas Swipe Comment below 0123456789/').toUpperCase();
  const [photo, logo, serif, sans, caps] = await Promise.all([
    style === 'cta' ? Promise.resolve(null) : loadImage(q.get('img'), origin).then((p) => p || loadImage('dhauladhar-hero', origin)),
    loadImage('/brand/logo-badge-icon-512.png', origin),
    googleFont(SERIF, 600, title + 'Dharamshala Stay?'),
    googleFont(SANS, 400, body + 'dharamshalastay.com'),
    googleFont(SANS, 500, label),
  ]);
  const fonts = [
    serif && { name: SERIF, data: serif, weight: 600 as const, style: 'normal' as const },
    sans && { name: SANS, data: sans, weight: 400 as const, style: 'normal' as const },
    caps && { name: SANS, data: caps, weight: 500 as const, style: 'normal' as const },
  ].filter(Boolean) as { name: string; data: ArrayBuffer; weight: 400 | 500 | 600; style: 'normal' }[];

  const titleSize = (len: number, big: number) => (len > 80 ? big * 0.66 : len > 50 ? big * 0.8 : len > 30 ? big * 0.9 : big);
  const caps1 = (text: string, color: string, size = 24, spacing = 7) => (
    <span style={{ display: 'flex', fontFamily: SANS, fontWeight: 500, fontSize: size, letterSpacing: spacing, color }}>{text.toUpperCase()}</span>
  );
  const rule = (w = 64) => <div style={{ display: 'flex', width: w, height: 2, backgroundColor: GOLD }} />;
  const top = (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        {rule(36)}
        {caps1('Dharamshala Stay', '#f5efe4', 22, 8)}
      </div>
      {n && of ? caps1(`${n}/${of}`, 'rgba(245,239,228,0.85)', 22, 4) : <span style={{ display: 'flex' }} />}
    </div>
  );
  const fullPhoto = (shade: string) => (
    <>
      {photo && <img src={photo} width={W} height={H} style={{ position: 'absolute', top: 0, left: 0, width: W, height: H, objectFit: 'cover' }} />}
      <div style={{ position: 'absolute', top: 0, left: 0, width: W, height: H, display: 'flex', backgroundImage: shade }} />
    </>
  );
  const layer = { position: 'absolute' as const, top: 0, left: 0, width: W, height: H, display: 'flex', flexDirection: 'column' as const, justifyContent: 'space-between' };
  const bodyText = (size = 36, center = false) =>
    body ? <div style={{ display: 'flex', textAlign: center ? 'center' : 'left', justifyContent: center ? 'center' : 'flex-start', fontFamily: SANS, fontWeight: 400, fontSize: size, color: '#dbe3ee', lineHeight: 1.5 }}>{body}</div> : null;

  let content;
  if (style === 'cta') {
    content = (
      <div style={{ width: W, height: H, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: INK, backgroundImage: 'radial-gradient(circle at 50% 28%, rgba(227,183,106,0.22), transparent 58%)', padding: 96, gap: 30 }}>
        {logo && <img src={logo} width={220} height={220} style={{ borderRadius: 999 }} />}
        <div style={{ display: 'flex', fontFamily: SERIF, fontWeight: 600, fontSize: 84, color: '#f5efe4' }}>Dharamshala<span style={{ color: SAFF, marginLeft: 18 }}>Stay</span></div>
        {caps1('Your home in the Himalayas', GOLD, 24, 9)}
        {rule(90)}
        <div style={{ display: 'flex', textAlign: 'center', justifyContent: 'center', fontFamily: SERIF, fontWeight: 600, fontSize: titleSize(title.length, 72), color: '#fff', lineHeight: 1.1, marginTop: 10 }}>{title}</div>
        {bodyText(32, true)}
        <div style={{ display: 'flex', marginTop: 18, border: `2px solid ${GOLD}`, color: '#f5efe4', fontFamily: SANS, fontWeight: 400, fontSize: 32, letterSpacing: 2, borderRadius: 999, padding: '18px 46px' }}>dharamshalastay.com</div>
      </div>
    );
  } else if (style === 'tip') {
    content = (
      <div style={{ width: W, height: H, display: 'flex', position: 'relative', backgroundColor: NAVY }}>
        {photo && <img src={photo} width={W} height={820} style={{ position: 'absolute', top: 0, left: 0, width: W, height: 820, objectFit: 'cover' }} />}
        <div style={{ position: 'absolute', top: 0, left: 0, width: W, height: 830, display: 'flex', backgroundImage: `linear-gradient(180deg, rgba(12,23,38,0.5) 0%, rgba(12,23,38,0) 22%, rgba(19,36,59,0) 52%, ${NAVY} 100%)` }} />
        <div style={{ ...layer, padding: '54px 72px 80px' }}>
          {top}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
            {kicker && <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>{rule(48)}{caps1(kicker, GOLD)}</div>}
            <div style={{ display: 'flex', fontFamily: SERIF, fontWeight: 600, fontSize: titleSize(title.length, 92), color: '#fff', lineHeight: 1.02 }}>{title}</div>
            {bodyText()}
          </div>
        </div>
      </div>
    );
  } else if (style === 'fact') {
    content = (
      <div style={{ width: W, height: H, display: 'flex', position: 'relative', backgroundColor: INK }}>
        {fullPhoto('linear-gradient(180deg, rgba(12,23,38,0.88) 0%, rgba(12,23,38,0.76) 50%, rgba(12,23,38,0.93) 100%)')}
        <div style={{ ...layer, alignItems: 'center', padding: '54px 80px 90px' }}>
          {top}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 34 }}>
            {kicker && caps1(kicker, GOLD, 26, 9)}
            <div style={{ display: 'flex', textAlign: 'center', justifyContent: 'center', fontFamily: SERIF, fontWeight: 600, fontSize: titleSize(title.length, 118), color: '#fff', lineHeight: 1.0 }}>{title}</div>
            {rule(110)}
            {bodyText(36, true)}
          </div>
          <span style={{ display: 'flex', height: 30 }} />
        </div>
      </div>
    );
  } else if (style === 'question') {
    content = (
      <div style={{ width: W, height: H, display: 'flex', position: 'relative', backgroundColor: INK }}>
        {fullPhoto('radial-gradient(circle at 50% 42%, rgba(12,23,38,0.4), rgba(12,23,38,0.9) 72%)')}
        <div style={{ ...layer, alignItems: 'center', padding: '54px 80px 90px' }}>
          {top}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 30 }}>
            <div style={{ display: 'flex', fontFamily: SERIF, fontWeight: 600, fontSize: 220, lineHeight: 0.8, color: GOLD }}>?</div>
            <div style={{ display: 'flex', textAlign: 'center', justifyContent: 'center', fontFamily: SERIF, fontWeight: 600, fontSize: titleSize(title.length, 96), color: '#fff', lineHeight: 1.04 }}>{title}</div>
            {bodyText(36, true)}
          </div>
          <div style={{ display: 'flex', border: `2px solid ${GOLD}`, borderRadius: 999, padding: '14px 40px' }}>{caps1('Comment below', '#f5efe4', 24, 8)}</div>
        </div>
      </div>
    );
  } else {
    content = (
      <div style={{ width: W, height: H, display: 'flex', position: 'relative', backgroundColor: INK }}>
        {fullPhoto('linear-gradient(180deg, rgba(12,23,38,0.55) 0%, rgba(12,23,38,0.05) 26%, rgba(12,23,38,0.15) 50%, rgba(12,23,38,0.82) 76%, rgba(12,23,38,0.97) 100%)')}
        <div style={{ ...layer, padding: '54px 72px 80px' }}>
          {top}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
            {kicker && <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>{rule(56)}{caps1(kicker, GOLD, 26, 9)}</div>}
            <div style={{ display: 'flex', fontFamily: SERIF, fontWeight: 600, fontSize: titleSize(title.length, 124), color: '#fff', lineHeight: 0.98 }}>{title}</div>
            {bodyText()}
            {of > 1 && <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8 }}>{caps1('Swipe', GOLD, 22, 8)}{rule(70)}</div>}
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
