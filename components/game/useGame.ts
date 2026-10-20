'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { PublicState } from '@/lib/game/store';

/** Newer = more numbers called, more winners, or the game ended. Broadcasts can arrive out of order. */
function newer(a: PublicState | null, b: PublicState): boolean {
  if (!a) return true;
  if (a.status === 'ended' && b.status !== 'ended') return false;
  return b.called.length > a.called.length || b.winners.length > a.winners.length || b.players !== a.players || b.status !== a.status;
}

/** Live game state: one read, then Supabase Realtime pushes, with a slow re-read in case a push is missed. */
export function useGame(code: string) {
  const [state, setState] = useState<PublicState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<PublicState | null>(null);

  const accept = useCallback((s: PublicState) => {
    if (newer(ref.current, s)) { ref.current = s; setState(s); }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/game/' + code, { cache: 'no-store' });
      const j = await res.json();
      if (!res.ok) { setError(j.error || 'Could not load the game.'); return; }
      setError(null);
      accept(j);
    } catch { /* offline for a moment: the next read or push fixes it */ }
  }, [code, accept]);

  useEffect(() => {
    refresh();
    const ch = supabase.channel('game:' + code).on('broadcast', { event: 'state' }, ({ payload }) => accept(payload as PublicState)).subscribe();
    const t = setInterval(refresh, 10_000);
    const wake = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', wake);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', wake); supabase.removeChannel(ch); };
  }, [code, refresh, accept]);

  return { state, error, refresh, setState: accept };
}

export async function post<T = any>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error || 'Something went wrong. Please try again.');
  return j as T;
}

export const store = {
  get<T>(key: string): T | null { try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : null; } catch { return null; } },
  set(key: string, v: unknown) { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* private mode */ } },
};
