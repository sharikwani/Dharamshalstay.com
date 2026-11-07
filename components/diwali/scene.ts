import { LIGHTS, TOTAL } from '@/lib/diwali';

/**
 * The night scene of McLeod Ganj as one SVG string (viewBox 1200 x 150): Dhauladhar peaks, the ridge, homes,
 * Bhagsu Road lights, Bhagsunag Temple, prayer flags and the Tsuglagkhang complex. `lit` lights the first
 * `lit` entries of LIGHTS. Colours are inline so the same markup also renders as an image for the card;
 * the live strip adds CSS classes for flicker and twinkle (diwali.css).
 */

const GOLD = '#ffcf6b';
const DARK_WIN = '#1c2a48';
const WALL = '#0e1830';
const ROOF = '#0a1326';

interface Home { key: string; x: number; y: number; w: number; h: number }

const HOMES: Home[] = [
  { key: 'h1', x: 90, y: 106, w: 34, h: 22 },
  { key: 'h2', x: 180, y: 98, w: 40, h: 26 },
  { key: 'h3', x: 265, y: 91, w: 30, h: 20 },
  { key: 'h4', x: 350, y: 83, w: 44, h: 24 },
  { key: 'h5', x: 450, y: 77, w: 32, h: 22 },
  { key: 'h6', x: 560, y: 69, w: 38, h: 24 },
  { key: 'h7', x: 850, y: 69, w: 36, h: 22 },
  { key: 'h8', x: 950, y: 80, w: 42, h: 26 },
];

/** Small houses that stay dark until the whole town is lit (makes the town feel bigger). */
const DECOR: Array<[number, number, number, number]> = [
  [30, 112, 22, 14], [135, 104, 18, 12], [222, 97, 20, 13], [305, 89, 18, 12], [400, 82, 20, 13],
  [505, 74, 18, 12], [612, 68, 18, 12], [800, 68, 20, 13], [900, 75, 18, 12], [1000, 86, 18, 12],
  [1100, 96, 24, 15], [1165, 100, 20, 13],
];

const CORE_PEAKS: Array<[number, number]> = [
  [60, 70], [170, 40], [280, 30], [400, 22], [520, 35], [640, 18], [760, 30], [880, 26], [1000, 38], [1120, 44],
];

/** The range carries on past both edges, so wide screens see more mountains instead of empty sides. */
const SIDE_PEAKS: Array<[number, number]> = Array.from({ length: 20 }, (_, i) => {
  const left = i < 10;
  const x = left ? -1180 + i * 115 : 1240 + (i - 10) * 115;
  return [x, 28 + ((i * 37) % 42)] as [number, number];
});
const PEAKS = [...SIDE_PEAKS.slice(0, 10), ...CORE_PEAKS, ...SIDE_PEAKS.slice(10)];

/** Dark houses on the outer slopes (light up with the rest of the town at the end). */
const SIDE_DECOR: Array<[number, number, number, number]> = [
  [-1050, 116, 20, 13], [-860, 114, 18, 12], [-640, 115, 22, 14], [-420, 113, 18, 12], [-210, 112, 20, 13],
  [1290, 104, 20, 13], [1480, 106, 18, 12], [1690, 108, 22, 14], [1910, 107, 18, 12], [2150, 106, 20, 13],
];

/** Deterministic star field (same on every render, so server and client agree). */
function stars(): string {
  let seed = 7;
  const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  let out = '';
  for (let i = 0; i < 100; i++) {
    const x = Math.round(rnd() * 3600) - 1200, y = Math.round(rnd() * 46) + 2, r = (rnd() * 0.9 + 0.4).toFixed(2);
    out += `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" opacity="${(rnd() * 0.5 + 0.3).toFixed(2)}" class="dw-star"/>`;
  }
  return out;
}

function flame(x: number, y: number, s: number, live: boolean): string {
  return `<path class="${live ? 'dw-flame' : ''}" d="M${x} ${y - 5 * s} C${x + 2.2 * s} ${y - 2.4 * s} ${x + 1.8 * s} ${y} ${x} ${y} C${x - 1.8 * s} ${y} ${x - 2.2 * s} ${y - 2.4 * s} ${x} ${y - 5 * s} Z" fill="#ffb43a"/>`
    + `<path d="M${x - 2.6 * s} ${y + 0.2} Q${x} ${y + 2.6 * s} ${x + 2.6 * s} ${y + 0.2} Z" fill="#c2410c"/>`;
}

