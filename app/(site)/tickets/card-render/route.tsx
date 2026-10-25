import { ImageResponse } from 'next/og';

/**
 * /tickets/card-render -- draws a party ticket as PNG from its query string (no database). Emails, WhatsApp and
 * the ticket page use /tickets/card/<code>, which looks the ticket up and returns this as a JPEG.
 *   p party name   d date and time   v venue   n guest name   t ticket line   c ticket code   k kind (christmas|new-year)
 */
export const runtime = 'edge';

const W = 1080;
const H = 1350;
const NIGHT = '#120a26';
const GOLD = '#f2c46d';
const CREAM = '#fbf3e4';

async function googleFont(family: string, weight: number, text: string): Promise<ArrayBuffer | null> {
  try {
    const css = await (await fetch('https://fonts.googleapis.com/css2?family=' + family.replace(/ /g, '+') + ':wght@' + weight + '&text=' + encodeURIComponent(text))).text();
    const url = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1];
    return url ? await (await fetch(url)).arrayBuffer() : null;
  } catch { return null; }
}

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const clip = (k: string, n: number) => (q.get(k) || '').slice(0, n);
  const party = clip('p', 90), date = clip('d', 80), venue = clip('v', 80), name = clip('n', 60), line = clip('t', 80), code = clip('c', 20);
  const christmas = q.get('k') === 'christmas';
  const big = christmas ? 'Merry Christmas' : '2027';
  const text = party + date + venue + name + line + code + big + 'ADMIT TICKET CODE DHARAMSHALA STAY Dharamshala Stay Show this at the entry dharamshalastay.com GUEST WHEN WHERE';
  const [display, sans, sansBold] = await Promise.all([
    googleFont('Playfair Display', 800, text),
    googleFont('Poppins', 500, text),
    googleFont('Poppins', 700, text),
  ]);
  const fonts = [
    display && { name: 'Playfair Display', data: display, weight: 800 as const, style: 'normal' as const },
    sans && { name: 'Poppins', data: sans, weight: 500 as const, style: 'normal' as const },
    sansBold && { name: 'Poppins', data: sansBold, weight: 700 as const, style: 'normal' as const },
  ].filter(Boolean) as any[];

  // A sprinkle of fixed "confetti" stars so every card looks the same for the same ticket.
  const stars = Array.from({ length: 26 }, (_, i) => ({ x: (i * 397) % W, y: (i * 211) % 560, s: 4 + (i % 4) * 3, o: 0.25 + (i % 5) * 0.12 }));
  const label = (t: string) => <div style={{ display: 'flex', fontFamily: 'Poppins', fontWeight: 700, fontSize: 22, letterSpacing: 5, color: GOLD }}>{t}</div>;
  const value = (t: string, size = 38) => <div style={{ display: 'flex', fontFamily: 'Poppins', fontWeight: 500, fontSize: size, color: CREAM, lineHeight: 1.25 }}>{t}</div>;

  return new ImageResponse(
    (
      <div style={{ width: W, height: H, display: 'flex', flexDirection: 'column', position: 'relative', backgroundColor: NIGHT, backgroundImage: 'radial-gradient(circle at 50% 18%, rgba(242,196,109,0.28), transparent 55%), radial-gradient(circle at 15% 85%, rgba(214,48,111,0.25), transparent 45%)' }}>
        {stars.map((s, i) => <div key={i} style={{ position: 'absolute', left: s.x, top: s.y, width: s.s, height: s.s, borderRadius: 99, background: GOLD, opacity: s.o, display: 'flex' }} />)}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 70 }}>
          <div style={{ display: 'flex', fontFamily: 'Poppins', fontWeight: 700, fontSize: 24, letterSpacing: 8, color: GOLD }}>DHARAMSHALA STAY</div>
          <div style={{ display: 'flex', fontFamily: 'Playfair Display', fontWeight: 800, fontSize: christmas ? 110 : 190, color: CREAM, lineHeight: 1, marginTop: 20 }}>{big}</div>
          <div style={{ display: 'flex', textAlign: 'center', justifyContent: 'center', fontFamily: 'Playfair Display', fontWeight: 800, fontSize: party.length > 50 ? 44 : 52, color: GOLD, padding: '16px 70px 0', lineHeight: 1.15 }}>{party}</div>
        </div>
        <div style={{ display: 'flex', flex: 1 }} />
        {/* The ticket stub: in normal flow, so long names or dates push it up instead of overflowing. */}
        <div style={{ display: 'flex', flexDirection: 'column', margin: '0 70px', borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.06)', border: `3px solid ${GOLD}`, padding: '40px 54px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{label('GUEST')}{value(name || 'Guest', 46)}</div>
          <div style={{ display: 'flex', gap: 40, marginTop: 26 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>{label('WHEN')}{value(date, 32)}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>{label('WHERE')}{value(venue, 32)}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 26 }}>{label('ADMIT')}{value(line, 34)}</div>
          <div style={{ display: 'flex', borderTop: `3px dashed ${GOLD}`, marginTop: 30, paddingTop: 24, alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{label('TICKET CODE')}
              <div style={{ display: 'flex', fontFamily: 'Poppins', fontWeight: 700, fontSize: 52, letterSpacing: 3, color: CREAM }}>{code}</div>
            </div>
            <div style={{ display: 'flex', fontFamily: 'Poppins', fontWeight: 500, fontSize: 22, color: 'rgba(251,243,228,0.75)', textAlign: 'right', width: 200 }}>Show this at the entry</div>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '22px 0 30px', fontFamily: 'Poppins', fontWeight: 500, fontSize: 22, color: 'rgba(251,243,228,0.7)' }}>dharamshalastay.com</div>
      </div>
    ),
    { width: W, height: H, fonts },
  );
}
