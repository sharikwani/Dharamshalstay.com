'use client';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Bot, Hand, Loader2, Send, UserRound, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

type Conv = { id: string; phone: string; profile_name: string | null; status: string; handover_reason: string | null; last_message_at: string; last_customer_at: string | null; unread_admin: number; last_body: string };
type Msg = { id: string; author: 'customer' | 'ai' | 'admin'; body: string; kind: string; status: string; error: string | null; created_at: string };

const BADGE: Record<string, [string, string]> = {
  ai: ['AI', 'bg-sky-100 text-sky-800'], human: ['You', 'bg-violet-100 text-violet-800'],
  needs_human: ['Needs you', 'bg-red-100 text-red-800'], closed: ['Closed', 'bg-slate-100 text-slate-600'],
};
const isBusiness = (v: { handover_reason: string | null }) => !!v.handover_reason?.startsWith('Hotel or business');
const time = (s: string) => new Date(s).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

async function api(path: string, init?: RequestInit) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(path, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` } });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Something went wrong');
  return json;
}

function Inbox() {
  const params = useSearchParams();
  const [convs, setConvs] = useState<Conv[]>([]);
  const [listLoaded, setListLoaded] = useState(false);
  const [needs, setNeeds] = useState(0);
  const [filter, setFilter] = useState<'all' | 'needs'>('all');
  const [openId, setOpenId] = useState<string | null>(params.get('c'));
  const [thread, setThread] = useState<{ conversation: Conv; messages: Msg[]; enquiries: any[] } | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [settings, setSettings] = useState<{ ai_mode: string; test_numbers: string[] } | null>(null);
  const [numbers, setNumbers] = useState('');
  const bottom = useRef<HTMLDivElement>(null);
  // Set synchronously, so a second Enter or click before React re-renders cannot send the reply twice.
  const sending = useRef(false);

  const loadList = useCallback(async () => {
    try {
      const d = await api(`/api/admin/whatsapp/conversations${filter === 'needs' ? '?filter=needs' : ''}`);
      setConvs(d.conversations); setNeeds(d.needsYou); setListLoaded(true);
    } catch (e: any) { setError(e.message); }
  }, [filter]);
  const loadThread = useCallback(async () => {
    if (!openId) return;
    try { setThread(await api(`/api/admin/whatsapp/conversations/${openId}`)); } catch (e: any) { setError(e.message); }
  }, [openId]);

  useEffect(() => { loadList(); const t = setInterval(loadList, 5000); return () => clearInterval(t); }, [loadList]);
  useEffect(() => { loadThread(); const t = setInterval(loadThread, 5000); return () => clearInterval(t); }, [loadThread]);
  useEffect(() => { bottom.current?.scrollIntoView({ block: 'end' }); }, [thread?.messages.length]);
  useEffect(() => {
    api('/api/admin/whatsapp/settings')
      .then((s) => { setSettings(s); setNumbers(s.test_numbers.map((n: string) => n.slice(2)).join(', ')); })
      .catch((e) => setError(e.message));
  }, []);

  async function send() {
    if (sending.current || !openId || !text.trim()) return;
    sending.current = true;
    setBusy(true); setError('');
    try {
      const r = await api(`/api/admin/whatsapp/conversations/${openId}/messages`, { method: 'POST', body: JSON.stringify({ text }) });
      setText('');
      // 202: WhatsApp may or may not have delivered it; the owner checks the chat before resending.
      if (r?.unknown) setError(r.error);
      await loadThread();
    }
    catch (e: any) { setError(e.message); } finally { sending.current = false; setBusy(false); }
  }
  async function setStatus(status: 'ai' | 'human' | 'closed') {
    if (!openId) return;
    setError('');
    try { await api(`/api/admin/whatsapp/conversations/${openId}`, { method: 'PATCH', body: JSON.stringify({ status }) }); await Promise.all([loadThread(), loadList()]); }
    catch (e: any) { setError(e.message); }
  }
  async function saveSettings(ai_mode: string) {
    setError('');
    const test_numbers = numbers.split(/[,\n]/).map((n) => n.trim()).filter(Boolean);
    try { await api('/api/admin/whatsapp/settings', { method: 'PATCH', body: JSON.stringify({ ai_mode, test_numbers }) }); setSettings({ ai_mode, test_numbers }); }
    catch (e: any) { setError(e.message); }
  }

  const c = thread?.conversation;
  const windowOpen = !!c?.last_customer_at && Date.now() - Date.parse(c.last_customer_at) < 24 * 3600e3;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h1 className="text-2xl font-heading font-bold text-slate-900">WhatsApp</h1>
        {settings && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-slate-600">AI replies:</span>
            {(['off', 'test', 'on'] as const).map((m) => (
              <button key={m} onClick={() => saveSettings(m)}
                className={cn('px-3 py-1.5 rounded-lg font-medium', settings.ai_mode === m ? 'bg-brand-700 text-white' : 'bg-white border border-slate-300 text-slate-700')}>
                {m === 'off' ? 'Off' : m === 'test' ? 'Test numbers only' : 'On for everyone'}
              </button>
            ))}
            {settings.ai_mode === 'test' && (
              <input value={numbers} onChange={(e) => setNumbers(e.target.value)} onBlur={() => saveSettings('test')}
                placeholder="Test numbers, comma separated" className="px-3 py-1.5 border border-slate-300 rounded-lg w-64" />
            )}
          </div>
        )}
      </div>
      {error && <p className="mb-3 text-sm text-red-700 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

      <div className="grid lg:grid-cols-[340px_1fr] gap-4">
        <div className={cn('bg-white rounded-xl border border-slate-200 overflow-hidden', openId && 'hidden lg:block')}>
          <div className="flex gap-2 p-3 border-b border-slate-200">
            <button onClick={() => setFilter('all')} className={cn('px-3 py-1 rounded-full text-sm', filter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100')}>All</button>
            <button onClick={() => setFilter('needs')} className={cn('px-3 py-1 rounded-full text-sm', filter === 'needs' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700')}>Needs you ({needs})</button>
          </div>
          <ul className="divide-y divide-slate-100 max-h-[70vh] overflow-y-auto">
            {convs.length === 0 && <li className="p-6 text-sm text-slate-500">{listLoaded ? 'No chats yet.' : 'Loading…'}</li>}
            {convs.map((v) => (
              <li key={v.id}>
                <button onClick={() => setOpenId(v.id)} className={cn('w-full text-left p-3 hover:bg-slate-50', openId === v.id && 'bg-brand-50')}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-900 truncate">{v.profile_name || '+' + v.phone}</span>
                    <span className="text-xs text-slate-500 shrink-0">{time(v.last_message_at)}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {isBusiness(v)
                      ? <span className="text-[11px] px-1.5 py-0.5 rounded font-medium bg-amber-100 text-amber-800" title={v.handover_reason || ''}>Hotel</span>
                      : <span className={cn('text-[11px] px-1.5 py-0.5 rounded font-medium', BADGE[v.status]?.[1])}>{BADGE[v.status]?.[0]}</span>}
                    <span className="text-sm text-slate-600 truncate flex-1">{v.last_body}</span>
                    {v.unread_admin > 0 && <span className="text-[11px] bg-green-600 text-white rounded-full px-1.5">{v.unread_admin}</span>}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className={cn('bg-white rounded-xl border border-slate-200 flex flex-col min-h-[70vh]', !openId && 'hidden lg:flex')}>
          {!c ? (
            <div className="m-auto text-slate-500 text-sm">{openId ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Pick a chat'}</div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2 p-3 border-b border-slate-200">
                <button onClick={() => { setOpenId(null); setThread(null); }} className="lg:hidden p-1" aria-label="Back to chats"><X className="h-5 w-5" /></button>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900">{c.profile_name || 'Customer'} <a href={`https://wa.me/${c.phone}`} className="text-sm font-normal text-slate-500">+{c.phone}</a></p>
                  {c.handover_reason && (isBusiness(c)
                    ? <p className="text-xs text-amber-700">{c.handover_reason}. Usually its automatic greeting after our invite.</p>
                    : <p className="text-xs text-red-700">Handed over: {c.handover_reason}</p>)}
                </div>
                {c.status === 'ai'
                  ? <button onClick={() => setStatus('human')} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-violet-600 text-white text-sm"><Hand className="h-4 w-4" />Take over</button>
                  : <button onClick={() => setStatus('ai')} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-600 text-white text-sm"><Bot className="h-4 w-4" />Hand back to AI</button>}
                {c.status !== 'closed' && <button onClick={() => setStatus('closed')} className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm">Close</button>}
              </div>
              {thread!.enquiries.length > 0 && (
                <div className="px-3 py-2 bg-amber-50 text-sm text-amber-900 border-b border-amber-100">
                  Enquiries from this chat: {thread!.enquiries.map((q) => `${q.type} (${q.status})`).join(', ')} — <a href="/admin/inquiries" className="underline">open inquiries</a>
                </div>
              )}
              <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50 max-h-[60vh]">
                {thread!.messages.map((m) => m.kind === 'system' ? (
                  // An owner-only note (what the AI did when its reply was not sent); the customer never saw it.
                  <div key={m.id} className="flex justify-center">
                    <div className="max-w-[90%] rounded-lg border border-dashed border-slate-300 bg-slate-100 px-3 py-1.5 text-xs text-slate-600 whitespace-pre-wrap">
                      <span className="font-semibold">Note for you · {time(m.created_at)}:</span> {m.body}
                    </div>
                  </div>
                ) : (
                  <div key={m.id} className={cn('flex', m.author === 'customer' ? 'justify-start' : 'justify-end')}>
                    <div className={cn('max-w-[80%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap shadow-sm',
                      m.author === 'customer' ? 'bg-white text-slate-900' : m.author === 'ai' ? 'bg-sky-100 text-slate-900' : 'bg-green-100 text-slate-900')}>
                      <p className="text-[11px] font-semibold text-slate-500 mb-0.5 flex items-center gap-1">
                        {m.author === 'customer' ? <UserRound className="h-3 w-3" /> : m.author === 'ai' ? <Bot className="h-3 w-3" /> : <Hand className="h-3 w-3" />}
                        {m.author === 'customer' ? 'Customer' : m.author === 'ai' ? 'AI assistant' : 'You'} · {time(m.created_at)}
                        {m.author !== 'customer' && <span className={m.status === 'failed' ? 'text-red-600' : m.status === 'unknown' ? 'text-amber-600' : ''}> · {m.status}</span>}
                      </p>
                      {m.body}
                      {m.error && <p className="text-xs text-red-600 mt-1">{m.error}</p>}
                    </div>
                  </div>
                ))}
                <div ref={bottom} />
              </div>
              <div className="p-3 border-t border-slate-200">
                {windowOpen ? (
                  <div className="flex gap-2">
                    <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} disabled={busy} placeholder="Type a reply (this takes the chat over from the AI)"
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm resize-none disabled:bg-slate-50" />
                    <button onClick={send} disabled={busy || !text.trim()} aria-label="Send" className="px-4 rounded-lg bg-green-600 text-white disabled:opacity-50">
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">More than 24 hours since the customer last wrote. WhatsApp only allows template messages now; reply when they message again, or call them.</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function WhatsAppInboxPage() {
  return <Suspense><Inbox /></Suspense>;
}
