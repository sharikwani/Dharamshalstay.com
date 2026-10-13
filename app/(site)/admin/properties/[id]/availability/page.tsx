// app/(site)/admin/properties/[id]/availability/page.tsx
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { supabase, authFetch } from '@/lib/supabase';
import AvailabilityCalendar from '@/components/availability/AvailabilityCalendar';
import type { RoomSummary } from '@/lib/availability/calc';

const UNTRACKED_NOTE = 'This room type has no room count yet, so it is always bookable and the calendar is off. Set "Rooms to sell" for it on the edit page first.';

export default function AdminPropertyAvailabilityPage() {
  const router = useRouter();
  const params = useParams();
  const id = String(params.id);
  const [property, setProperty] = useState<{ id: string; name: string; rooms: RoomSummary[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/admin/login'); return; }
      try {
        const res = await authFetch(`/api/admin/availability?property_id=${encodeURIComponent(id)}`);
        const d = await res.json().catch(() => ({}));
        if (!res.ok) setError(d.error || 'Could not load this property');
        else setProperty(d.property);
      } catch { setError('Could not load this property'); }
      setLoading(false);
    }
    load();
  }, [id, router]);

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="h-8 w-8 text-brand-600 animate-spin" /></div>;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <Link href={`/admin/properties/${id}/edit`} className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-800 mb-4"><ArrowLeft className="h-4 w-4" /> Back to edit</Link>
      <h1 className="text-2xl font-heading font-bold text-slate-900">Room availability{property ? `: ${property.name}` : ''}</h1>
      <p className="text-sm text-slate-500 mb-6">Rooms open per date for each room type. The default is the room type&apos;s &quot;Rooms to sell&quot;.</p>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">{error}</div>}
      {property && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6">
          <AvailabilityCalendar apiUrl="/api/admin/availability" propertyId={property.id} rooms={property.rooms} untrackedNote={UNTRACKED_NOTE} />
        </div>
      )}
    </div>
  );
}
