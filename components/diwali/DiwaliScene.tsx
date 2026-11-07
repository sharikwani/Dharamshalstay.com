'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { EMPTY, TOTAL, parseState, visit, type DiwaliLight, type DiwaliState } from '@/lib/diwali';
import { track } from '@/lib/track';
import { sceneSvg } from './scene';
import './diwali.css';

const KEY = 'ds-diwali-2026';
const SITE = 'https://www.dharamshalastay.com';

const T = {
  en: {
    progress: (n: number) => n >= TOTAL ? 'McLeod Ganj is lit. Happy Diwali!' : `${n} of ${TOTAL} lit · open another page to light the next`,
    short: (n: number) => n >= TOTAL ? 'Happy Diwali!' : `${n} of ${TOTAL} homes lit`,
    lit: (l: DiwaliLight) => `You lit ${l.en}`,
    first: 'Happy Diwali! Every page you open lights one more home in McLeod Ganj.',
    card: 'Your Diwali card', fireworks: 'Fireworks', hide: 'Hide the Diwali lights', show: 'Show the Diwali lights',
    title: 'You lit up McLeod Ganj', sub: 'Twelve homes, Bhagsu Road, the prayer flags and the temple are glowing because of you. Here is a Diwali card to send.',
    name: 'Your name on the card (optional)', share: 'Share card', save: 'Save image', wa: 'Send on WhatsApp', close: 'Close',
    happy: 'Happy Diwali', from: (n: string) => `with love, ${n}`, line: 'from the lit lanes of McLeod Ganj, Dharamshala',
    msg: `Happy Diwali from Dharamshala! I lit up McLeod Ganj, one page at a time. Light yours: ${SITE}/?utm_source=diwali-card`,
  },
  hi: {
    progress: (n: number) => n >= TOTAL ? 'मैक्लोडगंज जगमगा उठा। शुभ दीपावली!' : `${TOTAL} में से ${n} दीये जले · अगला दीया जलाने के लिए कोई और पेज खोलें`,
    short: (n: number) => n >= TOTAL ? 'शुभ दीपावली!' : `${TOTAL} में से ${n} घर रोशन`,
    lit: (l: DiwaliLight) => `आपने रोशन किया: ${l.hi}`,
    first: 'शुभ दीपावली! हर नया पेज मैक्लोडगंज के एक और घर में दीया जलाता है।',
    card: 'आपका दीपावली कार्ड', fireworks: 'आतिशबाज़ी', hide: 'दीपावली की रोशनी छिपाएँ', show: 'दीपावली की रोशनी दिखाएँ',
    title: 'आपने मैक्लोडगंज रोशन कर दिया', sub: 'बारह घर, भागसू रोड, प्रार्थना पताकाएँ और मंदिर, सब आपकी वजह से जगमगा रहे हैं। यह रहा भेजने के लिए दीपावली कार्ड।',
    name: 'कार्ड पर आपका नाम (वैकल्पिक)', share: 'कार्ड शेयर करें', save: 'इमेज सेव करें', wa: 'WhatsApp पर भेजें', close: 'बंद करें',
    happy: 'शुभ दीपावली', from: (n: string) => `स्नेह सहित, ${n}`, line: 'मैक्लोडगंज, धर्मशाला की जगमगाती गलियों से',
    msg: `धर्मशाला से शुभ दीपावली! मैंने मैक्लोडगंज को रोशन किया, आप भी करें: ${SITE}/hi?utm_source=diwali-card`,
  },
};

function load(): DiwaliState {
  try { return parseState(localStorage.getItem(KEY)); } catch { return EMPTY; }
}
function save(s: DiwaliState) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private mode: lights reset next visit */ }
}

interface Spark { x: number; y: number; vx: number; vy: number; life: number; max: number; c: string; r: number; g: number; rocket?: boolean }
const SPARK_COLOURS = ['#ffd27a', '#ffb43a', '#fff3c4', '#ff9f1c'];
const BURST_COLOURS = ['#ffcf6b', '#fb7185', '#f472b6', '#a78bfa', '#38bdf8', '#4ade80', '#fde047', '#fb923c'];

