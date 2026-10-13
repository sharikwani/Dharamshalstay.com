// app/(site)/partner/rooms/page.tsx
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BedDouble } from 'lucide-react';
import { supabase, authFetch } from '@/lib/supabase';
import RoomsEditor from '@/components/rooms/RoomsEditor';

type Prop = { id: string; name: string; status: string };
const LIVE = ['published', 'approved'];

export default function PartnerRoomsPage() {
  const router = useRouter();
  const [properties, setProperties] = useState<Prop[]>([]);
  const [selected, setSelected] = useState('');
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/partner/login'); return; }
      setUserId(session.user.id);
      try {
        const res = await authFetch('/api/partner/rooms');
        const d = await res.json().catch(() => ({}));
        if (!res.ok) setError(d.error || 'Could not load your properties');
        else {
          const list: Prop[] = d.properties || [];
          setProperties(list);
          setSelected(list.find((p) => LIVE.includes(p.status))?.id || '');
        }
      } catch { setError('Could not load your properties'); }
      setLoading(false);
    }
    load();
  }, [router]);

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" /></div>;

  const prop = properties.find((p) => p.id === selected);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <Link href="/partner/dashboard" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-brand-600 mb-4"><ArrowLeft className="h-4 w-4" /> Dashboard</Link>
      <h1 className="text-2xl font-heading font-bold text-slate-900 flex items-center gap-2"><BedDouble className="h-6 w-6 text-brand-600" /> Rooms</h1>
      <p className="text-slate-600 text-sm mb-6">Set up your room types. Changes go live straight away.</p>

      {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-4">{error}</p>}

      {!error && properties.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-600">No hotels are linked to your account yet.</div>
      ) : (
        <div className="space-y-4">
          {properties.length > 1 && (
            <label className="block text-sm text-slate-700">
              Property
              <select value={selected} onChange={(e) => setSelected(e.target.value)} className="ml-2 max-w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none">
                {!selected && <option value="">Choose a hotel</option>}
                {properties.map((p) => {
                  const live = LIVE.includes(p.status);
                  return <option key={p.id} value={p.id} disabled={!live}>{p.name}{live ? '' : ' (draft — use the listing form)'}</option>;
                })}
              </select>
            </label>
          )}
          {prop && userId ? (
            <RoomsEditor key={prop.id} apiUrl="/api/partner/rooms" propertyId={prop.id} userId={userId} />
          ) : !error && (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-600">
              Your hotel is still a draft. Edit its rooms on the <Link href="/partner/dashboard" className="text-brand-700 underline">listing form</Link> until it goes live.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
