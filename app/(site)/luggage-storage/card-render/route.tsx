import { ImageResponse } from 'next/og';

/**
 * /luggage-storage/card-render -- a verified local business's share card (PNG, 1080x1350) from its query string.
 * The business shares /luggage-storage/card/<slug> (JPEG) on WhatsApp; its QR code opens the business profile.
 *   n name   a area   p price   f features (|)   o owner   ph phone   u profile URL   v verified (1)
 */
export const runtime = 'edge';

const W = 1080;
const H = 1350;
const INK = '#0c1726';
const NAVY = '#13243b';
const GOLD = '#e3b76a';
const CREAM = '#f5efe4';

async function googleFont(family: string, weight: number, text: string): Promise<ArrayBuffer | null> {
  try {
    const css = await (await fetch('https://fonts.googleapis.com/css2?family=' + family.replace(/ /g, '+') + ':wght@' + weight + '&text=' + encodeURIComponent(text))).text();
    const url = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1];
    return url ? await (await fetch(url)).arrayBuffer() : null;
  } catch { return null; }
}

export async function GET(req: Request) {
  const { searchParams: q, origin } = new URL(req.url);
  const clip = (k: string, n: number) => (q.get(k) || '').slice(0, n);
  const name = clip('n', 90), area = clip('a', 60), price = clip('p', 80), owner = clip('o', 40), phone = clip('ph', 24), url = clip('u', 200);
  const features = clip('f', 300).split('|').map((x) => x.trim()).filter(Boolean).slice(0, 3);
  const verified = q.get('v') === '1';
  const shortUrl = url.replace(/^https?:\/\/(www\.)?/, '');

  let qr: string | null = null;
  try {
    const svg = await (await fetch(origin + '/api/qr?u=' + encodeURIComponent(url))).text();
    if (svg.startsWith('<svg')) qr = 'data:image/svg+xml;base64,' + btoa(svg);
  } catch { /* card without QR */ }

  const text = name + area + price + owner + phone + shortUrl + features.join('') + 'VERIFIED BY DHARAMSHALA STAY LUGGAGE STORAGE Scan to see our profile Call Dharamshala Stay Your home in the Himalayas';
  const [serif, sans, sansBold] = await Promise.all([googleFont('Cormorant Garamond', 700, text), googleFont('Poppins', 500, text), googleFont('Poppins', 700, text)]);
  const fonts = [
    serif && { name: 'Cormorant Garamond', data: serif, weight: 700 as const, style: 'normal' as const },
    sans && { name: 'Poppins', data: sans, weight: 500 as const, style: 'normal' as const },
    sansBold && { name: 'Poppins', data: sansBold, weight: 700 as const, style: 'normal' as const },
  ].filter(Boolean) as any[];

  return new ImageResponse(
    (
      <div style={{ width: W, height: H, display: 'flex', flexDirection: 'column', backgroundColor: INK, backgroundImage: `radial-gradient(circle at 80% 10%, rgba(227,183,106,0.22), transparent 50%), linear-gradient(180deg, ${INK}, ${NAVY})`, padding: '64px 72px 56px', color: CREAM }}>
        {verified && (
          <div style={{ display: 'flex', alignSelf: 'flex-start', alignItems: 'center', gap: 12, border: `2px solid ${GOLD}`, borderRadius: 999, padding: '10px 26px', fontFamily: 'Poppins', fontWeight: 700, fontSize: 24, letterSpacing: 3, color: GOLD }}><div style={{ display: 'flex', width: 30, height: 30, borderRadius: 99, backgroundColor: GOLD, color: INK, alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>✔</div>VERIFIED BY DHARAMSHALA STAY</div>
        )}
        <div style={{ display: 'flex', marginTop: 40, fontFamily: 'Poppins', fontWeight: 700, fontSize: 24, letterSpacing: 6, color: 'rgba(245,239,228,0.7)' }}>LUGGAGE STORAGE</div>
        <div style={{ display: 'flex', marginTop: 12, fontFamily: 'Cormorant Garamond', fontWeight: 700, fontSize: name.length > 45 ? 70 : 84, lineHeight: 1.02 }}>{name}</div>
        <div style={{ display: 'flex', marginTop: 18, fontFamily: 'Poppins', fontWeight: 500, fontSize: 32, color: 'rgba(245,239,228,0.85)' }}>{area}</div>
        {price && <div style={{ display: 'flex', marginTop: 26, fontFamily: 'Poppins', fontWeight: 700, fontSize: 40, color: GOLD }}>{price}</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 22 }}>
          {features.map((f) => <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 16, fontFamily: 'Poppins', fontWeight: 500, fontSize: 30 }}><div style={{ display: 'flex', width: 14, height: 14, borderRadius: 99, backgroundColor: GOLD }} />{f}</div>)}
        </div>
        <div style={{ display: 'flex', flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 36, backgroundColor: 'rgba(255,255,255,0.06)', border: '2px solid rgba(227,183,106,0.5)', borderRadius: 32, padding: 30 }}>
          {qr && <div style={{ display: 'flex', backgroundColor: '#fff', borderRadius: 18, padding: 12 }}><img src={qr} width={230} height={230} /></div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
            <div style={{ display: 'flex', fontFamily: 'Poppins', fontWeight: 700, fontSize: 30 }}>Scan to see our profile</div>
            {phone && <div style={{ display: 'flex', fontFamily: 'Poppins', fontWeight: 700, fontSize: 38, color: GOLD }}>Call {owner ? owner.split(' ')[0] + ' ' : ''}{phone}</div>}
            <div style={{ display: 'flex', fontFamily: 'Poppins', fontWeight: 500, fontSize: 22, color: 'rgba(245,239,228,0.75)' }}>{shortUrl}</div>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 34 }}>
          <div style={{ display: 'flex', fontFamily: 'Cormorant Garamond', fontWeight: 700, fontSize: 44 }}>Dharamshala <span style={{ color: '#f08a24', marginLeft: 10 }}>Stay</span></div>
          <div style={{ display: 'flex', fontFamily: 'Poppins', fontWeight: 500, fontSize: 24, letterSpacing: 2, color: GOLD }}>Your home in the Himalayas</div>
        </div>
      </div>
    ),
    { width: W, height: H, fonts },
  );
}
