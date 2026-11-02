'use client';
import { useEffect, useRef } from 'react';

const COLORS = ['#f2c46d', '#ffe3a3', '#ff7aa8', '#9fd7ff', '#ffb46b', '#c9a7ff'];

type Spark = { x: number; y: number; vx: number; vy: number; life: number; max: number; c: string; r: number };
type Rocket = { x: number; y: number; vy: number; top: number; c: string };
type Flake = { x: number; y: number; r: number; s: number; w: number };

/**
 * Canvas fireworks and drifting snow behind the hero. Rockets rise from the ridge and burst into sparks.
 * Pauses when the hero is off screen or the tab is hidden; does nothing for reduced-motion users.
 */
export default function Fireworks() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const hero = canvas.parentElement!;
    hero.classList.add('nye-canvas-on');

    let w = 0, h = 0, raf = 0, visible = true, last = 0, nextLaunch = 0;
    const sparks: Spark[] = [], rockets: Rocket[] = [], flakes: Flake[] = [];

    const size = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = hero.clientWidth; h = hero.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      flakes.length = 0;
      const n = Math.round(Math.min(70, w / 18));
      for (let i = 0; i < n; i++) flakes.push({ x: Math.random() * w, y: Math.random() * h, r: 0.6 + Math.random() * 1.8, s: 8 + Math.random() * 22, w: Math.random() * Math.PI * 2 });
    };

    const burst = (x: number, y: number, c: string) => {
      const n = w < 640 ? 46 : 70, ring = Math.random() < 0.35;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + Math.random() * 0.2;
        const sp = ring ? 150 : 40 + Math.random() * 150;
        const max = 1.1 + Math.random() * 0.9;
        sparks.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: max, max, c: Math.random() < 0.2 ? '#fff6df' : c, r: 1.2 + Math.random() * 1.3 });
      }
    };

    const launch = () => {
      const x = w * (0.1 + Math.random() * 0.8);
      rockets.push({ x, y: h * 0.82, vy: -(h * 0.9 + Math.random() * h * 0.35), top: h * (0.12 + Math.random() * 0.3), c: COLORS[(Math.random() * COLORS.length) | 0] });
    };

    const frame = (t: number) => {
      raf = requestAnimationFrame(frame);
      if (!visible) { last = t; return; }
      const dt = Math.min(0.05, (t - (last || t)) / 1000);
      last = t;
      if (t > nextLaunch) { launch(); nextLaunch = t + 900 + Math.random() * 1500; }

      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, w, h);

      // Snow: small soft flakes that sway as they fall.
      ctx.fillStyle = 'rgba(251,243,228,0.55)';
      for (const f of flakes) {
        f.y += f.s * dt; f.w += dt; f.x += Math.sin(f.w) * 6 * dt;
        if (f.y > h) { f.y = -4; f.x = Math.random() * w; }
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.fill();
      }

      ctx.globalCompositeOperation = 'lighter';
      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        r.y += r.vy * dt; r.vy *= 0.985;
        ctx.strokeStyle = r.c; ctx.lineWidth = 2; ctx.globalAlpha = 0.8;
        ctx.beginPath(); ctx.moveTo(r.x, r.y); ctx.lineTo(r.x, r.y + 18); ctx.stroke();
        if (r.y <= r.top) { burst(r.x, r.y, r.c); rockets.splice(i, 1); }
      }
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.life -= dt;
        if (s.life <= 0) { sparks.splice(i, 1); continue; }
        s.vx *= 0.97; s.vy = s.vy * 0.97 + 60 * dt;
        s.x += s.vx * dt; s.y += s.vy * dt;
        const k = s.life / s.max;
        ctx.globalAlpha = k * (0.6 + Math.random() * 0.4);
        ctx.fillStyle = s.c;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r * (0.5 + k * 0.5), 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    size();
    const ro = new ResizeObserver(size);
    ro.observe(hero);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting && !document.hidden; });
    io.observe(hero);
    const onVis = () => { visible = !document.hidden; };
    document.addEventListener('visibilitychange', onVis);
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      hero.classList.remove('nye-canvas-on');
    };
  }, []);

  return <canvas ref={ref} className="nye-canvas" aria-hidden="true" />;
}
