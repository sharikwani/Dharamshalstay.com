'use client';
import { useEffect, useState } from 'react';

/** Live countdown to midnight (India time) at the end of the party date. Renders nothing until mounted. */
export default function Countdown({ to, done = 'Happy New Year!' }: { to: string; done?: string }) {
  const target = Date.parse(to);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (now === null) return <div className="nye-count" aria-hidden="true" />;
  const left = Math.max(0, target - now);
  if (!left) return <p className="nye-count-done">{done}</p>;
  const parts: [number, string][] = [
    [Math.floor(left / 864e5), 'days'],
    [Math.floor(left / 36e5) % 24, 'hours'],
    [Math.floor(left / 6e4) % 60, 'minutes'],
    [Math.floor(left / 1e3) % 60, 'seconds'],
  ];
  return (
    <div className="nye-count" role="timer" aria-label={`${parts[0][0]} days and ${parts[1][0]} hours to midnight`}>
      {parts.map(([n, label]) => (
        <div key={label} className="nye-count-cell">
          <span className="nye-count-n">{String(n).padStart(2, '0')}</span>
          <span className="nye-count-l">{label}</span>
        </div>
      ))}
    </div>
  );
}
