'use client';
import { useEffect, useRef } from 'react';
import { istHour, skyPhase } from '@/lib/home-helpers';

const GLIDER_COLOURS = ['#ee5a24', '#e8b923', '#2f6fb5', '#c8372d', '#2f8f5b', '#ffffff', '#ff8fb1', '#14b8a6', '#a855f7', '#f97316'];

function gliderSvg(c: string, c2: string) {
  return '<svg viewBox="0 0 60 44"><path d="M4 12C14 2 46 2 56 12l-4 3C42 8 18 8 8 15z" fill="' + c + '"/>'
    + '<path d="M8 15C18 8 42 8 52 15" fill="none" stroke="' + c2 + '" stroke-width="1.6"/>'
    + '<path d="M9 14l20 22M51 14 31 36M20 10l9 26M40 10l-9 26" stroke="rgba(255,255,255,.7)" stroke-width=".6"/>'
    + '<circle cx="30" cy="37" r="2.6" fill="#13243a"/><path d="M28 39h4l-1 4h-2z" fill="#13243a"/></svg>';
}

/**
 * Decorative layers over the hero photo: light that follows the clock in
 * Dharamshala, stars at night, drifting mist, a flock of paragliders and a
 * garland of prayer flags. All of it is aria-hidden and built once the browser
 * is idle, so the server-rendered hero (headline, search, photo) never waits on it.
 * Phones get a lighter sky: fewer stars and gliders.
 */
export default function HeroAtmosphere() {
  const stars = useRef<HTMLDivElement>(null);
  const flock = useRef<HTMLDivElement>(null);
  const garland = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hero = root.current?.closest('.hero') as HTMLElement | null;
    const light = innerWidth < 700 || matchMedia('(pointer: coarse)').matches;

    // Stars only show at night, so they are only built (and animated) then.
    const buildStars = (night: boolean) => {
      const el = stars.current;
      if (!el) return;
      if (!night) { el.innerHTML = ''; return; }
      if (el.childElementCount) return;
      let s = '';
      for (let i = 0; i < (light ? 24 : 90); i++) {
        s += '<i style="left:' + (Math.random() * 100).toFixed(2) + '%;top:' + (Math.random() * 100).toFixed(2) + '%;--t:' + (2 + Math.random() * 3).toFixed(1)
          + 's;--o:-' + (Math.random() * 3).toFixed(1) + 's;transform:scale(' + (0.5 + Math.random()).toFixed(2) + ')"></i>';
      }
      el.innerHTML = s;
    };
    let ready = false;
    const paint = () => {
      const phase = skyPhase(istHour(new Date()));
      hero?.setAttribute('data-tod', phase);
      if (ready) buildStars(phase === 'night');
    };
    paint();
    const clock = setInterval(paint, 60000);

    const buildFlock = () => {
      if (!flock.current) return;
      const small = innerWidth < 700;
      const n = light ? 3 : 10;
      let html = '';
      for (let i = 0; i < n; i++) {
        const depth = Math.random(); // 0 = far away, 1 = close
        const w = Math.round((small ? 30 : 40) + depth * (small ? 40 : 60));
        const dur = Math.round(90 - depth * 50); // far gliders cross slowly
        html += '<div class="pg' + (i % 4 === 3 ? ' rtl' : '') + '" style="top:' + (8 + Math.random() * 30).toFixed(1) + '%;width:' + w + 'px;opacity:' + (0.55 + depth * 0.45).toFixed(2)
          + ';--dur:' + dur + 's;--del:-' + (Math.random() * dur).toFixed(1) + 's;--y0:' + Math.round(20 + Math.random() * 40) + 'px;--y1:' + Math.round(-30 - Math.random() * 40)
          + 'px;--bob:' + (3 + Math.random() * 2).toFixed(1) + 's">' + gliderSvg(GLIDER_COLOURS[i % 10], GLIDER_COLOURS[(i + 3) % 10]) + '</div>';
      }
      flock.current.innerHTML = html;
    };

    // Prayer flags hung along a sagging curve across the full width of the hero.
    const buildGarland = () => {
      const g = garland.current;
      if (!g) return;
      const w = g.clientWidth, h = g.clientHeight, small = w < 700;
      const y0 = small ? 6 : 10, y1 = small ? 0 : 4, sag = small ? 70 : 110;
      const n = Math.max(8, Math.floor(w / (small ? 40 : 48)));
      const cx = w / 2, cy = sag * 2 - (y0 + y1) / 2;
      let html = '<svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none"><path d="M0 ' + y0 + ' Q' + cx + ' ' + cy + ' ' + w + ' ' + y1 + '"/></svg>';
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n;
        const x = 2 * (1 - t) * t * cx + t * t * w;
        const y = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy + t * t * y1;
        const a = Math.atan2(2 * (1 - t) * (cy - y0) + 2 * t * (y1 - cy), 2 * (1 - t) * cx + 2 * t * (w - cx)) * 180 / Math.PI;
        html += '<div class="fl c' + (i % 5 + 1) + '" style="left:' + x.toFixed(1) + 'px;top:' + y.toFixed(1) + 'px;transform:rotate(' + (a * 0.6).toFixed(1) + 'deg)">'
          + '<i style="--d:' + (2.6 + (i % 4) * 0.35).toFixed(2) + 's;--dl:' + (-(i * 0.37) % 3).toFixed(2) + 's"></i></div>';
      }
      g.innerHTML = html;
    };

    // Built when the browser is idle, after the hero has painted.
    const build = () => { ready = true; paint(); buildFlock(); buildGarland(); };
    const ric = (window as any).requestIdleCallback as ((cb: () => void, o?: { timeout: number }) => number) | undefined;
    const idle = ric ? ric(build, { timeout: 1500 }) : window.setTimeout(build, 600);

    let rt: ReturnType<typeof setTimeout>;
    const onResize = () => { clearTimeout(rt); rt = setTimeout(() => { if (ready) buildGarland(); }, 150); };
    addEventListener('resize', onResize);
    return () => {
      if (ric) (window as any).cancelIdleCallback(idle); else clearTimeout(idle);
      clearInterval(clock); clearTimeout(rt); removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <div ref={root} aria-hidden="true">
      <div className="sky" />
      <div className="stars" ref={stars} />
      <div className="mist m1" />
      <div className="mist m2" />
      <div className="flock" ref={flock} />
      <div className="garland" id="garland" ref={garland} />
    </div>
  );
}
