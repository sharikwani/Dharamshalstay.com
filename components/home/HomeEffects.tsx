'use client';
import { useEffect, useRef } from 'react';
import { BedDouble } from 'lucide-react';
import { trekZoom, TREK_ZOOM_GAIN } from '@/lib/home-helpers';

// Must match TrekScene: each trekker walks the trail in 70s, starting 8s, 11.2s, ... along it.
const TREK_LOOP = 70;
const TREKKER_LEADS = [8, 11.2, 14.4, 17.6, 20.8];

type Props = { sections: { id: string; label: string }[]; navLabel: string; searchLabel: string };

/**
 * Scroll life for the homepage, in one passive listener: the sticky section
 * links and progress bar, hero and CTA parallax, wind in the prayer flags,
 * the trek camera, the Gaddi painting drift, card reveals and tilt, and the
 * phone search bar. Content is always visible without it; this only adds motion.
 */
export default function HomeEffects({ sections, navLabel, searchLabel }: Props) {
  const nav = useRef<HTMLDivElement>(null);
  const prog = useRef<HTMLDivElement>(null);
  const mbar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const q = <T extends Element>(s: string) => document.querySelector<T>('.hm ' + s);
    const hero = q<HTMLElement>('.hero');
    const heroBg = q<HTMLElement>('.hero-bg');
    const ctaImg = q<HTMLElement>('.cta > img, .cta > span > img');
    const garland = document.getElementById('garland');
    const trek = document.getElementById('trail');
    const scene = document.getElementById('trekscene');
    const beats = Array.from(document.querySelectorAll<HTMLElement>('#beats li'));
    const svg = scene?.querySelector('svg') || null;
    const path = document.querySelector<SVGPathElement>('#trekpath');
    const gimg = document.querySelector<HTMLElement>('#gframe img');
    const links = Array.from(nav.current?.querySelectorAll<HTMLAnchorElement>('a') || []);
    const targets = links.map((a) => document.getElementById(a.hash.slice(1)));
    if (reduce) svg?.pauseAnimations();

    let lastY = scrollY, amp = 1, ticking = false;
    let cam: { x: number; y: number } | null = null;
    const frame = () => {
      ticking = false;
      const y = scrollY, vh = innerHeight, max = document.documentElement.scrollHeight - vh;
      const heroH = hero?.offsetHeight || 600;
      nav.current?.classList.toggle('show', y > heroH - 80);
      if (prog.current) prog.current.style.transform = 'scaleX(' + (max > 0 ? y / max : 0) + ')';
      let cur = -1;
      targets.forEach((el, i) => { if (el && el.getBoundingClientRect().top < vh * 0.4) cur = i; });
      links.forEach((a, i) => a.classList.toggle('on', i === cur));

      let trekInView = false;
      if (trek && beats.length) {
        const r = trek.getBoundingClientRect(), span = trek.offsetHeight - vh;
        trekInView = r.top < vh && r.bottom > 0;
        const p = span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 0;
        if (scene && svg && path && !reduce && r.top < vh && r.bottom > 0) {
          // Follow whichever trekker is best placed on screen: find each one's point on the trail,
          // ease the camera toward the best, and zoom there. The scene always covers the stage.
          const z = trekZoom(p), k = (z - 1) / TREK_ZOOM_GAIN;
          const len = path.getTotalLength(), now = svg.getCurrentTime();
          const w = scene.clientWidth, hh = scene.clientHeight, s = Math.max(w / 1600, hh / 900);
          const ox = (w - 1600 * s) / 2, oy = hh - 900 * s; // xMidYMax slice
          let best = { x: w * 0.6, y: hh * 0.55, d: Infinity };
          TREKKER_LEADS.forEach((lead) => {
            const at = path.getPointAtLength(((((now + lead) % TREK_LOOP) + TREK_LOOP) % TREK_LOOP) / TREK_LOOP * len);
            const x = ox + at.x * s, y = oy + (at.y - 40) * s;
            const d = Math.abs(y - hh * 0.55) + Math.abs(x - w * 0.6) * 0.4 + (x < 0 || x > w || y < 0 || y > hh ? 1e5 : 0);
            if (d < best.d) best = { x, y, d };
          });
          if (!cam) cam = { x: best.x, y: best.y };
          cam.x += (best.x - cam.x) * 0.06; cam.y += (best.y - cam.y) * 0.06;
          const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
          const tx = clamp(cam.x + k * (w * 0.62 - cam.x) - z * cam.x, w - z * w, 0);
          const ty = clamp(cam.y + k * (hh * 0.48 - cam.y) - z * cam.y, hh - z * hh, 0);
          scene.style.transformOrigin = '0 0';
          scene.style.transform = 'translate(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px) scale(' + z.toFixed(3) + ')';
        }
        const b = Math.min(beats.length - 1, Math.floor(p * beats.length));
        beats.forEach((li, i) => li.classList.toggle('on', i === b));
      }
      if (reduce) return;
      if (heroBg && y < heroH) heroBg.style.transform = 'translate3d(0,' + (y * 0.35).toFixed(1) + 'px,0)';
      if (ctaImg) {
        const r = ctaImg.parentElement!.getBoundingClientRect();
        if (r.top < vh && r.bottom > 0) ctaImg.style.transform = 'translate3d(0,' + ((r.top - vh / 2) * -0.12).toFixed(1) + 'px,0) scale(1.15)';
      }
      if (gimg) {
        const r = gimg.parentElement!.getBoundingClientRect();
        if (r.bottom > 0 && r.top < vh) {
          const k = (r.top + r.height / 2 - vh / 2) / vh;
          gimg.style.transform = 'scale(' + (1.06 + Math.abs(k) * 0.05).toFixed(3) + ') translateX(' + (k * -2).toFixed(2) + '%)';
        }
      }
      // Faster scrolling blows the prayer flags harder; it settles back on its own.
      amp = Math.min(2.6, Math.max(amp, 1 + Math.abs(y - lastY) / 25));
      garland?.style.setProperty('--amp', amp.toFixed(2));
      lastY = y;
      // The trekkers keep walking while you pause, so the camera keeps following them.
      if (trekInView && !ticking) { ticking = true; requestAnimationFrame(frame); }
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll);
    frame();
    const calm = reduce ? 0 : window.setInterval(() => {
      if (amp > 1.01) { amp = 1 + (amp - 1) * 0.86; garland?.style.setProperty('--amp', amp.toFixed(2)); }
    }, 120);

    // Phone search bar: shows once the hero search has scrolled out of view.
    const book = q<HTMLElement>('.book');
    const bookIo = book ? new IntersectionObserver(([e]) => mbar.current?.classList.toggle('show', !e.isIntersecting)) : null;
    if (book) bookIo!.observe(book);

    // Cards below the fold lift in as they arrive, staggered within their row.
    const cleanups: (() => void)[] = [];
    let revealIo: IntersectionObserver | null = null;
    if (!reduce && 'IntersectionObserver' in window) {
      revealIo = new IntersectionObserver((es) => es.forEach((e) => {
        if (!e.isIntersecting) return;
        const el = e.target as HTMLElement;
        revealIo!.unobserve(el);
        el.classList.add('lift'); el.classList.remove('pre');
        setTimeout(() => { el.classList.remove('lift'); el.style.transitionDelay = ''; }, 1400);
      }), { rootMargin: '0px 0px -10% 0px' });
      document.querySelectorAll<HTMLElement>('.hm .rv').forEach((el) => {
        const sibs = Array.from(el.parentElement!.children).filter((c) => c.classList.contains('rv'));
        el.style.transitionDelay = sibs.indexOf(el) * 90 + 'ms';
        if (el.getBoundingClientRect().top > innerHeight) { el.classList.add('pre'); revealIo!.observe(el); }
      });

      // Experience cards lean toward the pointer.
      if (matchMedia('(pointer: fine)').matches) {
        document.querySelectorAll<HTMLElement>('.hm .xp').forEach((c) => {
          const move = (e: PointerEvent) => {
            const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, yy = (e.clientY - r.top) / r.height;
            c.style.setProperty('--ry', ((x - 0.5) * 10).toFixed(2) + 'deg');
            c.style.setProperty('--rx', ((0.5 - yy) * 8).toFixed(2) + 'deg');
            c.style.setProperty('--gx', (x * 100).toFixed(1) + '%');
            c.style.setProperty('--gy', (yy * 100).toFixed(1) + '%');
          };
          const leave = () => { c.style.setProperty('--rx', '0deg'); c.style.setProperty('--ry', '0deg'); };
          c.addEventListener('pointermove', move);
          c.addEventListener('pointerleave', leave);
          cleanups.push(() => { c.removeEventListener('pointermove', move); c.removeEventListener('pointerleave', leave); });
        });
      }
    }

    return () => {
      removeEventListener('scroll', onScroll);
      removeEventListener('resize', onScroll);
      clearInterval(calm);
      bookIo?.disconnect();
      revealIo?.disconnect();
      cleanups.forEach((f) => f());
    };
  }, []);

  const toSearch = () => {
    const book = document.querySelector<HTMLElement>('.hm .book');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    book?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    setTimeout(() => book?.querySelector<HTMLElement>('select, input')?.focus({ preventScroll: true }), 500);
  };

  return (
    <>
      <div className="hm-secnav" ref={nav}>
        <div className="bar">
          <div className="wrap">
            <ul aria-label={navLabel}>
              {sections.map((s) => <li key={s.id}><a href={'#' + s.id}>{s.label}</a></li>)}
            </ul>
          </div>
          <div className="prog" ref={prog} />
        </div>
      </div>
      <div className="mbar" ref={mbar}>
        <button type="button" className="btn btn-sf" onClick={toSearch}><BedDouble className="ico" aria-hidden="true" />{searchLabel}</button>
      </div>
    </>
  );
}
