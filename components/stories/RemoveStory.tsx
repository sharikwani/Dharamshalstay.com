'use client';
import { useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';

/** The storyteller takes their story down (two taps, no browser dialog). */
export default function RemoveStory({ token }: { token: string }) {
  const [sure, setSure] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  if (done) return <p className="text-sm text-slate-600">Your story has been taken down and its photos deleted.</p>;
  const go = async () => {
    setBusy(true); setError('');
    try {
      const res = await fetch(`/api/stories/me/${token}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'remove' }) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Could not remove it. Please try again.');
      setDone(true);
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };
  return (
    <div>
      {sure ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-slate-700">Remove your story and delete its photos? This cannot be undone.</span>
          <button type="button" onClick={go} disabled={busy} className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{busy && <Loader2 className="h-4 w-4 animate-spin" />}Yes, remove it</button>
          <button type="button" onClick={() => setSure(false)} className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">Keep it</button>
        </div>
      ) : (
        <button type="button" onClick={() => setSure(true)} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-red-600"><Trash2 className="h-4 w-4" />Take my story down</button>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
