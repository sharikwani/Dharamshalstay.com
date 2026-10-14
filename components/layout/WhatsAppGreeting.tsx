'use client';
import { useEffect, useState } from 'react';

const SEEN_KEY = 'ds-wa-greeting-seen';

/** A one-time "Namaste" bubble beside the WhatsApp button; once closed or shown, it stays away for the session. */
export default function WhatsAppGreeting({ title, text, closeLabel }: { title: string; text: string; closeLabel: string }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let seen = false;
    try { seen = sessionStorage.getItem(SEEN_KEY) === '1'; } catch {}
    if (seen) return;
    const t = setTimeout(() => {
      setShow(true);
      try { sessionStorage.setItem(SEEN_KEY, '1'); } catch {}
    }, 3500);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className={'wa-bubble' + (show ? '' : ' off')} role="status" aria-hidden={!show}>
      <button type="button" onClick={() => setShow(false)} aria-label={closeLabel} tabIndex={show ? 0 : -1}>×</button>
      <b>{title}</b>{text}
    </div>
  );
}
