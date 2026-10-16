'use client';
import { useEffect, useRef } from 'react';
import { BedDouble } from 'lucide-react';

type Props = { sections: { id: string; label: string }[]; navLabel: string; searchLabel: string };

/**
 * Scroll life for the homepage, in one passive listener: the sticky section
 * links and progress bar, hero and CTA parallax, wind in the prayer flags,
 * card reveals and tilt, and the phone search bar. Content is always visible without it; this only adds motion.
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
    const links = Array.from(nav.current?.querySelectorAll<HTMLAnchorElement>('a') || []);
    const targets = links.map((a) => document.getElementById(a.hash.slice(1)));

    // Layout is measured once and again only when the page changes size, never on each scroll frame.
    let tops: number[] = [], heroH = 600, max = 0, ctaTop = 0, ctaH = 0;
    const measure = () => {
      const y = scrollY;
      tops = targets.map((el) => (el ? el.getBoundingClientRect().top + y : Infinity));
      heroH = hero?.offsetHeight || 600;
      max = document.documentElement.scrollHeight - innerHeight;
      if (ctaImg) { const r = ctaImg.parentElement!.getBoundingClientRect(); ctaTop = r.top + y; ctaH = r.height; }
    };
    measure();

    let lastY = scrollY, amp = 1, ticking = false, calm = 0;
    // Lets the flags settle after a fast scroll; runs only while they are still moving.
    const settle = () => {
      amp = 1 + (amp - 1) * 0.86;
      garland?.style.setProperty('--amp', amp.toFixed(2));
      calm = amp > 1.01 ? window.setTimeout(settle, 120) : 0;
    };
    const frame = () => {
      ticking = false;
      const y = scrollY, vh = innerHeight;
      nav.current?.classList.toggle('show', y > heroH - 80);
      if (prog.current) prog.current.style.transform = 'scaleX(' + (max > 0 ? y / max : 0) + ')';
      let cur = -1;
      tops.forEach((top, i) => { if (top - y < vh * 0.4) cur = i; });
      links.forEach((a, i) => a.classList.toggle('on', i === cur));

      if (reduce) return;
      if (heroBg && y < heroH) heroBg.style.transform = 'translate3d(0,' + (y * 0.35).toFixed(1) + 'px,0)';
      if (ctaImg) {
        const top = ctaTop - y;
        if (top < vh && top + ctaH > 0) ctaImg.style.transform = 'translate3d(0,' + ((top - vh / 2) * -0.12).toFixed(1) + 'px,0) scale(1.15)';
      }
      // Faster scrolling blows the prayer flags harder; it settles back on its own.
      if (y < heroH) {
        amp = Math.min(2.6, Math.max(amp, 1 + Math.abs(y - lastY) / 25));
        garland?.style.setProperty('--amp', amp.toFixed(2));
        if (amp > 1.01 && !calm) calm = window.setTimeout(settle, 120);
      }
      lastY = y;
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
    const onResize = () => { measure(); onScroll(); };
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onResize);
    // Photos and fonts arriving change section positions.
    const ro = 'ResizeObserver' in window ? new ResizeObserver(() => measure()) : null;
    ro?.observe(document.body);
    frame();

    // Looping animations pause while their section is off screen.
    const pauseIo = 'IntersectionObserver' in window
      ? new IntersectionObserver((es) => es.forEach((e) => e.target.classList.toggle('off', !e.isIntersecting)))
      : null;
    document.querySelectorAll('.hm .hero, .hm .ticker, .hm .trail, .hm .divider, .hm .cta, .hm .monk, .hm #gaddi').forEach((el) => pauseIo?.observe(el));

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
      removeEventListener('resize', onResize);
      clearTimeout(calm);
      ro?.disconnect();
      pauseIo?.disconnect();
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
