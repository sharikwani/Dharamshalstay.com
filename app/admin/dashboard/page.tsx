'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building, Clock, CheckCircle, Car, Mountain, Users, MessageSquare, LogOut, AlertTriangle, Eye, Wind, ShoppingBag, DollarSign, User, Download } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatPrice, formatDateTime, STATUS_COLORS, statusLabel, cn } from '@/lib/utils';

export default function AdminDashboard() {
  const router = useRouter();
  const [adminName, setAdminName] = useState('');
  const [stats, setStats] = useState<any>({});
  const [pending, setPending] = useState<any[]>([]);
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/admin/login'); return; }
      const { data: profile } = await supabase.from('profiles').select('role, full_name').eq('id', user.id).single();
      if (profile?.role !== 'admin') { router.push('/admin/login'); return; }
      setAdminName(profile.full_name || user.user_metadata?.full_name || user.email || 'Admin');

      const [propRes, pendRes, bookRes, inqRes] = await Promise.all([
        supabase.from('properties').select('id, status', { count: 'exact' }),
        supabase.from('properties').select('*').eq('status', 'pending_review').order('submitted_at', { ascending: false }).limit(10),
        supabase.from('bookings').select('*').order('created_at', { ascending: false }).limit(10),
        supabase.from('inquiries').select('id', { count: 'exact' }),
      ]);

      const props = propRes.data || [];
      const books = bookRes.data || [];
      const pendingComm = books.filter((b: any) => ['pending', 'due', 'overdue'].includes(b.commission_status)).reduce((s: number, b: any) => s + (b.commission_amount || 0), 0);

      setStats({
        totalProperties: props.length,
        published: props.filter((p: any) => p.status === 'published').length,
        pendingReview: props.filter((p: any) => p.status === 'pending_review').length,
        totalBookings: books.length,
        totalInquiries: inqRes.count || 0,
        pendingCommission: pendingComm,
      });
      setPending(pendRes.data || []);
      setRecentBookings(books);
      setLoading(false);
    }
    load();
  }, [router]);

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header with admin name */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-heading font-bold text-slate-900">Admin Dashboard</h1>
          <p className="text-slate-600 text-sm">Manage properties, bookings, taxis, treks, paragliding, and more.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
            <User className="h-4 w-4 text-brand-600" />
            <span className="text-sm font-medium text-slate-700">{adminName}</span>
          </div>
          <button onClick={async () => { await supabase.auth.signOut(); router.push('/admin/login'); }}
            className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-red-600 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors">
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Properties', count: stats.totalProperties, icon: Building, color: 'text-brand-600', href: '/admin/properties' },
          { label: 'Pending Approval', count: stats.pendingReview, icon: Clock, color: 'text-amber-600', href: '/admin/approvals' },
          { label: 'Bookings', count: stats.totalBookings, icon: ShoppingBag, color: 'text-purple-600', href: '/admin/bookings' },
          { label: 'Pending Commission', count: formatPrice(stats.pendingCommission || 0), icon: DollarSign, color: 'text-amber-600', href: '/admin/bookings' },
        ].map(s => (
          <Link key={s.label} href={s.href} className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <s.icon className={`h-5 w-5 ${s.color}`} />
              <span className={`text-2xl font-heading font-bold ${s.color}`}>{s.count}</span>
            </div>
            <p className="text-xs text-slate-500 uppercase tracking-wider">{s.label}</p>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
        {[
          { label: 'Import Property', href: '/admin/import', icon: Download, color: 'bg-indigo-500' },
          { label: 'Review Submissions', href: '/admin/approvals', icon: AlertTriangle, color: 'bg-amber-500' },
          { label: 'All Bookings', href: '/admin/bookings', icon: ShoppingBag, color: 'bg-purple-500' },
          { label: 'Manage Taxis', href: '/admin/taxis', icon: Car, color: 'bg-blue-500' },
          { label: 'Manage Treks', href: '/admin/treks', icon: Mountain, color: 'bg-green-500' },
          { label: 'Paragliding', href: '/admin/paragliding', icon: Wind, color: 'bg-sky-500' },
        ].map(a => (
          <Link key={a.label} href={a.href} className={`${a.color} text-white rounded-xl p-4 hover:opacity-90 transition-opacity flex items-center gap-3`}>
            <a.icon className="h-5 w-5" /><span className="font-semibold text-sm">{a.label}</span>
          </Link>
        ))}
      </div>

      {/* Pending + Recent Bookings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-lg font-heading font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-500" /> Pending Submissions ({pending.length})
          </h2>
          {pending.length === 0 ? <p className="text-sm text-slate-500">No pending submissions.</p> : (
            <div className="space-y-3">
              {pending.slice(0, 5).map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">{p.name || 'Untitled'}</p>
                    <p className="text-xs text-slate-500 capitalize">{p.type} . {p.destination_slug?.replace(/-/g, ' ')}</p>
                  </div>
                  <Link href={`/admin/approvals/${p.id}`} className="text-xs font-medium text-amber-700 hover:text-amber-900 px-3 py-1.5 border border-amber-300 rounded-lg flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> Review</Link>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-lg font-heading font-bold text-slate-900 mb-4 flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-purple-500" /> Recent Bookings
          </h2>
          {recentBookings.length === 0 ? <p className="text-sm text-slate-500">No bookings yet.</p> : (
            <div className="space-y-3">
              {recentBookings.slice(0, 5).map(b => (
                <div key={b.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium text-slate-900 text-sm">{b.guest_name} . <span className="font-mono text-xs text-brand-600">{b.booking_ref}</span></p>
                    <p className="text-xs text-slate-500 capitalize">{b.category} . {formatPrice(b.amount)} . {statusLabel(b.payment_method)}</p>
                  </div>
                  <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', STATUS_COLORS[b.status])}>{statusLabel(b.status)}</span>
                </div>
              ))}
            </div>
          )}
          <Link href="/admin/bookings" className="block text-center text-sm text-brand-600 font-medium mt-4 hover:text-brand-700">View All Bookings -></Link>
        </div>
      </div>

      {/* Management links */}
      <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/admin/properties" className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md text-center"><Building className="h-6 w-6 text-brand-600 mx-auto mb-2" /><p className="font-semibold text-sm">All Properties</p></Link>
        <Link href="/admin/inquiries" className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md text-center"><MessageSquare className="h-6 w-6 text-purple-600 mx-auto mb-2" /><p className="font-semibold text-sm">Inquiries</p></Link>
        <Link href="/admin/guides" className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md text-center"><Users className="h-6 w-6 text-green-600 mx-auto mb-2" /><p className="font-semibold text-sm">Guides</p></Link>
        <Link href="/admin/taxis" className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md text-center"><Car className="h-6 w-6 text-blue-600 mx-auto mb-2" /><p className="font-semibold text-sm">Taxi Routes</p></Link>
      </div>
    </div>
  );
}
