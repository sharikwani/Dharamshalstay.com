'use client';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Sparkles, Send, Users, Clock, Settings, PenLine, RefreshCw, Eye, X, CheckCircle, AlertTriangle } from 'lucide-react';
import { authFetch, supabase } from '@/lib/supabase';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import { cn } from '@/lib/utils';

type Tab = 'overview' | 'campaigns' | 'messages' | 'contacts' | 'jobs' | 'compose';
const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: 'overview', label: 'Overview', icon: Settings },
  { id: 'campaigns', label: 'AI campaigns', icon: Sparkles },
  { id: 'messages', label: 'Sent emails', icon: Mail },
  { id: 'contacts', label: 'Contacts', icon: Users },
  { id: 'jobs', label: 'Scheduled', icon: Clock },
  { id: 'compose', label: 'Write an email', icon: PenLine },
];

const AUTOMATIONS: { key: string; label: string; hint: string }[] = [
  { key: 'enquiry_follow_up', label: 'Enquiry follow-up', hint: '2 days after an enquiry, if they have not booked' },
  { key: 'pre_arrival', label: 'Arrival guide', hint: '3 days before check-in: weather, packing, getting here, photos' },
  { key: 'review_request', label: 'Review request', hint: 'The day after check-out' },
  { key: 'review_reminder', label: 'Review reminder', hint: '5 days after check-out, only if no review yet' },
  { key: 'payment_reminder', label: 'Unpaid booking reminder', hint: '45 minutes after an online booking is left unpaid' },
];

const STATUS: Record<string, string> = {
  sent: 'bg-slate-100 text-slate-700', delivered: 'bg-sky-100 text-sky-800', opened: 'bg-green-100 text-green-800', clicked: 'bg-emerald-200 text-emerald-900',
  bounced: 'bg-red-100 text-red-800', complained: 'bg-red-200 text-red-900', failed: 'bg-red-100 text-red-800', skipped: 'bg-amber-100 text-amber-800', queued: 'bg-slate-100 text-slate-600',
  pending: 'bg-amber-100 text-amber-800', draft: 'bg-slate-100 text-slate-700', scheduled: 'bg-sky-100 text-sky-800', sending: 'bg-violet-100 text-violet-800', cancelled: 'bg-slate-200 text-slate-500',
};
const Pill = ({ s }: { s: string }) => <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', STATUS[s] || 'bg-slate-100 text-slate-700')}>{s}</span>;
const when = (d?: string | null) => (d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }) : '');