function home(hm: Home, on: boolean, cls: string, live: boolean): string {
  const { x, y, w, h } = hm;
  const left = x - w / 2, top = y - h;
  const ww = Math.max(4, w * 0.18), wh = Math.max(4, h * 0.3);
  const win = on ? GOLD : DARK_WIN;
  let g = `<g class="${cls}">`;
  if (on) g += `<circle cx="${x}" cy="${y - h / 2}" r="${w * 0.95}" fill="url(#dwGlow)" class="${live ? 'dw-halo' : ''}"/>`;
  g += `<rect x="${left}" y="${top}" width="${w}" height="${h}" fill="${WALL}"/>`;
  g += `<polygon points="${left - 4},${top} ${x},${top - h * 0.55} ${left + w + 4},${top}" fill="${ROOF}"/>`;
  g += `<rect x="${left + w * 0.16}" y="${top + h * 0.25}" width="${ww}" height="${wh}" fill="${win}"/>`;
  g += `<rect x="${left + w * 0.84 - ww}" y="${top + h * 0.25}" width="${ww}" height="${wh}" fill="${win}"/>`;
  if (on) {
    // toran (marigold string) over the door and two diyas on the step
    g += `<path d="M${left + 2} ${top + 2} Q${x} ${top + 7} ${left + w - 2} ${top + 2}" stroke="#f59e0b" stroke-width="1.6" fill="none"/>`;
    g += flame(x - w * 0.2, y + 1, 0.9, live) + flame(x + w * 0.2, y + 1, 0.9, live);
  }
  return g + '</g>';
}

function roadLights(on: boolean, cls: string, live: boolean): string {
  // three sagging strings between poles, below the ridge from the bazaar towards Bhagsu
  const poles = [130, 270, 410, 545];
  const yAt = (x: number) => 116 - (x - 130) * 0.07;
  const colours = ['#ffcf6b', '#fb923c', '#f472b6', '#fde047', '#38bdf8'];
  let g = `<g class="${cls}">`;
  let n = 0;
  for (let i = 0; i < poles.length - 1; i++) {
    const a = poles[i], b = poles[i + 1], ya = yAt(a), yb = yAt(b);
    const mx = (a + b) / 2, my = (ya + yb) / 2 + 9;
    g += `<line x1="${a}" y1="${ya - 8}" x2="${a}" y2="${ya + 6}" stroke="#24314f" stroke-width="1.5"/>`;
    g += `<path d="M${a} ${ya - 8} Q${mx} ${my} ${b} ${yb - 8}" stroke="#24314f" stroke-width="0.8" fill="none"/>`;
    for (let k = 1; k < 10; k++) {
      const t = k / 10;
      const px = (1 - t) * (1 - t) * a + 2 * (1 - t) * t * mx + t * t * b;
      const py = (1 - t) * (1 - t) * (ya - 8) + 2 * (1 - t) * t * my + t * t * (yb - 8);
      const fill = on ? colours[n % colours.length] : '#26324d';
      g += `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${on ? 1.9 : 1.3}" fill="${fill}"${on && live ? ` class="dw-twinkle" style="animation-delay:${(n % 7) * 0.31}s"` : ''}/>`;
      n++;
    }
  }
  g += `<line x1="${poles[3]}" y1="${yAt(poles[3]) - 8}" x2="${poles[3]}" y2="${yAt(poles[3]) + 6}" stroke="#24314f" stroke-width="1.5"/>`;
  return g + '</g>';
}

function bhagsu(on: boolean, cls: string, live: boolean): string {
  const x = 1040, y = 88;
  let g = `<g class="${cls}">`;
  if (on) g += `<circle cx="${x}" cy="${y - 20}" r="34" fill="url(#dwGlow)" class="${live ? 'dw-halo' : ''}"/>`;
  g += `<rect x="${x - 20}" y="${y - 12}" width="40" height="12" fill="${WALL}"/>`;
  g += `<path d="M${x - 13} ${y - 12} C${x - 12} ${y - 30} ${x - 4} ${y - 40} ${x} ${y - 46} C${x + 4} ${y - 40} ${x + 12} ${y - 30} ${x + 13} ${y - 12} Z" fill="${ROOF}" stroke="${on ? '#f59e0b' : '#1c2a48'}" stroke-width="1.2"/>`;
  g += `<line x1="${x}" y1="${y - 46}" x2="${x}" y2="${y - 54}" stroke="${on ? '#f59e0b' : '#2a3552'}" stroke-width="1.4"/>`;
  g += `<path d="M${x} ${y - 54} L${x + 8} ${y - 51} L${x} ${y - 48} Z" fill="${on ? '#f97316' : '#2a3552'}"/>`;
  g += `<rect x="${x - 4}" y="${y - 9}" width="8" height="9" fill="${on ? GOLD : DARK_WIN}"/>`;
  if (on) for (const dx of [-16, -9, 9, 16]) g += flame(x + dx, y + 1, 0.85, live);
  return g + '</g>';
}

