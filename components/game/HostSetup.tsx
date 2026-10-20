'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { post, store } from './useGame';
import { PARTY_TYPES, type PartyType } from '@/lib/game/tambola';

export default function HostSetup() {
  const router = useRouter();
  const [partyName, setPartyName] = useState('');
  const [partyType, setPartyType] = useState<PartyType>('birthday');
  const [hostName, setHostName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setErr(null);
    try {
      const r = await post<{ code: string; hostToken: string }>('/api/game/rooms', { party_name: partyName, party_type: partyType, host_name: hostName });
      store.set('tambola-host-' + r.code, r.hostToken);
      router.push('/play/host/' + r.code);
    } catch (x: any) { setErr(x.message); setBusy(false); }
  }

  const input = 'w-full rounded-lg border border-slate-300 px-3 py-3 outline-none focus:ring-2 focus:ring-brand-500';
  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl bg-white p-6 shadow-lg">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Type of party</label>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(PARTY_TYPES) as PartyType[]).map((t) => (
            <button type="button" key={t} onClick={() => setPartyType(t)} className={'rounded-full px-3 py-1.5 text-sm font-medium ' + (partyType === t ? 'bg-brand-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')}>{PARTY_TYPES[t]}</button>
          ))}
        </div>
      </div>
      <div>
        <label htmlFor="party" className="block text-sm font-medium text-slate-700 mb-1">Party name (goes on the winners&apos; certificates)</label>
        <input id="party" value={partyName} onChange={(e) => setPartyName(e.target.value)} required maxLength={60} placeholder={partyType === 'anniversary' ? 'Neha & Rohit’s 10th Anniversary' : partyType === 'kitty' ? 'Sunday Kitty Club, October' : 'Riya’s 30th Birthday'} className={input} />
      </div>
      <div>
        <label htmlFor="host" className="block text-sm font-medium text-slate-700 mb-1">Host name</label>
        <input id="host" value={hostName} onChange={(e) => setHostName(e.target.value)} required maxLength={40} placeholder="Your name" className={input} />
      </div>
      {err && <p className="text-sm text-red-600">{err}</p>}
      <button disabled={busy} className="w-full rounded-lg bg-orange-600 py-3 text-lg font-semibold text-white hover:bg-orange-700 disabled:opacity-60">{busy ? 'Starting…' : 'Create game and get the code'}</button>
      <p className="text-xs text-slate-500 text-center">Open this on the laptop or TV everyone can see. This screen becomes the host console.</p>
    </form>
  );
}
