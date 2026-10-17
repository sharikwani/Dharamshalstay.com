'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { PenLine } from 'lucide-react';
import StoryCard from './StoryCard';
import type { PublicStory } from '@/lib/stories/store';

const KINDS = [{ key: 'all', label: 'All stories' }, { key: 'local', label: 'From locals' }, { key: 'traveller', label: 'From travellers' }] as const;

/** The story grid with simple filters: who wrote it, and where it happened. */
export default function StoriesBrowser({ stories }: { stories: PublicStory[] }) {
  const [kind, setKind] = useState<string>('all');
  const [place, setPlace] = useState<string>('all');
  const places = useMemo(() => Array.from(new Set(stories.map((s) => s.place))).sort(), [stories]);
  const shown = stories.filter((s) => (kind === 'all' || s.author_kind === kind) && (place === 'all' || s.place === place));
  const chip = (on: boolean) => 'whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ' + (on ? 'bg-brand-900 text-white shadow' : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50');

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" role="group" aria-label="Who wrote it">
          {KINDS.map((k) => <button key={k.key} type="button" onClick={() => setKind(k.key)} aria-pressed={kind === k.key} className={chip(kind === k.key)}>{k.label}</button>)}
        </div>
        {places.length > 1 && (
          <label className="flex items-center gap-2 text-sm text-slate-600">Where
            <select value={place} onChange={(e) => setPlace(e.target.value)} className="rounded-full border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-800">
              <option value="all">Everywhere</option>
              {places.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
        )}
      </div>
      {shown.length ? (
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((s, i) => <StoryCard key={s.id} s={s} priority={i < 3} />)}
        </div>
      ) : (
        <div className="mt-6 rounded-3xl border-2 border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="st-display text-2xl text-slate-900">{stories.length ? 'No stories here yet.' : 'The first stories are on their way.'}</p>
          <p className="mt-2 text-slate-600">Yours could be the one people read first.</p>
          <Link href="/stories/share" className="mt-5 inline-flex items-center gap-2 rounded-full bg-orange-500 px-6 py-3 font-semibold text-white hover:bg-orange-600"><PenLine className="h-4 w-4" />Share your story</Link>
        </div>
      )}
    </div>
  );
}
