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
    name: 'Your name on the card (optional)', share: 'Share card', save: 'Save to Photos', wa: 'Send on WhatsApp', close: 'Close',
    updating: 'Adding your name…', iosHint: 'In the menu that opens, tap “Save Image” to put the card in your Photos.', androidHint: 'Saved. Find it in your Gallery or Google Photos (Downloads).', pcHint: 'Saved to your Downloads folder.', hold: 'Tip: you can also press and hold the card to save it.',
    cta1: 'Light up beautiful Dharamshala & McLeod Ganj', cta2: 'Create yours at dharamshalastay.com',
    gift: '🎁 Poster', giftTitle: 'Your Diwali surprise 🎁', giftSub: 'Get a Diwali poster of McLeod Ganj lit up, with your name on it, to save and send to family and friends.',
    giftName: 'Your name (goes on the poster)', giftEmail: 'Your email', giftBtn: 'Get my Diwali poster', giftBusy: 'Making your poster…',
    giftFine: 'We will email you once to confirm. After you confirm, we send Dharamshala travel ideas and festival offers, at most once a week. Unsubscribe any time.',
    giftErr: 'Please enter a valid email and try again.', giftLater: 'Maybe later',
    readyTitle: 'Your Diwali poster is ready', readySub: 'Save it or share it with everyone you love. Also check your inbox and confirm your email for our Diwali offers.',
    happy: 'Happy Diwali', from: (n: string) => `with love, ${n}`, line: 'from the lit lanes of McLeod Ganj, Dharamshala',
    msg: `Happy Diwali from Dharamshala! 🪔\n\nCreate yours at ${SITE}/?utm_source=diwali-card and light up your beautiful city, Dharamshala and McLeod Ganj.`,
  },
  hi: {
    progress: (n: number) => n >= TOTAL ? 'मैक्लोडगंज जगमगा उठा। शुभ दीपावली!' : `${TOTAL} में से ${n} दीये जले · अगला दीया जलाने के लिए कोई और पेज खोलें`,
    short: (n: number) => n >= TOTAL ? 'शुभ दीपावली!' : `${TOTAL} में से ${n} घर रोशन`,
    lit: (l: DiwaliLight) => `आपने रोशन किया: ${l.hi}`,
    first: 'शुभ दीपावली! हर नया पेज मैक्लोडगंज के एक और घर में दीया जलाता है।',
    card: 'आपका दीपावली कार्ड', fireworks: 'आतिशबाज़ी', hide: 'दीपावली की रोशनी छिपाएँ', show: 'दीपावली की रोशनी दिखाएँ',
    title: 'आपने मैक्लोडगंज रोशन कर दिया', sub: 'बारह घर, भागसू रोड, प्रार्थना पताकाएँ और मंदिर, सब आपकी वजह से जगमगा रहे हैं। यह रहा भेजने के लिए दीपावली कार्ड।',
    name: 'कार्ड पर आपका नाम (वैकल्पिक)', share: 'कार्ड शेयर करें', save: 'फ़ोटो में सेव करें', wa: 'WhatsApp पर भेजें', close: 'बंद करें',
    updating: 'आपका नाम जोड़ा जा रहा है…', iosHint: 'खुलने वाले मेन्यू में “Save Image” दबाएँ, कार्ड आपकी Photos में आ जाएगा।', androidHint: 'सेव हो गया। Gallery या Google Photos (Downloads) में देखें।', pcHint: 'Downloads फ़ोल्डर में सेव हो गया।', hold: 'कार्ड को दबाकर रखने से भी सेव कर सकते हैं।',
    cta1: 'खूबसूरत धर्मशाला और मैक्लोडगंज को रोशन करें', cta2: 'अपना कार्ड बनाएँ: dharamshalastay.com',
    gift: '🎁 पोस्टर', giftTitle: 'आपके लिए दीपावली सरप्राइज़ 🎁', giftSub: 'जगमगाते मैक्लोडगंज का दीपावली पोस्टर, आपके नाम के साथ, सेव करें और परिवार-दोस्तों को भेजें।',
    giftName: 'आपका नाम (पोस्टर पर)', giftEmail: 'आपका ईमेल', giftBtn: 'मेरा दीपावली पोस्टर पाएँ', giftBusy: 'पोस्टर बन रहा है…',
    giftFine: 'पुष्टि के लिए हम एक ईमेल भेजेंगे। पुष्टि के बाद धर्मशाला यात्रा सुझाव और त्योहार ऑफ़र, हफ़्ते में अधिकतम एक बार। कभी भी अनसब्सक्राइब करें।',
    giftErr: 'कृपया सही ईमेल डालें और दोबारा कोशिश करें।', giftLater: 'बाद में',
    readyTitle: 'आपका दीपावली पोस्टर तैयार है', readySub: 'इसे सेव करें या अपनों के साथ शेयर करें। दीपावली ऑफ़र के लिए अपना इनबॉक्स देखें और ईमेल की पुष्टि करें।',
    happy: 'शुभ दीपावली', from: (n: string) => `स्नेह सहित, ${n}`, line: 'मैक्लोडगंज, धर्मशाला की जगमगाती गलियों से',
    msg: `धर्मशाला से शुभ दीपावली! 🪔\n\nअपना कार्ड बनाएँ ${SITE}/hi?utm_source=diwali-card पर और अपने खूबसूरत शहर धर्मशाला और मैक्लोडगंज को रोशन करें।`,
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

const GIFT_KEY = 'ds-diwali-gift';
function giftSeen(): string | null { try { return localStorage.getItem(GIFT_KEY); } catch { return 'seen'; } }
function markGift(v: 'seen' | 'claimed') { try { localStorage.setItem(GIFT_KEY, v); } catch { /* private mode */ } }

export default function DiwaliScene({ path, hindi }: { path: string; hindi: boolean }) {
  const t = hindi ? T.hi : T.en;
  const [state, setState] = useState<DiwaliState | null>(null);
  const [fresh, setFresh] = useState<string | undefined>();
  const [toast, setToast] = useState<string | null>(null);
  const [card, setCard] = useState<false | 'lit' | 'gift'>(false);
  const [gift, setGift] = useState(false);
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
        window.setTimeout(() => setCard('lit'), 4800);
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

  // The Diwali poster offer: once per visitor, 5 s after arriving (never instantly: Google marks pages that
  // cover the content on arrival from search as intrusive). Closing it keeps a "Poster" button in the pill.
  useEffect(() => {
    if (giftSeen()) return;
    const id = window.setTimeout(() => {
      if (giftSeen() || document.querySelector('.lead-offer, .dw-card-wrap')) return;
      markGift('seen'); setGift(true); track('diwali_gift_shown');
    }, 5000);
    return () => window.clearTimeout(id);
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
            {state.done && <button type="button" onClick={() => { setCard('lit'); track('diwali_card_open'); }}>{t.card}</button>}
            {!state.done && <button type="button" onClick={() => { if (giftSeen() === 'claimed') setCard('gift'); else setGift(true); }}>{t.gift}</button>}
            {state.done && <button type="button" onClick={() => burst.current()} className="dw-hide-sm">{t.fireworks}</button>}
            <button type="button" onClick={() => update({ min: true })} aria-label={t.hide} title={t.hide} className="dw-x">×</button>
          </>
        )}
      </div>
      {toast && !state.min && <div className="dw-toast" role="status">✨ {toast}</div>}
      {gift && !card && (
        <DiwaliGift t={t} hindi={hindi} name={state.name} onClose={() => setGift(false)}
          onDone={(name) => { update({ name }); markGift('claimed'); setGift(false); setCard('gift'); window.setTimeout(() => burst.current(), 300); }} />
      )}
      {card && <DiwaliCard t={t} mode={card} name={state.name} onName={(name) => update({ name })} onClose={() => setCard(false)} />}
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
  // the invitation along the bottom, on a dark band over the hillside so it reads on any phone
  const band = ctx.createLinearGradient(0, H - 170, 0, H);
  band.addColorStop(0, 'rgba(5, 9, 24, 0)'); band.addColorStop(0.45, 'rgba(5, 9, 24, 0.82)'); band.addColorStop(1, 'rgba(5, 9, 24, 0.95)');
  ctx.fillStyle = band; ctx.fillRect(0, H - 170, W, 170);
  ctx.fillStyle = '#fde7c0';
  ctx.font = `600 34px ${family}`;
  ctx.fillText(t.cta1, W / 2, H - 82);
  ctx.fillStyle = '#ffcf6b';
  ctx.font = `700 38px ${family}`;
  ctx.fillText(t.cta2, W / 2, H - 32);
  return c;
}

const isIOS = () => /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isAndroid = () => /Android/i.test(navigator.userAgent);

function DiwaliCard({ t, mode, name, onName, onClose }: { t: typeof T.en; mode: 'lit' | 'gift'; name: string; onName: (n: string) => void; onClose: () => void }) {
  const [draft, setDraft] = useState(name);
  const [url, setUrl] = useState<string | null>(null);
  const [drawnFor, setDrawnFor] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [canFiles, setCanFiles] = useState(false);
  const blob = useRef<Blob | null>(null);
  const box = useRef<HTMLDivElement>(null);

  // Redraw the card whenever the name changes; the buttons wait until the picture carries the latest name.
  useEffect(() => {
    let gone = false;
    const id = window.setTimeout(async () => {
      const c = await drawCard(draft, t);
      c.toBlob((b) => {
        if (gone || !b) return;
        blob.current = b;
        try { setCanFiles(typeof navigator.canShare === 'function' && navigator.canShare({ files: [new File([b], 'card.jpg', { type: 'image/jpeg' })] })); } catch { setCanFiles(false); }
        setUrl((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(b); });
        setDrawnFor(draft);
      }, 'image/jpeg', 0.92);
    }, 200);
    return () => { gone = true; window.clearTimeout(id); };
  }, [draft, t]);

  useEffect(() => {
    box.current?.focus();
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);

  const ready = !!url && drawnFor === draft;
  const slug = draft.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const fileName = 'happy-diwali-dharamshala' + (slug ? '-' + slug : '') + '.jpg';
  const file = () => blob.current ? new File([blob.current], fileName, { type: 'image/jpeg' }) : null;

  /** The picture with the name on it, plus the invitation text, to any app or person they pick. */
  const share = async () => {
    if (!ready) return;
    onName(draft);
    const f = file();
    track('diwali_card_share', { how: 'native' });
    if (f && canFiles) {
      try { await navigator.share({ files: [f], text: t.msg }); } catch { /* closed the menu */ }
      return;
    }
    if (typeof navigator.share === 'function') { try { await navigator.share({ text: t.msg }); } catch { /* closed */ } return; }
    window.open(`https://wa.me/?text=${encodeURIComponent(t.msg)}`, '_blank', 'noopener');
  };

  /** iPhone: the share menu with only the picture, where "Save Image" puts it in Photos. Android and computers: download. */
  const save = async () => {
    if (!ready || !url) return;
    onName(draft);
    const f = file();
    track('diwali_card_share', { how: 'save' });
    if (isIOS() && f && canFiles) {
      setHint(t.iosHint);
      try { await navigator.share({ files: [f] }); } catch { /* closed the menu */ }
      return;
    }
    const a = document.createElement('a');
    a.href = url; a.download = fileName;
    document.body.appendChild(a); a.click(); a.remove();
    setHint(isAndroid() ? t.androidHint : t.pcHint);
  };

  return (
    <div className="dw-card-wrap" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dw-card" role="dialog" aria-modal="true" aria-label={t.title} tabIndex={-1} ref={box}>
        <button type="button" className="dw-card-x" onClick={onClose} aria-label={t.close}>×</button>
        <h2>{mode === 'gift' ? t.readyTitle : t.title}</h2>
        <p>{mode === 'gift' ? t.readySub : t.sub}</p>
        <div className="dw-card-img">{url ? <img src={url} alt={t.happy} /> : <span>🪔</span>}</div>
        <label>
          <span>{t.name}</span>
          <input value={draft} maxLength={40} onChange={(e) => { setDraft(e.target.value); setHint(null); }} onBlur={() => onName(draft)} autoComplete="given-name" />
        </label>
        <div className="dw-card-btns">
          <button type="button" className="dw-gold" onClick={share} disabled={!ready}>{ready ? t.share : t.updating}</button>
          <button type="button" onClick={save} disabled={!ready}>{t.save}</button>
          {!canFiles && <a href={`https://wa.me/?text=${encodeURIComponent(t.msg)}`} target="_blank" rel="noopener noreferrer" onClick={() => track('diwali_card_share', { how: 'whatsapp' })}>{t.wa}</a>}
        </div>
        <p className="dw-card-hint" role="status">{hint || t.hold}</p>
      </div>
    </div>
  );
}

/**
 * Name + email for the Diwali poster. Uses the newsletter sign-up (double opt-in): the contact is saved tagged
 * "diwali" and only joins the marketing list after clicking the confirmation email. The poster shows at once either way.
 */
function DiwaliGift({ t, hindi, name, onClose, onDone }: { t: typeof T.en; hindi: boolean; name: string; onClose: () => void; onDone: (name: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(false);
  const first = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (window.matchMedia('(pointer: fine)').matches) first.current?.focus({ preventScroll: true }); // no keyboard jumping up on phones
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const fd = new FormData(e.currentTarget);
    const who = String(fd.get('name') || '').trim().slice(0, 40);
    setBusy(true); setErr(false);
    try {
      const r = await fetch('/api/email/subscribe', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: fd.get('email'), name: who || undefined, website: fd.get('website') || undefined, lang: hindi ? 'hi' : 'en', interests: ['diwali'] }),
      });
      if (!r.ok) throw new Error();
      track('generate_lead', { lead_source: 'diwali_poster' });
      track('diwali_signup');
      onDone(who);
    } catch { setErr(true); } finally { setBusy(false); }
  }

  return (
    <div className="dw-card-wrap dw-gift" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dw-card" role="dialog" aria-modal="true" aria-label={t.giftTitle}>
        <button type="button" className="dw-card-x" onClick={onClose} aria-label={t.close}>×</button>
        <div className="dw-gift-art" aria-hidden="true">🪔✨</div>
        <h2>{t.giftTitle}</h2>
        <p>{t.giftSub}</p>
        <form onSubmit={submit}>
          <label><span>{t.giftName}</span><input ref={first} name="name" defaultValue={name} maxLength={40} autoComplete="given-name" /></label>
          <label><span>{t.giftEmail}</span><input name="email" type="email" required autoComplete="email" inputMode="email" /></label>
          <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ display: 'none' }} />
          {err && <p className="dw-err" role="alert">{t.giftErr}</p>}
          <div className="dw-card-btns"><button type="submit" className="dw-gold" disabled={busy}>{busy ? t.giftBusy : t.giftBtn}</button></div>
          <p className="dw-fine">{t.giftFine}</p>
          <button type="button" className="dw-later" onClick={onClose}>{t.giftLater}</button>
        </form>
      </div>
    </div>
  );
}
