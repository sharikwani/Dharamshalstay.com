'use client';
import { useState } from 'react';
import { LANDMARKS } from '@/lib/hotels/discover';

export type MapStay = { id: string; name: string; lat: number; lng: number; band?: string | null; live: boolean };
type Labels = { valley: string; near: string; landmarks: Record<string, string>; legend: Record<string, string>; areaLabel: (slug: string) => string };

// The whole valley, from the cricket stadium up to Triund. North is up.
const B = { latMin: 32.193, latMax: 32.268, lngMin: 76.298, lngMax: 76.362 };
const W = 640;
const H = Math.round(W * ((B.latMax - B.latMin) / ((B.lngMax - B.lngMin) * Math.cos((32.23 * Math.PI) / 180))));
const xy = (lat: number, lng: number) => [((lng - B.lngMin) / (B.lngMax - B.lngMin)) * W, ((B.latMax - lat) / (B.latMax - B.latMin)) * H] as const;
// "McLeod Ganj & around": where most stays are.
const NEAR = (() => { const [x1, y1] = xy(32.263, 76.298); const [x2, y2] = xy(32.224, 76.346); return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 }; })();
const BAND_FILL: Record<string, string> = { budget: '#2f8f5b', 'mid-range': '#2f6fb5', upscale: '#7b4bb3' };

