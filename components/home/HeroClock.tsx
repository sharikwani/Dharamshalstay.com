'use client';
import { useEffect, useState } from 'react';
import { istHour, skyPhase } from '@/lib/home-helpers';

/** "6:42 PM in McLeod Ganj · Golden hour on the peaks". Renders after load, so server and client never disagree on the time. */
export default function HeroClock({ template, phases }: { template: string; phases: Record<string, string> }) {
  const [now, setNow] = useState<{ time: string; phase: string } | null>(null);

  useEffect(() => {
    const tick = () => {
      const h = istHour(new Date());
      const hh = Math.floor(h), mm = Math.floor((h - hh) * 60);
      const time = ((hh + 11) % 12 + 1) + ':' + String(mm).padStart(2, '0') + (hh < 12 ? ' AM' : ' PM');
      setNow({ time, phase: phases[skyPhase(h)] });
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [phases]);

  if (!now) return null;
  const [before, after] = template.split('{time}');
  return (
    <span className="livechip">
      <span className="dot" aria-hidden="true" />
      <span>{before}<b>{now.time}</b>{after} · {now.phase}</span>
    </span>
  );
}