export default function DiwaliScene({ path, hindi }: { path: string; hindi: boolean }) {
  const t = hindi ? T.hi : T.en;
  const [state, setState] = useState<DiwaliState | null>(null);
  const [fresh, setFresh] = useState<string | undefined>();
  const [toast, setToast] = useState<string | null>(null);
  const [card, setCard] = useState(false);
  const [aspect, setAspect] = useState(8);
  const band = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const burst = useRef<() => void>(() => {});
  const toastTimer = useRef<number>();

  const say = useCallback((text: string) => {
    setToast(text);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 4200);
  }, []);

  // One more home per new page.
  useEffect(() => {
    const before = load();
    const { state: next, lit } = visit(before, path);
    let s = next;
    if (lit) {
      setFresh(lit.key);
      say(before.pages.length === 0 ? t.first : t.lit(lit));
      track('diwali_light', { lit: s.pages.length });
      if (s.pages.length >= TOTAL && !s.done) {
        s = { ...s, done: true };
        track('diwali_complete');
        window.setTimeout(() => burst.current(), 900);
        window.setTimeout(() => setCard(true), 4800);
      }
    }
    save(s);
    setState(s);
  }, [path]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fit the scene to the strip's shape.
  useEffect(() => {
    const el = band.current;
    if (!el) return;
    const fit = () => { const r = el.getBoundingClientRect(); if (r.height) setAspect(r.width / r.height); };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [state?.min]);

  // Keep the footer clear of the strip while it shows.
  useEffect(() => {
    const on = !!state && !state.min;
    document.body.classList.toggle('has-diwali', on);
    return () => document.body.classList.remove('has-diwali');
  }, [state]);

  // Sparkler trail behind the pointer, and fireworks for the finale. The loop only runs while sparks are alive.
  useEffect(() => {
    const c = canvas.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let w = 0, h = 0, raf = 0, last = 0, night = 0, nightUntil = 0;
    const sparks: Spark[] = [];
    const size = () => { w = window.innerWidth; h = window.innerHeight; c.width = w * dpr; c.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    size();

    const explode = (x: number, y: number) => {
      const col = BURST_COLOURS[Math.floor(Math.random() * BURST_COLOURS.length)];
      const col2 = BURST_COLOURS[Math.floor(Math.random() * BURST_COLOURS.length)];
      for (let i = 0; i < 90; i++) {
        const a = (i / 90) * Math.PI * 2 + Math.random() * 0.1, sp = 1.4 + Math.random() * 3.4;
        sparks.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0, max: 70 + Math.random() * 40, c: i % 3 ? col : col2, r: 2.4, g: 0.035 });
      }
    };
    const frame = () => {
      ctx.clearRect(0, 0, w, h);
      // the page sinks into a dark Diwali night while the fireworks fly, then the daylight comes back
      night += ((performance.now() < nightUntil ? 1 : 0) - night) * 0.05;
      if (night > 0.01) {
        ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
        ctx.fillStyle = `rgba(4, 7, 22, ${(0.72 * night).toFixed(3)})`; ctx.fillRect(0, 0, w, h);
      }
      document.body.classList.toggle('dw-night', night > 0.01);
      ctx.globalCompositeOperation = 'lighter';
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.life++; s.vx *= 0.985; s.vy = s.vy * 0.985 + s.g; s.x += s.vx; s.y += s.vy;
        if (s.rocket && (s.vy > -1.2 || s.life > s.max)) { explode(s.x, s.y); sparks.splice(i, 1); continue; }
        if (s.life > s.max) { sparks.splice(i, 1); continue; }
        const k = 1 - s.life / s.max;
        ctx.globalAlpha = s.rocket ? 1 : k;
        ctx.fillStyle = s.c;
        if (s.g < 0.05 && !s.rocket) { // burst embers: short streaks
          ctx.strokeStyle = s.c; ctx.lineWidth = s.r * (0.4 + k * 0.6); ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(s.x - s.vx * 3, s.y - s.vy * 3); ctx.lineTo(s.x, s.y); ctx.stroke();
        } else { ctx.beginPath(); ctx.arc(s.x, s.y, s.r * (s.rocket ? 1 : 0.5 + k * 0.7), 0, Math.PI * 2); ctx.fill(); }
        if (s.rocket) sparks.push({ x: s.x, y: s.y + 3, vx: (Math.random() - 0.5) * 0.4, vy: 0.6, life: 0, max: 22, c: '#ffcf6b', r: 1.1, g: 0.02 });
      }
      ctx.globalAlpha = 1;
      raf = sparks.length || night > 0.01 ? requestAnimationFrame(frame) : 0;
      if (!raf) ctx.clearRect(0, 0, w, h);
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };

    const onMove = (e: PointerEvent) => {
      if (reduce || sparks.length > 260) return;
      const now = performance.now();
      if (now - last < 18) return;
      last = now;
      for (let i = 0; i < 3; i++) {
        sparks.push({
          x: e.clientX, y: e.clientY, vx: (Math.random() - 0.5) * 2.2, vy: (Math.random() - 0.9) * 1.8,
          life: 0, max: 26 + Math.random() * 22, c: SPARK_COLOURS[i % SPARK_COLOURS.length], r: 1.6 + Math.random(), g: 0.07,
        });
      }
      kick();
    };
    burst.current = () => {
      if (reduce) return;
      nightUntil = performance.now() + 7200;
      kick();
      for (let i = 0; i < 9; i++) {
        window.setTimeout(() => {
          sparks.push({ x: w * (0.15 + Math.random() * 0.7), y: h - 80, vx: (Math.random() - 0.5) * 1.5, vy: -(h / 72) - Math.random() * 3, life: 0, max: 90, c: '#fff3c4', r: 2.2, g: 0.09, rocket: true });
          kick();
        }, i * 380 + Math.random() * 200);
      }
    };
    window.addEventListener('resize', size);
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => { cancelAnimationFrame(raf); document.body.classList.remove('dw-night'); window.removeEventListener('resize', size); window.removeEventListener('pointermove', onMove); };
  }, []);

  const update = (patch: Partial<DiwaliState>) => setState((s) => { const n = { ...(s || EMPTY), ...patch }; save(n); return n; });

  if (!state) return <canvas ref={canvas} className="dw-sparks" aria-hidden="true" />;
  const count = Math.min(TOTAL, state.pages.length);

  return (
    <>
      <canvas ref={canvas} className="dw-sparks" aria-hidden="true" />
      {!state.min && (
        <div ref={band} className="dw-band" aria-hidden="true" dangerouslySetInnerHTML={{ __html: sceneSvg(count, { live: true, fresh, aspect }) }} />
      )}
      <div className={'dw-pill' + (state.min ? ' min' : '')}>
        {state.min ? (
          <button type="button" onClick={() => update({ min: false })} aria-label={t.show} title={t.show} className="dw-diya-btn">🪔</button>
        ) : (
          <>
            <span className="dw-count" aria-live="polite">
              <span aria-hidden="true">🪔 </span>
              <span className="dw-long">{t.progress(count)}</span>
              <span className="dw-short">{t.short(count)}</span>
            </span>
            {state.done && <button type="button" onClick={() => { setCard(true); track('diwali_card_open'); }}>{t.card}</button>}
            {state.done && <button type="button" onClick={() => burst.current()} className="dw-hide-sm">{t.fireworks}</button>}
            <button type="button" onClick={() => update({ min: true })} aria-label={t.hide} title={t.hide} className="dw-x">×</button>
          </>
        )}
      </div>
      {toast && !state.min && <div className="dw-toast" role="status">✨ {toast}</div>}
      {card && <DiwaliCard t={t} name={state.name} onName={(name) => update({ name })} onClose={() => setCard(false)} />}
    </>
  );
}

