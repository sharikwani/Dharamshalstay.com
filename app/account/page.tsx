'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User, LogOut, Calendar, CreditCard, Phone, Mail, Clock, CheckCircle, AlertCircle, Loader2, MapPin, Building } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatPrice } from '@/lib/utils';

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) { router.push('/auth/login'); return; }
      setUser(u);

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', u.id).single();
      setProfile(prof);

      const { data: bk } = await supabase.from('bookings').select('*').eq('user_id', u.id).order('created_at', { ascending: false }).limit(20);
      setBookings(bk || []);
      setLoading(false);
    }
    load();
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/');
  }

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="h-8 w-8 text-brand-600 animate-spin" /></div>;

  const statusColors: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    confirmed: 'bg-green-100 text-green-700',
    completed: 'bg-blue-100 text-blue-700',
    cancelled: 'bg-red-100 text-red-700',
    failed: 'bg-red-100 text-red-700',
  };

  const paymentColors: Record<string, string> = {
    paid: 'text-green-600',
    pending: 'text-amber-600',
    failed: 'text-red-600',
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Profile header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-8 flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-brand-100 rounded-full flex items-center justify-center">
            <User className="h-6 w-6 text-brand-600" />
          </div>
          <div>
            <h1 className="text-xl font-heading font-bold text-slate-900">{profile?.full_name || user?.email}</h1>
            <div className="flex flex-wrap gap-3 text-sm text-slate-500 mt-1">
              {profile?.email && <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{profile.email}</span>}
              {profile?.phone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{profile.phone}</span>}
            </div>
          </div>
        </div>
        <button onClick={handleLogout}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-red-500 px-3 py-2 rounded-lg hover:bg-red-50">
          <LogOut className="h-4 w-4" /> Logout
        </button>
      </div>

      {/* Bookings */}
      <h2 className="text-lg font-heading font-bold text-slate-900 mb-4">Your Bookings ({bookings.length})</h2>

      {bookings.length === 0 ? (
        <div className="bg-slate-50 rounded-2xl p-12 text-center">
          <Building className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 font-medium mb-1">No bookings yet</p>
          <p className="text-sm text-slate-400 mb-4">Browse our hotels and book your first Dharamshala stay!</p>
          <Link href="/hotels" className="inline-block bg-brand-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-brand-700">Browse Hotels</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map(b => (
            <div key={b.id} className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono font-bold text-brand-600 text-sm">{b.booking_ref}</span>
                    <span className={'text-xs font-medium px-2 py-0.5 rounded-full capitalize ' + (statusColors[b.status] || 'bg-slate-100 text-slate-600')}>{b.status}</span>
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full capitalize">{b.category}</span>
                  </div>
                  {b.room_name && <p className="text-sm text-slate-700 font-medium">{b.room_name}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-slate-900">{formatPrice(b.amount)}</p>
                  <p className={'text-xs font-medium capitalize ' + (paymentColors[b.payment_status] || 'text-slate-500')}>
                    {b.payment_status === 'paid' ? 'Paid' : b.payment_status}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                {b.check_in && (
                  <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{b.check_in} to {b.check_out}</span>
                )}
                {b.activity_date && (
                  <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{b.activity_date}</span>
                )}
                <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{new Date(b.created_at).toLocaleDateString('en-IN')}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
