'use client';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

export type DayMoment = { time: string; title: string; desc: string; img: string; alt: string; credit: { author: string; license: string; licenseUrl: string; source: string } };

/**
 * "A day in the monasteries": dawn to night as four moments. A sun moves along an arc to the moment in view; the
 * moments advance on their own until the visitor picks one. The singing bowl is synthesised in the browser (no
 * audio file) and only sounds after the visitor turns it on.
 */
export default function MonasteryDay({ moments, labels }: { moments: DayMoment[]; labels: { soundOn: string; soundOff: string; moment: string } }) {
  const [on, setOn] = useState(0);
  const [sound, setSound] = useState(false);
  const picked = useRef(false);
  const audio = useRef<AudioContext | null>(null);
  const root = useRef<HTMLDivElement>(null);

  // Advance through the day while the section is on screen, until the visitor chooses a moment.
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let visible = false;
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
    if (root.current) io.observe(root.current);
    const t = window.setInterval(() => { if (visible && !picked.current) setOn((i) => (i + 1) % moments.length); }, 5200);
    return () => { clearInterval(t); io.disconnect(); };
  }, [moments.length]);

  // A struck bowl: a few inharmonic partials that ring and fade.
  function strike(pitch = 1) {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = audio.current || (audio.current = new Ctx());
    const now = ctx.currentTime;
    const out = ctx.createGain();
    out.gain.value = 0.18;
    out.connect(ctx.destination);
    for (const [ratio, level, decay] of [[1, 1, 7], [2.71, 0.45, 4.5], [5.13, 0.18, 2.6], [8.4, 0.06, 1.4]]) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 196 * pitch * ratio;
      osc.detune.value = (Math.random() - 0.5) * 6;
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(level, now + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, now + decay);
      osc.connect(g).connect(out);
      osc.start(now);
      osc.stop(now + decay + 0.1);
    }
  }

  // Each moment rings a little lower as the day goes on.
  useEffect(() => { if (sound) strike(1 - on * 0.06); }, [on, sound]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { audio.current?.close().catch(() => {}); }, []);

  const pick = (i: number) => { picked.current = true; setOn(i); };
  // The sun rides an arc from the left (dawn) to the right (night).
  const t = moments.length > 1 ? on / (moments.length - 1) : 0;
  const sunX = 4 + t * 92;
  const sunY = 86 - Math.sin(Math.PI * Math.min(t, 0.999)) * 70;

  return (
    <div ref={root} className="mday" data-moment={on}>
      <div className="mday-sky" aria-hidden="true">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M4 86Q50 -54 96 86" /></svg>
        <span className="mday-sun" style={{ left: sunX + '%', top: sunY + '%' }} />
      </div>
      <ol className="mday-list">
        {moments.map((m, i) => (
          <li key={m.title} className={i === on ? 'on' : ''}>
            <button type="button" onClick={() => pick(i)} aria-pressed={i === on} aria-label={labels.moment.replace('{t}', m.title)}>
              <span className="ph"><Image src={m.img} alt={m.alt} fill sizes="(max-width:960px) 90vw, 25vw" /></span>
              <span className="alt">{m.time}</span>
              <b>{m.title}</b>
              <span className="d">{m.desc}</span>
            </button>
            <small className="cr"><a href={m.credit.source} target="_blank" rel="noopener noreferrer">{m.credit.author}</a>, <a href={m.credit.licenseUrl} target="_blank" rel="noopener noreferrer license">{m.credit.license}</a></small>
          </li>
        ))}
      </ol>
      <button type="button" className="mday-sound" aria-pressed={sound}
        onClick={() => { const next = !sound; setSound(next); if (next) strike(1 - on * 0.06); }}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 13h16M6 13c0 3.5 2.7 6 6 6s6-2.5 6-6M12 13V9" /><circle cx="12" cy="7" r="2" /></svg>
        {sound ? labels.soundOff : labels.soundOn}
      </button>
    </div>
  );
}