async function api(path: string, init?: RequestInit) {
  const r = await authFetch(path, init);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.error || 'Request failed');
  return j;
}
const post = (body: object) => api('/api/admin/email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

export default function AdminEmailPage() {
  return <Suspense fallback={null}><AdminEmail /></Suspense>;
}

function AdminEmail() {
  const router = useRouter();
  const params = useSearchParams();
  const [tab, setTab] = useState<Tab>((params.get('tab') as Tab) || 'overview');
  const [ready, setReady] = useState(false);
  useEffect(() => { supabase.auth.getUser().then(({ data: { user } }) => (user ? setReady(true) : router.push('/admin/login'))); }, [router]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <AdminPageHeader title="Email" description="Every email the website sends, the AI marketing campaigns, and who is subscribed. Replies to emails arrive in the support@ inbox." />
      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={cn('flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold border', tab === t.id ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50')}>
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>
      {ready && tab === 'overview' && <Overview />}
      {ready && tab === 'campaigns' && <Campaigns />}
      {ready && tab === 'messages' && <Messages />}
      {ready && tab === 'contacts' && <Contacts />}
      {ready && tab === 'jobs' && <Jobs />}
      {ready && tab === 'compose' && <Compose />}
    </div>
  );
}

function Card({ title, children, className }: { title?: string; children: React.ReactNode; className?: string }) {
  return <div className={cn('bg-white border border-slate-200 rounded-xl p-5', className)}>{title && <h2 className="font-heading font-semibold text-slate-900 mb-3">{title}</h2>}{children}</div>;
}

function Overview() {
  const [o, setO] = useState<any>(null);
  const [s, setS] = useState<any>(null);
  const [err, setErr] = useState('');
  const load = useCallback(() => {
    api('/api/admin/email?view=overview').then(setO).catch((e) => setErr(e.message));
    api('/api/admin/email?view=settings').then((j) => setS(j.settings)).catch((e) => setErr(e.message));
  }, []);
  useEffect(load, [load]);
  const save = async (patch: object) => { try { setS((await post({ action: 'settings', ...patch })).settings); } catch (e: any) { setErr(e.message); } };
  if (err) return <p className="text-red-700">{err} {err.includes('relation') && '— run supabase/migration-v31-email-engine.sql first.'}</p>;
  if (!o || !s) return <p className="text-slate-500">Loading…</p>;
  const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) + '%' : '–');
  const checks: [boolean, string][] = [
    [o.configured, 'Sending is set up (RESEND_API_KEY)'],
    [o.cron, 'Scheduler secret is set (CRON_SECRET)'],
    [o.webhook, 'Delivery tracking is set up (RESEND_WEBHOOK_SECRET)'],
    [o.ai, 'AI writer is set up (OPENAI_API_KEY)'],
  ];
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <Card title="Last 30 days" className="lg:col-span-2">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {[['Sent', o.sent30], ['Delivered', pct(o.delivered30, o.sent30)], ['Opened', pct(o.opened30, o.sent30)], ['Clicked', pct(o.clicked30, o.sent30)], ['Bounced', o.bounced30]].map(([k, v]) => (
            <div key={k as string}><p className="text-xs uppercase text-slate-500">{k}</p><p className="text-2xl font-heading font-bold text-slate-900">{v}</p></div>
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-5 border-t border-slate-100">
          {[['Contacts', o.contacts], ['Subscribed', o.subscribed], ['Unsubscribed', o.unsub], ['Emails waiting', o.pending]].map(([k, v]) => (
            <div key={k as string}><p className="text-xs uppercase text-slate-500">{k}</p><p className="text-xl font-heading font-bold text-slate-900">{v}</p></div>
          ))}
        </div>
      </Card>
      <Card title="Setup">
        <ul className="space-y-2 text-sm">{checks.map(([ok, label]) => (
          <li key={label} className="flex items-start gap-2">{ok ? <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" /> : <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />}<span className={ok ? 'text-slate-700' : 'text-amber-800'}>{label}</span></li>
        ))}</ul>
      </Card>
      <Card title="AI marketing" className="lg:col-span-2">
        <p className="text-sm text-slate-600 mb-3">The AI picks the theme of the moment (festivals, seasons, new guides), writes the email with our photos and verified facts, and sends it only to people who said yes to offers.</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {([['auto', 'Autopilot: AI writes and sends'], ['approve', 'AI drafts, I approve'], ['off', 'Off']] as const).map(([m, label]) => (
            <button key={m} onClick={() => save({ marketing_mode: m })} className={cn('px-3.5 py-2 rounded-lg text-sm font-semibold border', s.marketing_mode === m ? 'bg-brand-600 text-white border-brand-600' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50')}>{label}</button>
          ))}
        </div>
        <label className="text-sm text-slate-700 flex items-center gap-2">At most
          <select value={s.max_marketing_per_week} onChange={(e) => save({ max_marketing_per_week: Number(e.target.value) })} className="border border-slate-300 rounded-md px-2 py-1">
            {[1, 2, 3].map((n) => <option key={n} value={n}>{n}</option>)}
          </select> marketing email(s) per person per week
        </label>
      </Card>
      <Card title="Automatic emails">
        <ul className="space-y-3">{AUTOMATIONS.map((a) => {
          const on = s.automations?.[a.key] !== false;
          return (
            <li key={a.key} className="flex items-start justify-between gap-3">
              <div><p className="text-sm font-semibold text-slate-800">{a.label}</p><p className="text-xs text-slate-500">{a.hint}</p></div>
              <button onClick={() => save({ automations: { [a.key]: !on } })} className={cn('shrink-0 w-11 h-6 rounded-full relative transition-colors', on ? 'bg-green-600' : 'bg-slate-300')} aria-pressed={on} aria-label={a.label}>
                <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all', on ? 'left-[22px]' : 'left-0.5')} />
              </button>
            </li>
          );
        })}</ul>
        <p className="text-xs text-slate-500 mt-4">Booking confirmations, enquiry replies and cancellations always go out.</p>
      </Card>
    </div>
  );
}

function Campaigns() {
  const [rows, setRows] = useState<any[]>([]);
  const [themes, setThemes] = useState<any[]>([]);
  const [brief, setBrief] = useState('');
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const [open, setOpen] = useState<any>(null);
  const load = useCallback(() => api('/api/admin/email?view=campaigns').then((j) => { setRows(j.rows); setThemes(j.themes); }).catch((e) => setMsg(e.message)), []);
  useEffect(() => { load(); }, [load]);
  const run = async (label: string, body: object, after?: (j: any) => void) => {
    setBusy(label); setMsg('');
    try { const j = await post(body); after?.(j); await load(); } catch (e: any) { setMsg(e.message); } finally { setBusy(''); }
  };
  return (
    <div className="space-y-5">
      <Card title="Ask the AI for a campaign">
        <div className="flex flex-wrap gap-2 mb-3">
          {themes.map((t) => <button key={t.id} disabled={!!busy} onClick={() => run('gen', { action: 'generate', theme: t.id }, (j) => setOpen(j.campaign))} className="px-3 py-1.5 rounded-full text-sm border border-brand-200 bg-brand-50 text-brand-800 hover:bg-brand-100 disabled:opacity-50"><Sparkles className="inline h-3.5 w-3.5 mr-1" />{t.name}</button>)}
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input value={brief} onChange={(e) => setBrief(e.target.value)} placeholder="Or describe one, e.g. 'Weekend escape for couples from Delhi in December'" className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          <button disabled={!!busy || brief.trim().length < 10} onClick={() => run('gen', { action: 'generate', brief }, (j) => { setOpen(j.campaign); setBrief(''); })} className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-brand-700 disabled:opacity-50">
            {busy === 'gen' ? 'Writing… (about 20 seconds)' : 'Write it'}
          </button>
        </div>
        {msg && <p className="text-sm text-red-700 mt-2">{msg}</p>}
      </Card>
      <Card title="Campaigns">
        {!rows.length ? <p className="text-sm text-slate-500">No campaigns yet. The autopilot makes one when there is a theme and at least one subscriber.</p> : (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="text-left text-xs uppercase text-slate-500 border-b"><th className="py-2 pr-3">Campaign</th><th className="pr-3">Status</th><th className="pr-3">Sends / sent</th><th className="pr-3">Results</th><th /></tr></thead>
            <tbody>{rows.map((c) => {
              const st = c.stats || {}; const total = Object.entries(st).filter(([k]) => k !== 'skipped').reduce((a, [, v]) => a + (v as number), 0);
              return (
                <tr key={c.id} className="border-b border-slate-100">
                  <td className="py-2.5 pr-3"><p className="font-semibold text-slate-800">{c.subject}</p><p className="text-xs text-slate-500">{c.name} · by {c.created_by}</p></td>
                  <td className="pr-3"><Pill s={c.status} /></td>
                  <td className="pr-3 text-slate-600">{when(c.sent_at || c.scheduled_at) || '–'}</td>
                  <td className="pr-3 text-slate-600">{total ? `${total} sent · ${(st.opened || 0) + (st.clicked || 0)} opened · ${st.clicked || 0} clicked` : '–'}</td>
                  <td className="text-right"><button onClick={() => setOpen(c)} className="text-brand-700 font-semibold flex items-center gap-1 ml-auto"><Eye className="h-4 w-4" /> Open</button></td>
                </tr>
              );
            })}</tbody>
          </table></div>
        )}
      </Card>
      {open && <CampaignEditor c={open} onClose={() => { setOpen(null); load(); }} />}
    </div>
  );
}

function CampaignEditor({ c, onClose }: { c: any; onClose: () => void }) {
  const [subject, setSubject] = useState(c.subject);
  const [preheader, setPreheader] = useState(c.preheader || '');
  const [content, setContent] = useState<any>(c.content);
  const [html, setHtml] = useState('');
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const editable = ['draft', 'scheduled'].includes(c.status);
  const preview = useCallback(() => api('/api/admin/email?view=preview&id=' + c.id).then((j) => setHtml(j.html)).catch((e) => setMsg(e.message)), [c.id]);
  useEffect(() => { preview(); }, [preview]);
  const act = async (label: string, body: object, done?: string) => {
    setBusy(label); setMsg('');
    try { await post(body); if (done) setMsg(done); await preview(); } catch (e: any) { setMsg(e.message); } finally { setBusy(''); }
  };
  const save = () => act('save', { action: 'update', id: c.id, subject, preheader, content }, 'Saved.');
  const setSection = (i: number, k: string, v: string) => setContent({ ...content, sections: content.sections.map((s: any, j: number) => (j === i ? { ...s, [k]: v } : s)) });

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex justify-end" role="dialog" aria-modal="true">
      <div className="bg-white w-full max-w-6xl h-full overflow-y-auto p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2"><h2 className="font-heading font-bold text-lg">Campaign</h2><Pill s={c.status} /></div>
          <button onClick={onClose} aria-label="Close" className="p-2 rounded-lg hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <label className="block text-sm"><span className="font-semibold text-slate-700">Subject</span><input disabled={!editable} value={subject} onChange={(e) => setSubject(e.target.value)} className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2" /></label>
            <label className="block text-sm"><span className="font-semibold text-slate-700">Preview text</span><input disabled={!editable} value={preheader} onChange={(e) => setPreheader(e.target.value)} className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2" /></label>
            <label className="block text-sm"><span className="font-semibold text-slate-700">Heading</span><input disabled={!editable} value={content.heading} onChange={(e) => setContent({ ...content, heading: e.target.value })} className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2" /></label>
            <label className="block text-sm"><span className="font-semibold text-slate-700">Intro</span><textarea disabled={!editable} rows={4} value={content.intro} onChange={(e) => setContent({ ...content, intro: e.target.value })} className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2" /></label>
            {content.sections.map((s: any, i: number) => (
              <div key={i} className="border border-slate-200 rounded-lg p-3 space-y-2">
                <input disabled={!editable} value={s.title} onChange={(e) => setSection(i, 'title', e.target.value)} className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm font-semibold" />
                <textarea disabled={!editable} rows={3} value={s.text} onChange={(e) => setSection(i, 'text', e.target.value)} className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm" />
                <p className="text-xs text-slate-500">Photo: {s.image} · Link: {s.link}</p>
              </div>
            ))}
            {editable && (
              <div className="flex flex-wrap gap-2 pt-2">
                <button onClick={save} disabled={!!busy} className="px-4 py-2 rounded-lg border border-slate-300 font-semibold text-sm hover:bg-slate-50">{busy === 'save' ? 'Saving…' : 'Save changes'}</button>
                <button onClick={() => act('test', { action: 'test', id: c.id }, 'Test sent to the admin inbox.')} disabled={!!busy} className="px-4 py-2 rounded-lg border border-slate-300 font-semibold text-sm hover:bg-slate-50">{busy === 'test' ? 'Sending…' : 'Send me a test'}</button>
                <button onClick={() => act('send', { action: 'schedule', id: c.id }, 'Scheduled: it starts sending within 10 minutes.')} disabled={!!busy} className="px-4 py-2 rounded-lg bg-brand-600 text-white font-semibold text-sm hover:bg-brand-700 flex items-center gap-1.5"><Send className="h-4 w-4" />{busy === 'send' ? 'Scheduling…' : 'Send to subscribers'}</button>
                <button onClick={() => act('cancel', { action: 'cancel', id: c.id }, 'Cancelled.')} disabled={!!busy} className="px-4 py-2 rounded-lg text-red-700 font-semibold text-sm hover:bg-red-50">Cancel campaign</button>
              </div>
            )}
            {msg && <p className="text-sm text-slate-700">{msg}</p>}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-2">Preview (as a subscriber called Asha sees it)</p>
            <iframe title="Email preview" srcDoc={html} className="w-full h-[78vh] border border-slate-200 rounded-lg bg-white" sandbox="" />
          </div>
        </div>
      </div>
    </div>
  );
}

function useList(view: string, q = '', extra = '') {
  const [rows, setRows] = useState<any[] | null>(null);
  const [err, setErr] = useState('');
  const load = useCallback(() => { setRows(null); api(`/api/admin/email?view=${view}&q=${encodeURIComponent(q)}${extra}`).then((j) => setRows(j.rows)).catch((e) => setErr(e.message)); }, [view, q, extra]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);
  return { rows, err, load };
}

function Messages() {
  const [q, setQ] = useState(''); const [kind, setKind] = useState('');
  const { rows, err, load } = useList('messages', q, kind ? '&kind=' + kind : '');
  return (
    <Card>
      <div className="flex flex-wrap gap-2 mb-4">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search email or subject" className="flex-1 min-w-[200px] border border-slate-300 rounded-lg px-3 py-2 text-sm" />
        <select value={kind} onChange={(e) => setKind(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm"><option value="">All kinds</option><option value="transactional">Guests</option><option value="marketing">Marketing</option><option value="admin">Admin alerts</option></select>
        <button onClick={load} className="px-3 py-2 rounded-lg border border-slate-300 text-sm"><RefreshCw className="h-4 w-4" /></button>
      </div>
      {err && <p className="text-red-700 text-sm">{err}</p>}
      {!rows ? <p className="text-slate-500 text-sm">Loading…</p> : !rows.length ? <p className="text-slate-500 text-sm">No emails yet.</p> : (
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead><tr className="text-left text-xs uppercase text-slate-500 border-b"><th className="py-2 pr-3">When</th><th className="pr-3">To</th><th className="pr-3">Subject</th><th className="pr-3">Type</th><th>Status</th></tr></thead>
          <tbody>{rows.map((m) => (
            <tr key={m.id} className="border-b border-slate-100 align-top">
              <td className="py-2 pr-3 whitespace-nowrap text-slate-500">{when(m.created_at)}</td>
              <td className="pr-3 text-slate-800">{m.to_email}</td>
              <td className="pr-3 text-slate-700">{m.subject}{m.error && <span className="block text-xs text-amber-700">{m.error}</span>}</td>
              <td className="pr-3 text-xs text-slate-500">{m.template}</td>
              <td><Pill s={m.status} /></td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
    </Card>
  );
}

function Contacts() {
  const [q, setQ] = useState('');
  const { rows, err } = useList('contacts', q);
  return (
    <Card>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email or phone" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-4" />
      {err && <p className="text-red-700 text-sm">{err}</p>}
      {!rows ? <p className="text-slate-500 text-sm">Loading…</p> : !rows.length ? <p className="text-slate-500 text-sm">No contacts yet. They are added automatically from bookings, enquiries, WhatsApp and sign-ups.</p> : (
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead><tr className="text-left text-xs uppercase text-slate-500 border-b"><th className="py-2 pr-3">Person</th><th className="pr-3">Came from</th><th className="pr-3">Interests</th><th className="pr-3">Bookings</th><th>Offers by email</th></tr></thead>
          <tbody>{rows.map((c) => (
            <tr key={c.id} className="border-b border-slate-100 align-top">
              <td className="py-2 pr-3"><p className="font-semibold text-slate-800">{c.name || '–'}</p><p className="text-xs text-slate-500">{[c.email, c.phone].filter(Boolean).join(' · ')}</p></td>
              <td className="pr-3 text-slate-600">{c.source}</td>
              <td className="pr-3 text-slate-600">{(c.interests || []).join(', ') || '–'}</td>
              <td className="pr-3 text-slate-600">{c.booking_count || 0}</td>
              <td>{c.suppressed_reason ? <Pill s={c.suppressed_reason} /> : c.unsubscribed_at ? <span className="text-xs text-slate-500">Unsubscribed {when(c.unsubscribed_at)}</span> : c.marketing_consent ? <span className="text-xs text-green-700 font-semibold">Yes · {c.consent_source}</span> : <span className="text-xs text-slate-500">No</span>}</td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
    </Card>
  );
}

function Jobs() {
  const { rows, err, load } = useList('jobs');
  const [busy, setBusy] = useState(false);
  return (
    <Card>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-slate-600">Arrival guides, review requests and follow-ups waiting for their time. The scheduler checks every 10 minutes.</p>
        <button disabled={busy} onClick={async () => { setBusy(true); try { await post({ action: 'run-jobs' }); } finally { setBusy(false); load(); } }} className="px-3 py-2 rounded-lg border border-slate-300 text-sm font-semibold whitespace-nowrap">{busy ? 'Running…' : 'Send due now'}</button>
      </div>
      {err && <p className="text-red-700 text-sm">{err}</p>}
      {!rows ? <p className="text-slate-500 text-sm">Loading…</p> : !rows.length ? <p className="text-slate-500 text-sm">Nothing scheduled yet.</p> : (
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead><tr className="text-left text-xs uppercase text-slate-500 border-b"><th className="py-2 pr-3">Email</th><th className="pr-3">Due</th><th className="pr-3">Status</th><th>Note</th></tr></thead>
          <tbody>{rows.map((j) => (
            <tr key={j.id} className="border-b border-slate-100"><td className="py-2 pr-3 text-slate-800">{j.template.replace(/_/g, ' ')}</td><td className="pr-3 text-slate-600">{when(j.send_at)}</td><td className="pr-3"><Pill s={j.status} /></td><td className="text-xs text-slate-500">{j.last_error || ''}</td></tr>
          ))}</tbody>
        </table></div>
      )}
    </Card>
  );
}

function Compose() {
  const [f, setF] = useState({ to: '', subject: '', body: '', label: '', href: '' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const send = async () => {
    setBusy(true); setMsg('');
    try {
      await post({ action: 'compose', to: f.to, subject: f.subject, body: f.body, ...(f.label && f.href ? { button: { label: f.label, href: f.href } } : {}) });
      setMsg('Sent. It is in the Sent emails tab.'); setF({ to: '', subject: '', body: '', label: '', href: '' });
    } catch (e: any) { setMsg(e.message); } finally { setBusy(false); }
  };
  return (
    <Card title="Write an email (sent in our branded design)">
      <div className="grid gap-3 max-w-2xl">
        <input value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} placeholder="To (email)" className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
        <input value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} placeholder="Subject" className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
        <textarea value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} rows={10} placeholder={'Message. Leave a blank line between paragraphs. Use **bold** for emphasis.'} className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
        <div className="grid sm:grid-cols-2 gap-3">
          <input value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} placeholder="Button text (optional)" className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          <input value={f.href} onChange={(e) => setF({ ...f, href: e.target.value })} placeholder="Button link, e.g. /hotels" className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div><button disabled={busy || !f.to || f.subject.length < 3 || f.body.length < 5} onClick={send} className="bg-brand-600 text-white px-5 py-2.5 rounded-lg font-semibold text-sm hover:bg-brand-700 disabled:opacity-50 flex items-center gap-1.5"><Send className="h-4 w-4" />{busy ? 'Sending…' : 'Send'}</button></div>
        {msg && <p className="text-sm text-slate-700">{msg}</p>}
        <p className="text-xs text-slate-500">Sent from bookings@dharamshalastay.com. Replies go to support@dharamshalastay.com.</p>
      </div>
    </Card>
  );
}
