'use client';
import { newClientId } from '@/lib/client-id';

/** An anonymous id for this browser, so a like or a read counts once. Not linked to any person. */
export function visitorId(): string {
  try {
    let v = localStorage.getItem('ds_visitor');
    if (!v || !/^[0-9a-f-]{36}$/i.test(v)) { v = newClientId(); localStorage.setItem('ds_visitor', v); }
    return v;
  } catch {
    return newClientId();
  }
}

export async function storyAction(id: string, body: Record<string, unknown>) {
  const res = await fetch(`/api/stories/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, visitor: visitorId() }) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Something went wrong. Please try again.');
  return json;
}

export const compact = (n: number) => (n >= 1e6 ? (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M' : n >= 1e4 ? Math.round(n / 1e3) + 'k' : n >= 1e3 ? (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'k' : String(n));