async function drawCard(name: string, t: typeof T.en): Promise<HTMLCanvasElement> {
  const W = 1080, H = 1350;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d')!;
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#060a1c'); sky.addColorStop(0.55, '#141238'); sky.addColorStop(0.85, '#2a1534'); sky.addColorStop(1, '#070d1e');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 140; i++) { ctx.globalAlpha = 0.25 + Math.random() * 0.6; ctx.fillStyle = '#fff'; ctx.fillRect(Math.random() * W, Math.random() * H * 0.75, 2, 2); }
  ctx.globalAlpha = 1;
  // still fireworks over the peaks
  const bursts: Array<[number, number, number, string]> = [[230, 640, 120, '#fb7185'], [850, 620, 130, '#ffcf6b'], [560, 760, 80, '#38bdf8'], [110, 830, 60, '#fde047'], [990, 800, 60, '#a78bfa']];
  ctx.lineCap = 'round';
  for (const [bx, by, br, col] of bursts) {
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * Math.PI * 2, r0 = br * 0.25, r1 = br * (0.8 + Math.random() * 0.25);
      const g = ctx.createLinearGradient(bx + Math.cos(a) * r0, by + Math.sin(a) * r0, bx + Math.cos(a) * r1, by + Math.sin(a) * r1);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, col);
      ctx.strokeStyle = g; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(bx + Math.cos(a) * r0, by + Math.sin(a) * r0); ctx.lineTo(bx + Math.cos(a) * r1, by + Math.sin(a) * r1); ctx.stroke();
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(bx + Math.cos(a) * r1, by + Math.sin(a) * r1, 3.2, 0, Math.PI * 2); ctx.fill();
    }
  }
  // the lit town, cropped around the temple
  try {
    const img = new Image();
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(sceneSvg(TOTAL, { live: false, view: [520, 0, 400, 150] }));
    await img.decode();
    ctx.drawImage(img, 0, H - Math.round(W * 150 / 400), W, Math.round(W * 150 / 400));
  } catch { /* the card still works without the scene */ }

  const family = getComputedStyle(document.querySelector('h1, h2') || document.body).fontFamily || 'Georgia, serif';
  ctx.textAlign = 'center';
  ctx.font = '120px serif';
  ctx.fillText('🪔', W / 2, 230);
  ctx.shadowColor = 'rgba(255, 180, 60, 0.65)'; ctx.shadowBlur = 40;
  ctx.fillStyle = '#ffcf6b';
  ctx.font = `700 118px ${family}`;
  ctx.fillText(t.happy, W / 2, 390);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#fde7c0';
  if (name.trim()) { ctx.font = `600 56px ${family}`; ctx.fillText(t.from(name.trim()), W / 2, 470); }
  ctx.fillStyle = 'rgba(255,255,255,0.82)';
  ctx.font = `400 36px ${family}`;
  ctx.fillText(t.line, W / 2, name.trim() ? 530 : 470);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = `600 30px ${family}`;
  ctx.fillText('dharamshalastay.com', W / 2, H - 34);
  return c;
}

