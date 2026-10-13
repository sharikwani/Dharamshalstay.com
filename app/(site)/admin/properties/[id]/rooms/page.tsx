// app/(site)/admin/properties/[id]/rooms/page.tsx
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import RoomsEditor from '@/components/rooms/RoomsEditor';

export default function AdminPropertyRoomsPage() {
  const router = useRouter();
  const params = useParams();
  const id = String(params.id);
  const [userId, setUserId] = useState('');

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/admin/login'); return; }
      setUserId(user.id);
    }
    load();
  }, [router]);

  if (!userId) return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="h-8 w-8 text-brand-600 animate-spin" /></div>;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <Link href={`/admin/properties/${id}/edit`} className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-800 mb-4"><ArrowLeft className="h-4 w-4" /> Back to edit</Link>
      <h1 className="text-2xl font-heading font-bold text-slate-900">Rooms</h1>
      <p className="text-sm text-slate-500 mb-6">Set up the room types for this hotel. Changes go live straight away.</p>
      <RoomsEditor apiUrl="/api/admin/rooms" propertyId={id} userId={userId} />
    </div>
  );
}
