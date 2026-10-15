'use client';
import { useEffect, useRef, useState } from 'react';

/**
 * The monasteries page's quiet motion: sections fade up as they arrive, the "day" sky follows the scroll from dawn
 * to night, and an optional ambient sound (a soft drone with an occasional singing bowl, synthesised in the
 * browser) that stays off until the visitor turns it on. Everything respects reduced motion.
 */
export default function MonasteryEffects({ labels }: { labels: { on: string; off: string } }) {
  const [sound, setSound] = useState(false);
  const ctx = useRef<AudioContext | null>(null);
  const stopRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const root = document.querySelector<HTMLElement>('.mm');
    if (!root) return;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Fade-up reveal, staggered within a group.
    const els = Array.from(root.querySelectorAll<HTMLElement>('.rv'));
    let io: IntersectionObserver | null = null;
    if (reduce || !('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('in'));
    } else {
      io = new IntersectionObserver((es) => es.forEach((e) => {
        if (!e.isIntersecting) return;
        const el = e.target as HTMLElement;
        const sibs = Array.from(el.parentElement?.children || []).filter((c) => c.classList.contains('rv'));
        el.style.transitionDelay = Math.min(sibs.indexOf(el), 5) * 90 + 'ms';
        el.classList.add('in');
        io?.unobserve(el);
      }), { rootMargin: '0px 0px -8% 0px' });
      els.forEach((el) => io!.observe(el));
    }

    // The day's sky: 0 at dawn when the section enters, 1 at night when it leaves.
    const day = root.querySelector<HTMLElement>('.mm-day');
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (!day) return;
        const r = day.getBoundingClientRect();
        const p = Math.min(1, Math.max(0, (innerHeight * 0.6 - r.top) / (r.height)));
        day.style.setProperty('--p', p.toFixed(3));
        const steps = day.querySelectorAll<HTMLElement>('.mm-step');
        steps.forEach((s, i) => s.classList.toggle('lit', p >= i / steps.length - 0.02));
      });
    };
    if (!reduce) { onScroll(); addEventListener('scroll', onScroll, { passive: true }); }
    else day?.style.setProperty('--p', '0.5');

    return () => { removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); io?.disconnect(); };
  }, []);

  useEffect(() => () => { stopRef.current?.(); ctx.current?.close().catch(() => {}); }, []);

  function start() {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ac = ctx.current || (ctx.current = new Ctx());
    ac.resume();
    const master = ac.createGain();
    master.gain.setValueAtTime(0, ac.currentTime);
    master.gain.linearRampToValueAtTime(0.09, ac.currentTime + 3);
    master.connect(ac.destination);

    // A low drone: two slightly detuned notes a fifth apart, breathing slowly.
    const voices: OscillatorNode[] = [];
    for (const [f, lvl] of [[110, 0.5], [110.6, 0.4], [165, 0.25], [220, 0.12]]) {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = 'sine'; o.frequency.value = f; g.gain.value = lvl;
      const lfo = ac.createOscillator(); const lg = ac.createGain();
      lfo.frequency.value = 0.07 + Math.random() * 0.05; lg.gain.value = lvl * 0.5;
      lfo.connect(lg).connect(g.gain);
      o.connect(g).connect(master); o.start(); lfo.start();
      voices.push(o, lfo);
    }
    // A singing bowl now and then.
    const bowl = () => {
      const t = ac.currentTime;
      for (const [r, lvl, d] of [[1, 0.9, 8], [2.71, 0.4, 5], [5.13, 0.15, 3]]) {
        const o = ac.createOscillator(); const g = ac.createGain();
        o.frequency.value = 196 * r; g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(lvl, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
        o.connect(g).connect(master); o.start(t); o.stop(t + d + 0.1);
      }
    };
    bowl();
    const timer = window.setInterval(bowl, 14000);
    stopRef.current = () => {
      clearInterval(timer);
      const t = ac.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(master.gain.value, t);
      master.gain.linearRampToValueAtTime(0, t + 1.5);
      voices.forEach((v) => v.stop(t + 1.6));
      stopRef.current = null;
    };
  }

  return (
    <button type="button" className="mm-sound" aria-pressed={sound}
      onClick={() => { if (sound) stopRef.current?.(); else start(); setSound(!sound); }}>
      <span className="bars" aria-hidden="true"><i /><i /><i /></span>
      {sound ? labels.off : labels.on}
    </button>
  );
}