export default function ValleyMap({ stays, areas, activeId, shortlist, onHover, onPick, onArea, selectedAreas, labels }: {
  stays: MapStay[]; areas: { slug: string; lat: number; lng: number }[]; activeId: string | null; shortlist: string[];
  onHover: (id: string | null) => void; onPick: (id: string) => void; onArea: (slug: string) => void; selectedAreas: string[]; labels: Labels;
}) {
  const [near, setNear] = useState(true);
  const s = near ? Math.min(W / NEAR.w, H / NEAR.h) : 1;
  const tx = near ? -NEAR.x * s + (W - NEAR.w * s) / 2 : 0;
  const ty = near ? -NEAR.y * s : 0;
  const view = near ? `0 0 ${W} ${Math.round(NEAR.h * s)}` : `0 0 ${W} ${H}`;
  const k = 1 / s; // keeps pins and labels the same size when zoomed
  const L = LANDMARKS;
  const [trX, trY] = xy(L.trailhead.lat, L.trailhead.lng);
  const [tX, tY] = xy(L.triund.lat, L.triund.lng);
  const active = stays.find((x) => x.id === activeId);

  return (
    <div className="sf-map">
      <div className="sf-map-tabs" role="group">
        <button type="button" aria-pressed={near} onClick={() => setNear(true)}>{labels.near}</button>
        <button type="button" aria-pressed={!near} onClick={() => setNear(false)}>{labels.valley}</button>
      </div>
      <svg viewBox={view} preserveAspectRatio="xMidYMin meet" role="img" aria-label={labels.near}>
        <defs>
          <linearGradient id="sf-land" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#eef2f7" /><stop offset=".16" stopColor="#dfe9df" /><stop offset=".55" stopColor="#d6e6cf" /><stop offset="1" stopColor="#e8e4cf" />
          </linearGradient>
          <pattern id="sf-contour" width="60" height="60" patternUnits="userSpaceOnUse"><path d="M0 30 Q15 20 30 30 T60 30" fill="none" stroke="#b9cbb3" strokeWidth=".6" opacity=".6" /></pattern>
        </defs>
        <g style={{ transform: `translate(${tx}px,${ty}px) scale(${s})`, transition: 'transform .7s cubic-bezier(.4,0,.2,1)' }}>
          <rect width={W} height={H} fill="url(#sf-land)" />
          <rect width={W} height={H} fill="url(#sf-contour)" />
          {/* the Dhauladhar along the north */}
          <path d={`M0 0H${W}V40L${W - 40} 70L${W - 90} 30L${W - 140} 64L${W - 200} 22L${W - 260} 58L${W - 320} 18L${W - 380} 52L${W - 440} 26L${W - 500} 60L${W - 560} 30L${W - 610} 56L0 34Z`} fill="#fbfcfe" stroke="#c9d3df" strokeWidth={k} />
          <text x={W / 2} y={18} textAnchor="middle" className="sf-ridge" style={{ fontSize: 11 * k }}>{labels.landmarks.dhauladhar}</text>
          {/* Dal Lake */}
          {(() => { const [x, y] = xy(L.dalLake.lat, L.dalLake.lng); return <ellipse cx={x} cy={y} rx={7} ry={4} fill="#8fc1e3" />; })()}
          {/* Triund trail */}
          <path d={`M${trX} ${trY} Q${(trX + tX) / 2 + 10} ${(trY + tY) / 2 + 25} ${tX} ${tY}`} fill="none" stroke="#b5651d" strokeWidth={1.6 * k} strokeDasharray={`${3 * k} ${4 * k}`} />
          {/* areas */}
          {areas.map((a, i) => {
            const [x, y] = xy(a.lat, a.lng);
            const on = selectedAreas.includes(a.slug);
            // Two areas close together (Dharamkot and Bhagsu): the later one puts its name underneath.
            const below = areas.slice(0, i).some((b) => { const [bx, by] = xy(b.lat, b.lng); return Math.hypot(bx - x, by - y) < 80 * k; });
            return (
              <g key={a.slug} className={'sf-area' + (on ? ' on' : '')} onClick={() => onArea(a.slug)} style={{ cursor: 'pointer' }}>
                <circle cx={x} cy={y} r={34 * k} />
                <text x={x} y={below ? y + 48 * k : y - 38 * k} textAnchor="middle" style={{ fontSize: 13 * k }}>{labels.areaLabel(a.slug)}</text>
              </g>
            );
          })}
          {/* landmarks */}
          {(['square', 'temple', 'trailhead', 'triund', 'bhagsu', 'dalLake', 'bazaar', 'stadium'] as const).map((key) => {
            const [x, y] = xy(L[key].lat, L[key].lng);
            return (
              <g key={key} className="sf-lm">
                <rect x={x - 3.5 * k} y={y - 3.5 * k} width={7 * k} height={7 * k} transform={`rotate(45 ${x} ${y})`} />
                <text x={x + 7 * k} y={y + 3.5 * k} style={{ fontSize: 9.5 * k }}>{labels.landmarks[key]}</text>
              </g>
            );
          })}
          {/* stays */}
          {stays.map((st) => {
            const [x, y] = xy(st.lat, st.lng);
            const on = st.id === activeId;
            const fav = shortlist.includes(st.id);
            return (
              <g key={st.id} className={'sf-pin' + (on ? ' on' : '') + (st.live ? ' live' : '')} transform={`translate(${x} ${y})`}
                onMouseEnter={() => onHover(st.id)} onMouseLeave={() => onHover(null)} onClick={() => onPick(st.id)} style={{ cursor: 'pointer' }}>
                <circle r={(on ? 9 : 6) * k} fill={st.live ? '#ea580c' : BAND_FILL[st.band || ''] || '#64748b'} stroke="#fff" strokeWidth={2 * k} />
                {fav && <path transform={`scale(${k}) translate(-4 -14)`} d="M4 7.5 1.2 4.8A1.8 1.8 0 0 1 4 2.4a1.8 1.8 0 0 1 2.8 2.4z" fill="#e11d48" />}
                <title>{st.name}</title>
              </g>
            );
          })}
          {active && (() => {
            const [x, y] = xy(active.lat, active.lng);
            const w = Math.min(220, active.name.length * 6.6 + 18);
            return (
              <g transform={`translate(${x} ${y}) scale(${k})`} pointerEvents="none">
                <rect x={-w / 2} y={-38} width={w} height={22} rx={11} fill="#0f2138" />
                <text y={-23} textAnchor="middle" fill="#fff" style={{ fontSize: 11.5, fontWeight: 600 }}>{active.name}</text>
              </g>
            );
          })()}
        </g>
      </svg>
      <ul className="sf-legend">
        {(['budget', 'mid-range', 'upscale'] as const).map((b) => <li key={b}><i style={{ background: BAND_FILL[b] }} />{labels.legend[b]}</li>)}
        <li><i style={{ background: '#ea580c' }} />{labels.legend.live}</li>
      </ul>
    </div>
  );
}
