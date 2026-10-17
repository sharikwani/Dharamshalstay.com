'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Send, CheckCircle, X, Instagram, Facebook, CalendarClock, ExternalLink, RefreshCw } from 'lucide-react';
import { authFetch, supabase } from '@/lib/supabase';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import { cn } from '@/lib/utils';

const STATUS: Record<string, string> = {
  draft: 'bg-amber-100 text-amber-800', scheduled: 'bg-sky-100 text-sky-800', publishing: 'bg-violet-100 text-violet-800',
  published: 'bg-green-100 text-green-800', failed: 'bg-red-100 text-red-800',
};
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const when = (d?: string | null) => (d ? new Date(d).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }) : '');

async function api(path: string, init?: RequestInit) {
  const r = await authFetch(path, init);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.error || 'Request failed');
  return j;
}
const post = (body: object) => api('/api/admin/social', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

export default function AdminSocial() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [rows, setRows] = useState<any[] | null>(null);
  const [settings, setSettings] = useState<any>(null);
  const [configured, setConfigured] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [ideas, setIdeas] = useState<any[]>([]);
  const [series, setSeries] = useState<any[]>([]);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const [open, setOpen] = useState<any>(null);
  const [topic, setTopic] = useState('');

  const load = useCallback(async () => {
    try {
      const [p, s, i] = await Promise.all([api('/api/admin/social?view=posts'), api('/api/admin/social?view=settings'), api('/api/admin/social?view=ideas')]);
      setRows(p.rows); setSettings(s.settings); setConfigured(s.configured); setIdeas(i.ideas); setSeries(i.series || []);
      api('/api/admin/social?view=stats').then(setStats).catch(() => {});
    } catch (e: any) { setMsg(e.message.includes('relation') ? 'Run supabase/migration-v32-social.sql in Supabase first.' : e.message); setRows([]); }
  }, []);
  useEffect(() => { supabase.auth.getUser().then(({ data: { user } }) => (user ? (setReady(true), load()) : router.push('/admin/login'))); }, [router, load]);

  const act = async (label: string, body: object, ok?: string) => {
    setBusy(label); setMsg('');
    try { const j = await post(body); if (ok) setMsg(ok); await load(); return j; } catch (e: any) { setMsg(e.message); } finally { setBusy(''); }
  };
  const saveSettings = async (patch: object) => { try { setSettings((await post({ action: 'settings', ...patch })).settings); } catch (e: any) { setMsg(e.message); } };

  if (!ready) return null;
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <AdminPageHeader title="Social media" description="Instagram and Facebook posts written by the AI from our guides and real photos. Approve them, or switch on autopilot." />
      {!configured && <p className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-amber-900 text-sm">Instagram/Facebook are not connected on this server (META_SOCIAL_TOKEN, META_PAGE_ID, META_IG_USER_ID).</p>}
      {msg && <p className="mb-4 rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-800">{msg}</p>}

      <div className="grid gap-5 lg:grid-cols-3 mb-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="font-heading font-semibold mb-3">Accounts</h2>
          <p className="flex items-center gap-2 text-sm"><Instagram className="h-4 w-4 text-pink-600" /> @{stats?.instagram?.username || 'thedharamshalastay'} · <b>{stats?.instagram?.followers_count ?? '–'}</b> followers · {stats?.instagram?.media_count ?? '–'} posts</p>
          <p className="flex items-center gap-2 text-sm mt-2"><Facebook className="h-4 w-4 text-blue-600" /> {stats?.facebook?.name || 'Dharamshala Stay'} · <b>{stats?.facebook?.followers_count ?? stats?.facebook?.fan_count ?? '–'}</b> followers</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 lg:col-span-2">
          <h2 className="font-heading font-semibold mb-3">Autopilot</h2>
          {settings && <>
            <div className="flex flex-wrap gap-2 mb-3">
              {([['approve', 'AI writes, I approve'], ['auto', 'Autopilot: AI writes and posts'], ['off', 'Off']] as const).map(([m, label]) => (
                <button key={m} onClick={() => saveSettings({ mode: m })} className={cn('px-3.5 py-2 rounded-lg text-sm font-semibold border', settings.mode === m ? 'bg-brand-600 text-white border-brand-600' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50')}>{label}</button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
              <label className="flex items-center gap-2"><select value={settings.posts_per_week} onChange={(e) => saveSettings({ posts_per_week: Number(e.target.value) })} className="border border-slate-300 rounded-md px-2 py-1">{[2, 3, 4, 5, 7, 10, 14].map((n) => <option key={n} value={n}>{n}</option>)}</select> posts a week</label>
              <label className="flex items-center gap-2">at <input type="time" value={settings.post_time} onChange={(e) => saveSettings({ post_time: e.target.value })} className="border border-slate-300 rounded-md px-2 py-1" /> IST on</label>
              <div className="flex gap-1">{DAYS.map((d, i) => {
                const on = settings.post_days.includes(i);
                return <button key={d} onClick={() => saveSettings({ post_days: on ? settings.post_days.filter((x: number) => x !== i) : [...settings.post_days, i] })} className={cn('px-2 py-1 rounded text-xs font-semibold border', on ? 'bg-brand-50 border-brand-300 text-brand-800' : 'border-slate-200 text-slate-500')}>{d}</button>;
              })}</div>
            </div>
          </>}
        </div>
      </div>

      <div className="rounded-xl p-5 mb-6 bg-[#0c1726] text-[#f5efe4]">
        <h2 className="font-heading font-semibold">Curiosity series</h2>
        <p className="text-sm text-slate-300 mt-1 mb-4">Posts built to be shared by people who live here: a hidden detail, a surprising fact, a guessing game. Facts come only from our own guides. Most autopilot posts now come from these.</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {series.map((s) => (
            <button key={s.id} disabled={!!busy || !s.left} onClick={() => act('s' + s.id, { action: 'generate', series: s.id }, 'Draft ready below.')}
              className="text-left rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 p-4 disabled:opacity-50 transition-colors">
              <span className="block font-semibold text-[#e3b76a]">{busy === 's' + s.id ? 'Writing… (~20 s)' : s.name}</span>
              <span className="block text-xs text-slate-300 mt-1">{s.mood}</span>
              <span className="block text-xs text-slate-400 mt-2">{s.left} places left</span>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6">
        <h2 className="font-heading font-semibold mb-3">Create a post now</h2>
        <div className="flex flex-col sm:flex-row gap-2 mb-3">
          <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Describe it, e.g. 'Best cafés in McLeod Ganj for a rainy day'" className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          <button disabled={!!busy || topic.trim().length < 8} onClick={async () => { const j = await act('gen', { action: 'generate', topic }); if (j?.post) { setTopic(''); } }} className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50">{busy === 'gen' ? 'Writing… (~20 s)' : 'Write it'}</button>
        </div>
        <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto">
          {ideas.slice(0, 30).map((i) => <button key={i.theme} disabled={!!busy} onClick={() => act('gen', { action: 'generate', theme: i.theme }, 'Draft ready below.')} className="px-3 py-1.5 rounded-full text-xs border border-brand-200 bg-brand-50 text-brand-800 hover:bg-brand-100 disabled:opacity-50"><Sparkles className="inline h-3 w-3 mr-1" />{i.topic.slice(0, 60)}</button>)}
        </div>
      </div>

      {!rows ? <p className="text-slate-500">Loading…</p> : !rows.length ? <p className="text-slate-500">No posts yet. The autopilot writes the first one within 10 minutes, or create one above.</p> : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((p) => (
            <div key={p.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
              <button onClick={() => setOpen(p)} className="block relative aspect-[4/5] bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.slide_urls[0]} alt={p.alt_text || p.topic} loading="lazy" className="w-full h-full object-cover" />
                {p.slides.length > 1 && <span className="absolute top-2 right-2 text-xs font-semibold bg-black/60 text-white rounded-full px-2 py-0.5">1/{p.slides.length}</span>}
              </button>
              <div className="p-4 flex-1 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2"><span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', STATUS[p.status])}>{p.status}</span><span className="text-xs text-slate-500 flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5" />{when(p.published_at || p.scheduled_at) || 'no slot'}</span></div>
                <p className="text-sm font-semibold text-slate-800 line-clamp-2">{p.topic}</p>
                <p className="text-xs text-slate-500 line-clamp-3 whitespace-pre-line">{p.caption}</p>
                {p.error && <p className="text-xs text-red-700">{p.error}</p>}
                <div className="mt-auto flex flex-wrap gap-2 pt-2">
                  <button onClick={() => setOpen(p)} className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300">Open</button>
                  {['draft', 'failed'].includes(p.status) && <button disabled={!!busy} onClick={() => act('ap' + p.id, { action: 'approve', id: p.id }, 'Approved and scheduled.')} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-600 text-white"><CheckCircle className="inline h-3.5 w-3.5 mr-1" />Approve</button>}
                  {p.status !== 'published' && <button disabled={!!busy} onClick={() => act('pub' + p.id, { action: 'publish', id: p.id }, 'Published.')} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-brand-600 text-white"><Send className="inline h-3.5 w-3.5 mr-1" />{busy === 'pub' + p.id ? 'Posting…' : 'Post now'}</button>}
                  {p.ig_permalink && <a href={p.ig_permalink} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300"><ExternalLink className="inline h-3.5 w-3.5 mr-1" />View</a>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {open && <Editor p={open} onClose={() => { setOpen(null); load(); }} />}
    </div>
  );
}

function Editor({ p, onClose }: { p: any; onClose: () => void }) {
  const [caption, setCaption] = useState(p.caption);
  const [tags, setTags] = useState((p.hashtags || []).map((h: string) => '#' + h).join(' '));
  const [i, setI] = useState(0);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const editable = ['draft', 'scheduled', 'failed'].includes(p.status);
  const run = async (label: string, body: object, ok: string) => {
    setBusy(label); setMsg('');
    try { await post(body); setMsg(ok); } catch (e: any) { setMsg(e.message); } finally { setBusy(''); }
  };
  const save = () => run('save', { action: 'update', id: p.id, caption, hashtags: tags.split(/[\s,]+/).filter(Boolean).map((h: string) => h.replace(/^#/, '')) }, 'Saved.');
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3" role="dialog" aria-modal="true">
      <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[92vh] overflow-y-auto p-5 grid gap-5 md:grid-cols-[minmax(0,420px)_1fr]">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.slide_urls[i]} alt="" className="w-full rounded-xl border border-slate-200 aspect-[4/5] object-cover" />
          {p.slides.length > 1 && <div className="flex justify-center gap-1.5 mt-3">{p.slides.map((_: any, k: number) => <button key={k} onClick={() => setI(k)} className={cn('h-2.5 w-2.5 rounded-full', k === i ? 'bg-brand-600' : 'bg-slate-300')} aria-label={'Slide ' + (k + 1)} />)}</div>}
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between"><h2 className="font-heading font-bold text-lg">{p.topic}</h2><button onClick={onClose} aria-label="Close" className="p-2 rounded-lg hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
          <label className="text-sm font-semibold text-slate-700">Caption<textarea disabled={!editable} rows={11} value={caption} onChange={(e) => setCaption(e.target.value)} className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-normal" /></label>
          <label className="text-sm font-semibold text-slate-700">Hashtags<textarea disabled={!editable} rows={3} value={tags} onChange={(e) => setTags(e.target.value)} className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-normal" /></label>
          {p.credits && <p className="text-xs text-slate-500">{p.credits}</p>}
          {editable && <div className="flex flex-wrap gap-2">
            <button onClick={save} disabled={!!busy} className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-semibold">{busy === 'save' ? 'Saving…' : 'Save'}</button>
            <button onClick={() => run('ap', { action: 'approve', id: p.id }, 'Approved and scheduled.')} disabled={!!busy} className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold">Approve</button>
            <button onClick={() => run('pub', { action: 'publish', id: p.id }, 'Published to Instagram and Facebook.')} disabled={!!busy} className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-semibold"><Send className="inline h-4 w-4 mr-1" />{busy === 'pub' ? 'Posting… (up to a minute)' : 'Post now'}</button>
            <button onClick={() => run('x', { action: 'cancel', id: p.id }, 'Removed.')} disabled={!!busy} className="px-4 py-2 rounded-lg text-red-700 text-sm font-semibold hover:bg-red-50">Delete</button>
          </div>}
          {msg && <p className="text-sm text-slate-700">{msg}</p>}
          <p className="text-xs text-slate-400 flex items-center gap-1"><RefreshCw className="h-3 w-3" /> Changes to the slide text: ask in chat for now; captions and hashtags can be edited here.</p>
        </div>
      </div>
    </div>
  );
}
