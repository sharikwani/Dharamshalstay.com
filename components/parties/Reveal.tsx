'use client';
import { useEffect } from 'react';

/**
 * Scroll reveals for the party page: elements with .nye-rv fade and rise in as they enter the screen.
 * Content stays visible without JavaScript; the hidden start state only applies once this has mounted.
 */
export default function Reveal() {
  useEffect(() => {
    const root = document.querySelector('.nye');
    if (!root || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const els = Array.from(root.querySelectorAll<HTMLElement>('.nye-rv'));
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    // Anything already on screen shows at once, so nothing above the fold flickers.
    for (const el of els) {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) el.classList.add('is-in');
      else io.observe(el);
    }
    root.classList.add('nye-motion');
    return () => io.disconnect();
  }, []);
  return null;
}
