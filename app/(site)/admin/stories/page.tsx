'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Ban, Check, ExternalLink, EyeOff, Instagram, Loader2, Pencil, Sparkles, Star, Trash2, X } from 'lucide-react';
import { authFetch } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { AdminPageHeader, refreshAdminCounts } from '@/components/admin/AdminShell';
import { FLAG_COLORS, featureState, timeLeft } from '@/lib/stories/rules';

type Tab = 'pending' | 'approved' | 'featured' | 'held' | 'rejected' | 'hidden';
const TABS: { key: Tab; label: string }[] = [
  { key: 'pending', label: 'Waiting' }, { key: 'approved', label: 'Live' }, { key: 'featured', label: 'Featured' },
  { key: 'held', label: 'Comments & flags to check' }, { key: 'rejected', label: 'Rejected' }, { key: 'hidden', label: 'Hidden' },
];
const FLAG_LABEL: Record<string, string> = {
  advertising: 'Looks like advertising', contact_details: 'Has contact details', children_faces: 'Children\'s faces', unsafe_advice: 'Unsafe advice',
  hate_or_abuse: 'Abusive', explicit: 'Explicit', not_own_photo: 'Photo may not be theirs', off_topic: 'Off topic', copied_or_ai: 'May be copied or AI-written',
  personal_data_of_others: 'Other people\'s personal details',
};
const when = (s: string) => new Date(s).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

async function api(path: string, init?: RequestInit) {
  const res = await authFetch(path, { ...init, headers: { 'Content-Type': 'application/json' } });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Something went wrong');
  return json;
}

