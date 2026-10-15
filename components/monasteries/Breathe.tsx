'use client';
import { useEffect, useRef, useState } from 'react';

const IN = 4000;
const OUT = 6000;
const ROUNDS = 6; // six slow breaths: one minute

/** A guided minute of calm: the circle grows as you breathe in (4 s) and settles as you breathe out (6 s). */
export default function Breathe({ labels }: { labels: { start: string; stop: string; inhale: string; exhale: string; done: string; idle: string } }) {
  const [phase, setPhase] = useState<'idle' | 'in' | 'out' | 'done'>('idle');
  const [round, setRound] = useState(0);
  const timer = useRef<number | null>(null);

  const stop = () => { if (timer.current) clearTimeout(timer.current); timer.current = null; };
  useEffect(() => stop, []);

  function run(r: number) {
    if (r >= ROUNDS) { setPhase('done'); return; }
    setRound(r + 1);
    setPhase('in');
    timer.current = window.setTimeout(() => {
      setPhase('out');
      timer.current = window.setTimeout(() => run(r + 1), OUT);
    }, IN);
  }

  const active = phase === 'in' || phase === 'out';
  const text = phase === 'in' ? labels.inhale : phase === 'out' ? labels.exhale : phase === 'done' ? labels.done : labels.idle;

  return (
    <div className={'mm-breathe ' + phase}>
      <div className="orb" aria-hidden="true"><span className="ring r1" /><span className="ring r2" /><span className="core" /></div>
      <p className="say" aria-live="polite">{text}{active && <small>{round} / {ROUNDS}</small>}</p>
      <button type="button" className="mm-btn" onClick={() => { if (active) { stop(); setPhase('idle'); } else run(0); }}>
        {active ? labels.stop : labels.start}
      </button>
    </div>
  );
}
