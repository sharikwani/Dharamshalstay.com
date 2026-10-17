'use client';
import { useEffect, useState } from 'react';
import { timeLeft } from '@/lib/stories/rules';

/** "14h 22m" left in the spotlight, ticking each minute. */
export default function Countdown({ until }: { until: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => { setNow(Date.now()); const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t); }, []);
  if (now === null) return null;
  return <>{Date.parse(until) > now ? timeLeft(until, now) : 'ended'}</>;
}
