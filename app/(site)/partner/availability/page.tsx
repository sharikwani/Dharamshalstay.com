// app/(site)/partner/availability/page.tsx
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CalendarDays } from 'lucide-react';
import { supabase, authFetch } from '@/lib/supabase';
import AvailabilityCalendar from '@/components/availability/AvailabilityCalendar';
import type { RoomSummary } from '@/lib/availability/calc';

type Prop = { id: string; name: string; rooms: RoomSummary[] };

const UNTRACKED_NOTE = 'This room type has no room count yet, so it is always bookable and the calendar is off. WhatsApp us and we will set how many rooms of this type you have.';

export default function PartnerAvailabilityPage() {
  const router = useRouter();
  const [properties, setProperties] = useState<Prop[]>([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/partner/login'); return; }
      try {
        const res = await authFetch('/api/partner/availability');
        const d = await res.json().catch(() => ({}));
        if (!res.ok) setError(d.error || 'Could not load your properties');
        else { setProperties(d.properties || []); setSelected(d.properties?.[0]?.id || ''); }
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
      <h1 className="text-2xl font-heading font-bold text-slate-900 flex items-center gap-2"><CalendarDays className="h-6 w-6 text-brand-600" /> Room availability</h1>
      <p className="text-slate-600 text-sm mb-6">Set how many rooms of each type are open on each date. Lower it for walk-ins, phone and other sites; at 0 the room shows Sold out on the website and WhatsApp.</p>

      {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-4">{error}</p>}

      {!error && properties.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-600">No hotels are linked to your account yet.</div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 space-y-4">
          {properties.length > 1 && (
            <label className="block text-sm text-slate-700">
              Property
              <select value={selected} onChange={(e) => setSelected(e.target.value)} className="ml-2 px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none">
                {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
          )}
          {prop && <AvailabilityCalendar apiUrl="/api/partner/availability" propertyId={prop.id} rooms={prop.rooms} untrackedNote={UNTRACKED_NOTE} />}
        </div>
      )}
    </div>
  );
}
