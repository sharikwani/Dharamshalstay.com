import { ImageResponse } from 'next/og';
import { certificate } from '@/lib/game/certificate';
import { CODE_MIN_BOOKING, PARTY_TYPES, PRIZES, placeLabel } from '@/lib/game/tambola';

/**
 * Winner certificate, 1080x1350 (Instagram portrait, fine on WhatsApp): place, winner's name and photo,
 * the party, Dharamshala Stay branding and the discount code. /api/game/certificate/<winner id>
 */
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const W = 1080;
const H = 1350;

const MEDAL: Record<number, { ring: string; fill: string; text: string; ribbon: string }> = {
  1: { ring: '#b8860b', fill: '#f6c945', text: '#5a3e00', ribbon: '#ee5a24' },
  2: { ring: '#8c96a3', fill: '#dfe4ea', text: '#2f3a48', ribbon: '#1e3a5f' },
  3: { ring: '#9a5b2e', fill: '#e2a26b', text: '#4a2508', ribbon: '#2e7d5b' },
};

async function font(family: string, weight: number, text: string): Promise<ArrayBuffer | null> {
  try {
    const css = await (await fetch('https://fonts.googleapis.com/css2?family=' + family.replace(/ /g, '+') + ':wght@' + weight + '&text=' + encodeURIComponent(text), { signal: AbortSignal.timeout(5000) })).text();
    const url = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1];
    return url ? await (await fetch(url, { signal: AbortSignal.timeout(5000) })).arrayBuffer() : null;
  } catch { return null; }
}

async function localPng(path: string, origin: string): Promise<string | null> {
  try {
    const res = await fetch(new URL(path, origin), { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + 0x8000)));
    return 'data:image/png;base64,' + btoa(bin);
  } catch { return null; }
}

const day = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
const inr = (n: number) => '₹' + n.toLocaleString('en-IN');

