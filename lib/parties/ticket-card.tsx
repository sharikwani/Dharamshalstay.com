import { ImageResponse } from 'next/og';

/**
 * The party ticket card (1080x1350 PNG): guest, date, venue, tickets, room, what is paid and what is still due at
 * the entry, the ticket code, the booking ref and a QR code that opens the live ticket page (so the venue sees the
 * current balance, not just what the card said on the day it was sent).
 */
export type TicketCardData = {
  party: string; date: string; venue: string; name: string; line: string; room?: string; code: string; ref?: string;
  christmas?: boolean; total?: number; paid?: number; balance?: number;
  /** QR image as a data URL (made by /api/qr), opening the live ticket page. */
  qr?: string | null;
};

const W = 1080;
const H = 1350;
const NIGHT = '#120a26';
const GOLD = '#f2c46d';
const CREAM = '#fbf3e4';
const rs = (n: number) => '₹' + n.toLocaleString('en-IN');

async function googleFont(family: string, weight: number, text: string): Promise<ArrayBuffer | null> {
  try {
    const css = await (await fetch('https://fonts.googleapis.com/css2?family=' + family.replace(/ /g, '+') + ':wght@' + weight + '&text=' + encodeURIComponent(text))).text();
    const url = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1];
    return url ? await (await fetch(url)).arrayBuffer() : null;
  } catch { return null; }
}

export async function renderTicketCard(d: TicketCardData): Promise<ImageResponse> {
  const clip = (s: string | undefined, n: number) => (s || '').slice(0, n);
  const party = clip(d.party, 90), date = clip(d.date, 80), venue = clip(d.venue, 80), name = clip(d.name, 60);
  const line = clip(d.line, 80), room = clip(d.room, 60), code = clip(d.code, 20), ref = clip(d.ref, 20);
  const big = d.christmas ? 'Merry Christmas' : '2027';
  const money = typeof d.total === 'number' && typeof d.paid === 'number';
  const balance = Math.max(0, d.balance || 0);
  const payText = money ? (balance > 0 ? `PAID ${rs(d.paid!)} · DUE AT ENTRY ${rs(balance)}` : `PAID IN FULL ${rs(d.total!)}`) : '';
  const qr = d.qr || null;

  const text = party + date + venue + name + line + room + code + ref + big + payText
    + 'ADMIT ROOM TICKET CODE BOOKING REF DHARAMSHALA STAY Dharamshala Stay Scan at the entry dharamshalastay.com GUEST WHEN WHERE 0123456789₹·,';
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

  // Fixed "confetti" so the same ticket always looks the same.
  // Kept to the side margins and the top band so they never sit on the text.
  const stars = Array.from({ length: 26 }, (_, i) => ({ x: i % 2 ? (i * 37) % 150 + 10 : W - 160 + (i * 29) % 150, y: (i * 211) % 400, s: 4 + (i % 4) * 3, o: 0.25 + (i % 5) * 0.12 }));
  const label = (t: string) => <div style={{ display: 'flex', fontFamily: 'Poppins', fontWeight: 700, fontSize: 20, letterSpacing: 5, color: GOLD }}>{t}</div>;
  const value = (t: string, size = 34) => <div style={{ display: 'flex', fontFamily: 'Poppins', fontWeight: 500, fontSize: size, color: CREAM, lineHeight: 1.22 }}>{t}</div>;

  return new ImageResponse(
    (
      <div style={{ width: W, height: H, display: 'flex', flexDirection: 'column', position: 'relative', backgroundColor: NIGHT, backgroundImage: 'radial-gradient(circle at 50% 14%, rgba(242,196,109,0.28), transparent 55%), radial-gradient(circle at 12% 88%, rgba(214,48,111,0.22), transparent 45%)' }}>
        {stars.map((s, i) => <div key={i} style={{ position: 'absolute', left: s.x, top: s.y, width: s.s, height: s.s, borderRadius: 99, background: GOLD, opacity: s.o, display: 'flex' }} />)}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 56 }}>
          <div style={{ display: 'flex', fontFamily: 'Poppins', fontWeight: 700, fontSize: 22, letterSpacing: 8, color: GOLD }}>DHARAMSHALA STAY</div>
          <div style={{ display: 'flex', fontFamily: 'Playfair Display', fontWeight: 800, fontSize: d.christmas ? 100 : 160, color: CREAM, lineHeight: 1, marginTop: 14 }}>{big}</div>
          <div style={{ display: 'flex', textAlign: 'center', justifyContent: 'center', fontFamily: 'Playfair Display', fontWeight: 800, fontSize: party.length > 50 ? 40 : 48, color: GOLD, padding: '12px 70px 0', lineHeight: 1.15 }}>{party}</div>
        </div>
        <div style={{ display: 'flex', flex: 1 }} />
        {/* The ticket stub: in normal flow, so long names or dates push it up instead of overflowing. */}
        <div style={{ display: 'flex', flexDirection: 'column', margin: '0 60px', borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.06)', border: `3px solid ${GOLD}`, padding: '34px 46px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{label('GUEST')}{value(name || 'Guest', 44)}</div>
          <div style={{ display: 'flex', gap: 36, marginTop: 22 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>{label('WHEN')}{value(date, 28)}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>{label('WHERE')}{value(venue, 28)}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 22 }}>{label('ADMIT')}{value(line, 30)}</div>
          {room && <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 18 }}>{label('ROOM')}{value(room, 28)}</div>}
          {payText && (
            <div style={{ display: 'flex', marginTop: 22, borderRadius: 16, padding: '14px 20px', justifyContent: 'center', fontFamily: 'Poppins', fontWeight: 700, fontSize: 28, letterSpacing: 1,
              backgroundColor: balance > 0 ? '#f59e0b' : '#16a34a', color: balance > 0 ? NIGHT : '#ffffff' }}>{payText}</div>
          )}
          <div style={{ display: 'flex', borderTop: `3px dashed ${GOLD}`, marginTop: 24, paddingTop: 22, alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {label('TICKET CODE')}
              <div style={{ display: 'flex', fontFamily: 'Poppins', fontWeight: 700, fontSize: 50, letterSpacing: 3, color: CREAM }}>{code}</div>
              {ref && <div style={{ display: 'flex', fontFamily: 'Poppins', fontWeight: 500, fontSize: 22, color: 'rgba(251,243,228,0.75)' }}>{'BOOKING REF ' + ref}</div>}
            </div>
            {qr ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <div style={{ display: 'flex', backgroundColor: '#fff', borderRadius: 14, padding: 10 }}><img src={qr} width={170} height={170} alt="" /></div>
                <div style={{ display: 'flex', fontFamily: 'Poppins', fontWeight: 500, fontSize: 18, color: 'rgba(251,243,228,0.75)' }}>Scan at the entry</div>
              </div>
            ) : (
              <div style={{ display: 'flex', fontFamily: 'Poppins', fontWeight: 500, fontSize: 22, color: 'rgba(251,243,228,0.75)', textAlign: 'right', width: 200 }}>Scan at the entry</div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '18px 0 26px', fontFamily: 'Poppins', fontWeight: 500, fontSize: 22, color: 'rgba(251,243,228,0.7)' }}>dharamshalastay.com</div>
      </div>
    ),
    { width: W, height: H, fonts },
  );
}