export default function AdminStoriesPage() {
  const [tab, setTab] = useState<Tab>('pending');
  const [rows, setRows] = useState<any[]>([]);
  const [held, setHeld] = useState<{ comments: any[]; flags: any[] }>({ comments: [], flags: [] });
  const [missing, setMissing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [pick, setPick] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string; title: string } | null>(null);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get('pick');
    if (p) { setPick(p); setTab('approved'); }
  }, []);

  const seq = useRef(0);
  const load = useCallback(async () => {
    const mine = ++seq.current;
    setLoading(true); setError('');
    try {
      const d = await api('/api/admin/stories?tab=' + tab);
      if (mine !== seq.current) return;
      setMissing(!!d.missing);
      if (tab === 'held') setHeld(d.held || { comments: [], flags: [] }); else setRows(d.stories || []);
    } catch (e: any) { if (mine === seq.current) setError(e.message); }
    if (mine === seq.current) setLoading(false);
  }, [tab]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (pick && !loading) document.getElementById('story-' + pick)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, [pick, loading]);

  async function act(action: string, id: string, extra: Record<string, unknown> = {}) {
    setBusy(id + action); setError(''); setNote('');
    try {
      const r = await api('/api/admin/stories', { method: 'POST', body: JSON.stringify({ action, id, ...extra }) });
      if (action === 'feature') {
        setNote(r.instagram === 'posted' ? 'Featured: it is on the homepage and posted to the Instagram story.'
          : r.instagram === 'off' ? 'Featured on the homepage. Instagram is not connected, so nothing was posted there.'
          : 'Featured on the homepage. The Instagram story did not post (' + (r.error || 'unknown error') + '); it will retry automatically.');
      }
      setEditing(null);
      await load();
      refreshAdminCounts();
    } catch (e: any) { setError(e.message); }
    setBusy(null);
  }

  const b = 'inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-50';
  const isBusy = (id: string, a: string) => busy === id + a;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <AdminPageHeader title="Stories" description="Stories from travellers and locals. Nothing is public until you approve it. Each morning the AI emails you its pick; Feature puts a story on the homepage and our Instagram story for 24 hours. Comments and prayer flags go live by themselves unless they contain links or contact details, or fail the safety check." />

      {missing && <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">Run <b>supabase/migration-v34-stories.sql</b> in the Supabase SQL editor to switch stories on.</p>}

      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4">
        {TABS.map((x) => (
          <button key={x.key} onClick={() => setTab(x.key)} className={cn('whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium', tab === x.key ? 'bg-slate-900 text-white' : 'border border-slate-300 bg-white text-slate-700')}>{x.label}</button>
        ))}
      </div>
      {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {note && <p className="mb-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">{note}</p>}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-brand-600" /></div>
      ) : tab === 'held' ? (
        <HeldList held={held} busy={busy} act={act} />
      ) : rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">Nothing here.</p>
      ) : (
        <ul className="space-y-4">
          {rows.map((s) => {
            const feat = featureState(s);
            return (
              <li key={s.id} id={'story-' + s.id} className={cn('rounded-2xl border bg-white p-4 sm:p-5', pick === s.id ? 'border-amber-400 ring-2 ring-amber-200' : 'border-slate-200')}>
                {pick === s.id && <p className="mb-3 inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800"><Sparkles className="h-3.5 w-3.5" />Today&rsquo;s AI pick</p>}
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {(s.photo_urls || []).map((u: string | null, i: number) => u ? (
                    <a key={i} href={u} target="_blank" rel="noopener" className="flex-none">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={u} alt="" className="h-28 w-28 rounded-xl object-cover" />
                    </a>
                  ) : <div key={i} className="h-28 w-28 flex-none rounded-xl bg-slate-100" />)}
                </div>

                {editing && editing.id === s.id ? (
                  <div className="mt-2 flex gap-2">
                    <input value={editing.title} onChange={(e) => setEditing({ id: s.id, title: e.target.value })} maxLength={90} className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5" />
                    <button onClick={() => act('edit', s.id, { title: editing.title })} className={b + ' bg-slate-900 text-white'}>Save</button>
                    <button onClick={() => setEditing(null)} className={b + ' bg-slate-100'}><X className="h-4 w-4" /></button>
                  </div>
                ) : (
                  <h2 className="mt-2 flex items-start gap-2 text-lg font-semibold text-slate-900">{s.title}
                    <button onClick={() => setEditing({ id: s.id, title: s.title })} className="mt-1 text-slate-400 hover:text-slate-700" aria-label="Edit title"><Pencil className="h-4 w-4" /></button>
                  </h2>
                )}
                <p className="text-sm text-slate-500">
                  {s.author_name} · {s.author_kind}{s.author_from ? ' from ' + s.author_from : ''} · {s.place}{s.visited ? ' · ' + s.visited : ''} · sent {when(s.created_at)}
                </p>
                <p className="text-sm text-slate-500">
                  {s.instagram && <a href={`https://www.instagram.com/${s.instagram}/`} target="_blank" rel="noopener" className="mr-3 inline-flex items-center gap-1 text-pink-600"><Instagram className="h-3.5 w-3.5" />@{s.instagram}</a>}
                  {s.email && <span className="mr-3">{s.email}</span>}
                </p>

                <details className="mt-3 rounded-xl bg-slate-50 p-3">
                  <summary className="cursor-pointer text-sm font-medium text-slate-700">Read the story ({s.body.length.toLocaleString()} characters)</summary>
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-700">{s.body}</p>
                </details>

                {(s.ai_score != null || s.ai_notes) && (
                  <div className="mt-3 rounded-xl border border-violet-200 bg-violet-50 p-3 text-sm">
                    <p className="font-semibold text-violet-900">{s.ai_score != null ? <>AI score {s.ai_score}/100</> : 'AI check'}</p>
                    {s.ai_notes && <p className="mt-0.5 text-violet-900/80">{s.ai_notes}</p>}
                    {s.ai_flags?.length > 0 && <p className="mt-1 flex flex-wrap gap-1">{s.ai_flags.map((f: string) => <span key={f} className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">{FLAG_LABEL[f] || f}</span>)}</p>}
                    {s.ai_caption && <p className="mt-1 text-violet-900/70">Caption idea: &ldquo;{s.ai_caption}&rdquo;</p>}
                  </div>
                )}

                {s.status === 'approved' && (
                  <p className="mt-3 text-sm text-slate-600">{s.views} reads · {s.likes} likes · {s.comments} comments · {s.flags} prayer flags</p>
                )}
                {feat && (
                  <p className={cn('mt-2 text-sm', feat === 'live' ? 'font-semibold text-amber-700' : 'text-slate-500')}>
                    {feat === 'live' ? `Story of the day now, ${timeLeft(s.featured_until)} left` : `Featured ${when(s.featured_at)}`}
                    {' · Instagram: '}{s.ig_story_id ? 'posted' : s.ig_error ? 'failed (' + s.ig_error + ')' : feat === 'live' ? 'not posted yet' : 'not posted'}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  {s.status === 'pending' && <>
                    <button onClick={() => act('approve', s.id)} disabled={!!busy} className={b + ' bg-green-600 text-white'}>{isBusy(s.id, 'approve') ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}Approve</button>
                    <button onClick={() => act('reject', s.id)} disabled={!!busy} className={b + ' bg-slate-100 text-slate-700'}><Ban className="h-4 w-4" />Reject</button>
                  </>}
                  {s.status === 'approved' && <>
                    {feat !== 'live' && (
                      <button onClick={() => act('feature', s.id)} disabled={!!busy} className={b + ' bg-amber-500 text-white'}>{isBusy(s.id, 'feature') ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className="h-4 w-4" />}Feature for 24 hours</button>
                    )}
                    {feat === 'live' && <button onClick={() => act('unfeature', s.id)} disabled={!!busy} className={b + ' bg-slate-100 text-slate-700'}>End the feature now</button>}
                    <a href={`/stories/${s.slug}`} target="_blank" rel="noopener" className={b + ' bg-slate-100 text-slate-700'}><ExternalLink className="h-4 w-4" />Open</a>
                    <button onClick={() => act('hide', s.id)} disabled={!!busy} className={b + ' bg-slate-100 text-slate-700'}><EyeOff className="h-4 w-4" />Hide</button>
                  </>}
                  {(s.status === 'rejected' || s.status === 'hidden') && (
                    <button onClick={() => act('approve', s.id)} disabled={!!busy} className={b + ' bg-green-600 text-white'}><Check className="h-4 w-4" />Approve after all</button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function HeldList({ held, busy, act }: { held: { comments: any[]; flags: any[] }; busy: string | null; act: (a: string, id: string) => void }) {
  const items = [
    ...held.comments.map((c) => ({ kind: 'comment', id: c.id, name: c.name, text: c.body, story: c.stories, at: c.created_at, color: null })),
    ...held.flags.map((f) => ({ kind: 'flag', id: f.id, name: f.name, text: f.message, story: f.stories, at: f.created_at, color: f.color })),
  ].sort((a, b) => b.at.localeCompare(a.at));
  if (!items.length) return <p className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">Nothing to check.</p>;
  return (
    <ul className="space-y-3">
      {items.map((x) => (
        <li key={x.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-slate-500">{x.kind === 'flag' ? 'Prayer flag' : 'Comment'} on <a href={`/stories/${x.story?.slug}`} target="_blank" rel="noopener" className="text-brand-600 underline">{x.story?.title}</a> · {when(x.at)}</p>
            <p className="mt-1 flex items-start gap-2 text-slate-800">
              {x.color && <span className="mt-1 h-5 w-4 flex-none rounded-sm" style={{ background: FLAG_COLORS.find((f) => f.key === x.color)?.hex }} />}
              <span><b>{x.name}:</b> {x.text}</span>
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => act(x.kind + '_show', x.id)} disabled={!!busy} className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"><Check className="h-4 w-4" />Show</button>
            <button onClick={() => act(x.kind + '_remove', x.id)} disabled={!!busy} className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 disabled:opacity-50"><Trash2 className="h-4 w-4" />Remove</button>
          </div>
        </li>
      ))}
    </ul>
  );
}