const MOUNTAINS = 'data:image/svg+xml;base64,' + btoa(
  `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="220" viewBox="0 0 1080 220"><path d="M0 220 L0 150 L120 70 L210 130 L330 30 L450 120 L540 60 L650 140 L760 40 L880 125 L980 80 L1080 140 L1080 220 Z" fill="#1e3a5f" opacity="0.10"/><path d="M0 220 L0 180 L150 120 L260 170 L390 95 L520 165 L640 110 L780 175 L900 120 L1080 185 L1080 220 Z" fill="#1e3a5f" opacity="0.16"/><path d="M330 30 L360 52 L345 50 L330 60 L318 48 L300 50 Z M760 40 L790 62 L772 60 L760 70 L748 58 L730 60 Z" fill="#ffffff" opacity="0.9"/></svg>`,
);

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const origin = new URL(req.url).origin;
  // /api/game/certificate/demo?place=1 shows the design without a real game.
  const demoPlace = Math.min(3, Math.max(1, Number(new URL(req.url).searchParams.get('place')) || 1));
  const c = params.id === 'demo' ? {
    id: 'demo', place: demoPlace, prize: (['full_house', 'first_line', 'early_five'] as const)[demoPlace - 1], name: 'Riya Sharma', photo: null,
    party_name: 'Riya’s 30th Birthday', party_type: 'birthday' as const, host_name: 'Aman', date: new Date().toISOString(),
    discount_code: 'WIN-7K3QX', discount_amount: [1000, 500, 300][demoPlace - 1], code_expires_at: new Date(Date.now() + 180 * 86400e3).toISOString(),
  } : await certificate(params.id);
  if (!c) return new Response('Certificate not found', { status: 404 });
  const m = MEDAL[c.place] || MEDAL[3];
  const prize = PRIZES[c.prize];
  const party = PARTY_TYPES[c.party_type] || 'Party';
  const place = placeLabel(c.place);
  const nameSize = c.name.length > 22 ? 64 : c.name.length > 14 ? 78 : 92;

  const head = 'CERTIFICATE OF VICTORY Tambola Champion Dharamshala Stay ' + place + c.name + c.discount_code;
  const body = `This is proudly presented to for winning at Hosted by on ${c.party_name} ${party} ${c.host_name} ${day(c.date)} ${prize.label} Prize ${inr(c.discount_amount)} OFF your Dharamshala trip Use code on hotels, treks, taxis and paragliding of ${inr(CODE_MIN_BOOKING)}+ . Valid till ${day(c.code_expires_at)}. One use. dharamshalastay.com/play Play free tambola at your next party 0123456789`;
  const [bold, medium, logo] = await Promise.all([font('Poppins', 700, head + body), font('Poppins', 500, head + body), localPng('/brand/logo-badge-icon-512.png', origin)]);
  const fonts = [
    bold && { name: 'Poppins', data: bold, weight: 700 as const, style: 'normal' as const },
    medium && { name: 'Poppins', data: medium, weight: 500 as const, style: 'normal' as const },
  ].filter(Boolean) as { name: string; data: ArrayBuffer; weight: 500 | 700; style: 'normal' }[];

  const initials = c.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  return new ImageResponse(
    (
      <div style={{ width: W, height: H, display: 'flex', backgroundColor: '#fffaf0', fontFamily: 'Poppins', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 28, left: 28, right: 28, bottom: 28, display: 'flex', alignItems: 'flex-end', border: '6px solid ' + m.ring, borderRadius: 28, overflow: 'hidden' }}>
          <img src={MOUNTAINS} width={W - 68} height={200} />
        </div>
        <div style={{ position: 'absolute', top: 44, left: 44, right: 44, bottom: 44, display: 'flex', border: '2px solid ' + m.ring, borderRadius: 20, opacity: 0.6 }} />

        <div style={{ position: 'absolute', top: 0, left: 0, width: W, height: H, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 90px 70px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {logo && <img src={logo} width={64} height={64} style={{ borderRadius: 999 }} />}
            <span style={{ display: 'flex', fontSize: 36, fontWeight: 700, color: '#1e3a5f' }}>Dharamshala<span style={{ color: '#ee5a24', marginLeft: 10 }}>Stay</span></span>
          </div>

          <div style={{ display: 'flex', marginTop: 34, fontSize: 30, fontWeight: 700, letterSpacing: 8, color: m.ring }}>CERTIFICATE OF VICTORY</div>
          <div style={{ display: 'flex', fontSize: 26, fontWeight: 500, color: '#475569', marginTop: 4 }}>Tambola Champion</div>

          <div style={{ display: 'flex', marginTop: 30, position: 'relative', width: 300, height: 260 }}>
            <div style={{ position: 'absolute', left: 25, top: 0, width: 250, height: 250, borderRadius: 999, border: '10px solid ' + m.ring, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: '#1e3a5f' }}>
              {c.photo ? <img src={c.photo} width={230} height={230} style={{ borderRadius: 999, objectFit: 'cover' }} /> : <span style={{ fontSize: 92, fontWeight: 700, color: '#fff' }}>{initials}</span>}
            </div>
            <div style={{ position: 'absolute', right: -10, bottom: -6, width: 118, height: 118, borderRadius: 999, backgroundColor: m.fill, border: '8px solid ' + m.ring, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 18px rgba(0,0,0,0.25)' }}>
              <span style={{ fontSize: 44, fontWeight: 700, color: m.text }}>{place}</span>
            </div>
          </div>

          <div style={{ display: 'flex', fontSize: 28, fontWeight: 500, color: '#475569', marginTop: 26 }}>This is proudly presented to</div>
          <div style={{ display: 'flex', fontSize: nameSize, fontWeight: 700, color: '#1e3a5f', lineHeight: 1.1, marginTop: 6, textAlign: 'center' }}>{c.name}</div>
          <div style={{ display: 'flex', marginTop: 18, fontSize: 30, fontWeight: 500, color: '#334155' }}>
            for winning <span style={{ fontWeight: 700, color: m.ribbon, marginLeft: 10, marginRight: 10 }}>{prize.label}</span> ({place} Prize) at
          </div>
          <div style={{ display: 'flex', fontSize: 44, fontWeight: 700, color: '#0f172a', marginTop: 8, textAlign: 'center' }}>{c.party_name}</div>
          <div style={{ display: 'flex', fontSize: 26, fontWeight: 500, color: '#64748b', marginTop: 4 }}>{party} · Hosted by {c.host_name} · {day(c.date)}</div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 36, padding: '24px 40px', borderRadius: 22, backgroundColor: '#1e3a5f', color: '#fff', width: 820 }}>
            <div style={{ display: 'flex', fontSize: 34, fontWeight: 700 }}>{inr(c.discount_amount)} OFF your Dharamshala trip</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 10 }}>
              <span style={{ fontSize: 24, fontWeight: 500, color: '#cbd5e1' }}>Use code</span>
              <span style={{ fontSize: 40, fontWeight: 700, letterSpacing: 4, backgroundColor: '#ee5a24', borderRadius: 12, padding: '4px 20px' }}>{c.discount_code}</span>
            </div>
            <div style={{ display: 'flex', fontSize: 20, fontWeight: 500, color: '#cbd5e1', marginTop: 12, textAlign: 'center' }}>
              On hotels, treks, taxis and paragliding of {inr(CODE_MIN_BOOKING)}+. Valid till {day(c.code_expires_at)}. One use.
            </div>
          </div>

          <div style={{ display: 'flex', marginTop: 'auto', fontSize: 24, fontWeight: 700, color: '#1e3a5f' }}>Play free tambola at your next party: dharamshalastay.com/play</div>
        </div>
      </div>
    ),
    { width: W, height: H, fonts: fonts.length ? fonts : undefined, headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=86400' } },
  );
}