function flags(on: boolean, cls: string): string {
  const colours = ['#2563eb', '#f1f5f9', '#dc2626', '#16a34a', '#facc15'];
  const ropes: Array<[number, number, number, number]> = [[630, 44, 700, 34], [740, 34, 812, 46]];
  let g = `<g class="${cls}">`;
  let n = 0;
  for (const [x1, y1, x2, y2] of ropes) {
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2 + 7;
    g += `<path d="M${x1} ${y1} Q${mx} ${my} ${x2} ${y2}" stroke="#2a3552" stroke-width="0.7" fill="none"/>`;
    for (let k = 1; k < 9; k++) {
      const t = k / 9;
      const px = (1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * mx + t * t * x2;
      const py = (1 - t) * (1 - t) * y1 + 2 * (1 - t) * t * my + t * t * y2;
      const fill = on ? colours[n % 5] : '#26324d';
      g += `<polygon points="${(px - 2.6).toFixed(1)},${py.toFixed(1)} ${(px + 2.6).toFixed(1)},${py.toFixed(1)} ${px.toFixed(1)},${(py + 6).toFixed(1)}" fill="${fill}" opacity="${on ? 0.9 : 1}"/>`;
      n++;
    }
  }
  g += `<line x1="630" y1="44" x2="630" y2="66" stroke="#24314f" stroke-width="1.4"/><line x1="812" y1="46" x2="812" y2="66" stroke="#24314f" stroke-width="1.4"/>`;
  return g + '</g>';
}

function temple(on: boolean, cls: string, live: boolean): string {
  const x = 720, y = 64;
  const gold = on ? '#e0a83a' : '#2a3552';
  let g = `<g class="${cls}">`;
  if (on) g += `<ellipse cx="${x}" cy="${y - 18}" rx="80" ry="40" fill="url(#dwGlow)" class="${live ? 'dw-halo' : ''}"/>`;
  g += `<rect x="${x - 38}" y="${y - 20}" width="76" height="20" fill="${WALL}"/>`;
  g += `<polygon points="${x - 46},${y - 20} ${x - 30},${y - 31} ${x + 30},${y - 31} ${x + 46},${y - 20}" fill="${ROOF}" stroke="${gold}" stroke-width="1"/>`;
  g += `<rect x="${x - 22}" y="${y - 40}" width="44" height="9" fill="${WALL}"/>`;
  g += `<polygon points="${x - 30},${y - 40} ${x - 16},${y - 49} ${x + 16},${y - 49} ${x + 30},${y - 40}" fill="${ROOF}" stroke="${gold}" stroke-width="1"/>`;
  g += `<path d="M${x - 3} ${y - 49} L${x} ${y - 60} L${x + 3} ${y - 49} Z" fill="${gold}"/><circle cx="${x}" cy="${y - 61}" r="2" fill="${gold}"/>`;
  for (let i = 0; i < 5; i++) g += `<rect x="${x - 30 + i * 13}" y="${y - 15}" width="8" height="9" fill="${on ? GOLD : DARK_WIN}"/>`;
  for (let i = 0; i < 3; i++) g += `<rect x="${x - 15 + i * 12}" y="${y - 38}" width="6" height="6" fill="${on ? GOLD : DARK_WIN}"/>`;
  if (on) for (let i = 0; i < 9; i++) g += flame(x - 36 + i * 9, y + 2, 0.8, live); // butter lamps along the front
  return g + '</g>';
}

/**
 * `aspect` (width / height of the box it fills) widens or narrows the view around the temple so the strip is
 * never stretched or cut off at the top; `view` sets an exact crop (the card uses one).
 */
export function sceneSvg(lit: number, opts: { live: boolean; fresh?: string; aspect?: number; view?: [number, number, number, number] } = { live: false }): string {
  const { live, fresh } = opts;
  const vw = opts.view ? opts.view[2] : Math.max(240, Math.min(3600, 150 * (opts.aspect || 8)));
  const x0 = Math.max(-1200, Math.min(2400 - vw, 700 - vw / 2)); // stay inside the drawn range
  const [vx, vy, vW, vH] = opts.view || [Math.round(x0), 0, Math.round(vw), 150];
  const on = new Set(LIGHTS.slice(0, Math.max(0, Math.min(TOTAL, lit))).map((l) => l.key));
  const all = on.size >= TOTAL;
  const cls = (key: string) => [on.has(key) ? 'on' : '', live && fresh === key ? 'dw-new' : ''].join(' ').trim();

  // jagged ridge: a valley between every two peaks, snow caps that follow the slopes
  const valley = (a: [number, number], b: [number, number]): [number, number] => [Math.round((a[0] + b[0]) / 2 + ((a[0] * 7) % 13) - 6), Math.max(a[1], b[1]) + 24];
  const ridge: Array<[number, number]> = [];
  PEAKS.forEach((pk, k) => { if (k) ridge.push(valley(PEAKS[k - 1], pk)); ridge.push(pk); });
  const peaks = ridge.map(([px, py]) => `${px},${py}`).join(' L');
  const snow = PEAKS.map((pk, k) => {
    const [px, py] = pk;
    const L = k ? valley(PEAKS[k - 1], pk) : [px - 55, py + 30];
    const R = k < PEAKS.length - 1 ? valley(pk, PEAKS[k + 1]) : [px + 55, py + 30];
    const at = (q: number[], f: number, lift = 0) => `${(px + (q[0] - px) * f).toFixed(1)},${(py + (q[1] - py) * f - lift).toFixed(1)}`;
    const pts = [`${px},${py}`, at(R, 0.38), at(R, 0.24, 2), at(R, 0.3, -1), `${px + 1},${py + 7}`, at(L, 0.26, 1), at(L, 0.34, -1), at(L, 0.4)];
    return `<polygon points="${pts.join(' ')}" fill="#e6eef9" opacity="${all ? 0.85 : 0.62}"/>`;
  }).join('');
  const decor = [...SIDE_DECOR, ...DECOR].map(([dx, dy, dw, dh]) => {
    const win = all ? GOLD : '#16213a';
    return `<rect x="${dx - dw / 2}" y="${dy - dh}" width="${dw}" height="${dh}" fill="${WALL}"/>`
      + `<polygon points="${dx - dw / 2 - 2},${dy - dh} ${dx},${dy - dh - dh * 0.5} ${dx + dw / 2 + 2},${dy - dh}" fill="${ROOF}"/>`
      + `<rect x="${dx - 2}" y="${dy - dh * 0.7}" width="4" height="4" fill="${win}"/>`;
  }).join('');

  const homes = HOMES.map((hm) => home(hm, on.has(hm.key), cls(hm.key), live)).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vx} ${vy} ${vW} ${vH}" preserveAspectRatio="xMidYMax slice" width="${vW}" height="${vH}">`
    + `<defs><radialGradient id="dwGlow"><stop offset="0" stop-color="#ffb347" stop-opacity="0.75"/><stop offset="1" stop-color="#ffb347" stop-opacity="0"/></radialGradient>`
    + `<linearGradient id="dwSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0a1226" stop-opacity="0"/><stop offset="0.35" stop-color="#0b1430" stop-opacity="0.88"/><stop offset="1" stop-color="#070d1e"/></linearGradient></defs>`
    + `<rect x="-1200" width="3600" height="150" fill="url(#dwSky)"/>`
    + stars()
    + `<linearGradient id="dwRange" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a4d76"/><stop offset="0.6" stop-color="#1d2b4c"/></linearGradient>`
    + `<path d="M-1200 90 L${peaks} L2400 80 L2400 150 L-1200 150 Z" fill="url(#dwRange)"/>` + snow
    + `<path d="M-1200 150 L-1200 114 C-800 111 -300 115 0 110 C150 95 260 82 400 78 C520 75 600 60 720 62 C860 64 960 84 1080 92 C1140 96 1200 100 1200 100 C1500 104 2000 109 2400 107 L2400 150 Z" fill="#0a1124"/>`
    + decor
    + flags(on.has('flags'), cls('flags'))
    + roadLights(on.has('road'), cls('road'), live)
    + homes
    + bhagsu(on.has('bhagsu'), cls('bhagsu'), live)
    + temple(on.has('temple'), cls('temple'), live)
    + `</svg>`;
}
