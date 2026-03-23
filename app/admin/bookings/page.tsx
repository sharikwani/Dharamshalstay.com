'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, DollarSign, Phone, Mail, Check, X, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatPrice, formatDateTime, statusLabel, STATUS_COLORS, cn } from '@/lib/utils';

export default function AdminBookings() {
  const router = useRouter();
  const [allBookings, setAllBookings] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [catFilter, setCatFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [commFilter, setCommFilter] = useState('all');

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/admin/login'); return; }

    // Always fetch all for stats
    const { data: all } = await supabase.from('bookings').select('*').order('created_at', { ascending: false }).limit(500);
    setAllBookings(all || []);

    // Apply filters for display
    let filtered = all || [];
    if (catFilter !== 'all') filtered = filtered.filter(b => b.category === catFilter);
    if (statusFilter !== 'all') filtered = filtered.filter(b => b.status === statusFilter);
    if (commFilter !== 'all') filtered = filtered.filter(b => b.commission_status === commFilter);
    setBookings(filtered);
    setLoading(false);
  }

  useEffect(() => { load(); }, [catFilter, statusFilter, commFilter]);

  async function updateBookingStatus(id: string, newStatus: string) {
    await supabase.from('bookings').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', id);
    load();
  }

  async function markCommissionPaid(id: string) {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('bookings').update({
      commission_status: 'paid', commission_paid_date: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString(),
    }).eq('id', id);
    await supabase.from('commission_records').update({
      status: 'paid', paid_date: new Date().toISOString().split('T')[0],
      settled_by: user?.id, updated_at: new Date().toISOString(),
    }).eq('booking_id', id);
    load();
  }

  // Stats from UNFILTERED data
  const totalAmount = allBookings.reduce((s, b) => s + (b.amount || 0), 0);
  const totalCommission = allBookings.filter(b => b.commission_status !== 'not_applicable').reduce((s, b) => s + (b.commission_amount || 0), 0);
  const pendingCommission = allBookings.filter(b => ['pending', 'due', 'overdue'].includes(b.commission_status)).reduce((s, b) => s + (b.commission_amount || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <Link href="/admin/dashboard" className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-800 mb-4"><ArrowLeft className="h-4 w-4" /> Dashboard</Link>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-heading font-bold text-slate-900">All Bookings</h1>
        <button onClick={load} className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-800"><RefreshCw className="h-4 w-4" /> Refresh</button>
      </div>

      {/* Stats -- always from unfiltered data */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500 uppercase">Total Bookings</p>
          <p className="text-2xl font-heading font-bold text-brand-600">{allBookings.length}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500 uppercase">Total Value</p>
          <p className="text-2xl font-heading font-bold text-slate-900">{formatPrice(totalAmount)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500 uppercase">Total Commission</p>
          <p className="text-2xl font-heading font-bold text-green-600">{formatPrice(totalCommission)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500 uppercase">Pending Collection</p>
          <p className="text-2xl font-heading font-bold text-amber-600">{formatPrice(pendingCommission)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 mb-6">
        <div>
          <label className="text-xs font-semibold text-slate-500 block mb-1">Category</label>
          <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none">
            <option value="all">All</option><option value="hotel">Hotel</option><option value="taxi">Taxi</option><option value="trek">Trek</option><option value="paragliding">Paragliding</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 block mb-1">Status</label>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none">
            <option value="all">All</option><option value="pending">Pending</option><option value="confirmed">Confirmed</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 block mb-1">Commission</label>
          <select value={commFilter} onChange={e => setCommFilter(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none">
            <option value="all">All</option><option value="pending">Pending</option><option value="due">Due</option><option value="overdue">Overdue</option><option value="paid">Paid</option>
          </select>
        </div>
        {(catFilter !== 'all' || statusFilter !== 'all' || commFilter !== 'all') && (
          <p className="text-xs text-slate-500 self-center">Showing {bookings.length} of {allBookings.length}</p>
        )}
      </div>

      {/* Bookings List */}
      {loading ? <p className="text-slate-500">Loading...</p> : bookings.length === 0 ? <p className="text-slate-500">No bookings match your filters.</p> : (
        <div className="space-y-3">
          {bookings.map(b => (
            <div key={b.id} className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-mono text-sm font-semibold text-brand-600">{b.booking_ref}</span>
                    <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', STATUS_COLORS[b.status])}>{statusLabel(b.status)}</span>
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full capitalize">{b.category}</span>
                    <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', STATUS_COLORS[b.payment_method])}>{statusLabel(b.payment_method)}</span>
                  </div>
                  <h3 className="font-semibold text-slate-900">{b.guest_name}</h3>
                  <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                    <a href={`tel:${b.guest_phone}`} className="flex items-center gap-1 hover:text-brand-600"><Phone className="h-3.5 w-3.5" />{b.guest_phone}</a>
                    {b.guest_email && <a href={`mailto:${b.guest_email}`} className="flex items-center gap-1 hover:text-brand-600"><Mail className="h-3.5 w-3.5" />{b.guest_email}</a>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-bold text-slate-900">{formatPrice(b.amount)}</p>
                  {b.commission_amount > 0 && (
                    <p className="text-xs text-slate-500">Commission: {formatPrice(b.commission_amount)}
                      <span className={cn('ml-1 font-medium px-1.5 py-0.5 rounded text-[10px]', STATUS_COLORS[b.commission_status])}>{statusLabel(b.commission_status)}</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-slate-600 mb-3">
                {b.check_in && <span><Calendar className="h-3.5 w-3.5 inline mr-1" />In: {b.check_in}</span>}
                {b.check_out && <span>Out: {b.check_out}</span>}
                {b.activity_date && <span><Calendar className="h-3.5 w-3.5 inline mr-1" />Date: {b.activity_date}</span>}
                {b.pickup_location && <span>From: {b.pickup_location}</span>}
                {b.drop_location && <span>{'->'} {b.drop_location}</span>}
                {b.num_guests > 1 && <span>{b.num_guests} guests</span>}
                <span className="text-xs text-slate-400">{formatDateTime(b.created_at)}</span>
              </div>

              {b.special_requests && <p className="text-sm text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg mb-3">{b.special_requests}</p>}

              <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-100">
                {b.status === 'pending' && (
                  <button onClick={() => updateBookingStatus(b.id, 'confirmed')} className="text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 flex items-center gap-1"><Check className="h-3 w-3" /> Confirm</button>
                )}
                {b.status === 'confirmed' && (
                  <button onClick={() => updateBookingStatus(b.id, 'completed')} className="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700">Complete</button>
                )}
                {['pending', 'confirmed'].includes(b.status) && (
                  <button onClick={() => updateBookingStatus(b.id, 'cancelled')} className="text-xs px-3 py-1.5 border border-red-300 text-red-600 rounded-lg font-medium hover:bg-red-50 flex items-center gap-1"><X className="h-3 w-3" /> Cancel</button>
                )}
                {['pending', 'due', 'overdue'].includes(b.commission_status) && b.commission_amount > 0 && (
                  <button onClick={() => markCommissionPaid(b.id)} className="text-xs px-3 py-1.5 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 flex items-center gap-1"><DollarSign className="h-3 w-3" /> Mark Commission Paid</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