function DiwaliCard({ t, name, onName, onClose }: { t: typeof T.en; name: string; onName: (n: string) => void; onClose: () => void }) {
  const [draft, setDraft] = useState(name);
  const [url, setUrl] = useState<string | null>(null);
  const blob = useRef<Blob | null>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let gone = false;
    const id = window.setTimeout(async () => {
      const c = await drawCard(draft, t);
      c.toBlob((b) => {
        if (gone || !b) return;
        blob.current = b;
        setUrl((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(b); });
      }, 'image/jpeg', 0.9);
    }, 250);
    return () => { gone = true; window.clearTimeout(id); };
  }, [draft, t]);

  useEffect(() => {
    box.current?.focus();
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);

  const file = () => blob.current ? new File([blob.current], 'happy-diwali-dharamshala.jpg', { type: 'image/jpeg' }) : null;
  const canShareFile = () => { const f = file(); return !!f && typeof navigator.canShare === 'function' && navigator.canShare({ files: [f] }); };

  const share = async () => {
    const f = file();
    track('diwali_card_share', { how: 'native' });
    try { if (f && canShareFile()) await navigator.share({ files: [f], text: t.msg }); else download(); } catch { /* cancelled */ }
  };
  const download = () => {
    if (!url) return;
    track('diwali_card_share', { how: 'save' });
    const a = document.createElement('a');
    a.href = url; a.download = 'happy-diwali-dharamshala.jpg';
    document.body.appendChild(a); a.click(); a.remove();
  };

  return (
    <div className="dw-card-wrap" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dw-card" role="dialog" aria-modal="true" aria-label={t.title} tabIndex={-1} ref={box}>
        <button type="button" className="dw-card-x" onClick={onClose} aria-label={t.close}>×</button>
        <h2>{t.title}</h2>
        <p>{t.sub}</p>
        <div className="dw-card-img">{url ? <img src={url} alt={t.happy} /> : <span>🪔</span>}</div>
        <label>
          <span>{t.name}</span>
          <input value={draft} maxLength={40} onChange={(e) => setDraft(e.target.value)} onBlur={() => onName(draft)} autoComplete="given-name" />
        </label>
        <div className="dw-card-btns">
          <button type="button" className="dw-gold" onClick={share} disabled={!url}>{t.share}</button>
          <button type="button" onClick={download} disabled={!url}>{t.save}</button>
          <a href={`https://wa.me/?text=${encodeURIComponent(t.msg)}`} target="_blank" rel="noopener noreferrer" onClick={() => track('diwali_card_share', { how: 'whatsapp' })}>{t.wa}</a>
        </div>
      </div>
    </div>
  );
}
