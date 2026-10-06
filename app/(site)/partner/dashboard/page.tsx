'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building, Plus, Eye, Clock, CheckCircle, XCircle, AlertCircle, LogOut, ShoppingBag, DollarSign, Bell, BarChart3, Star } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatPrice, formatDateTime, statusLabel, STATUS_COLORS, cn } from '@/lib/utils';

export default function PartnerDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [properties, setProperties] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'properties' | 'bookings' | 'commission'>('properties');

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/partner/login'); return; }
      setUser(user);

      const { data: props } = await supabase.from('properties').select('*').eq('owner_id', user.id).order('created_at', { ascending: false });
      setProperties(props || []);

      // Fetch bookings for this partner's properties
      const propIds = (props || []).map((p: any) => p.id);
      if (propIds.length > 0) {
        const { data: books } = await supabase.from('bookings').select('*').in('property_id', propIds).order('created_at', { ascending: false }).limit(50);
        setBookings(books || []);
      }
      setLoading(false);
    }
    load();
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/partner/login');
  }

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" /></div>;

  const publishedCount = properties.filter(p => p.status === 'published').length;
  const pendingCount = properties.filter(p => p.status === 'pending_review').length;
  const totalBookingValue = bookings.reduce((s, b) => s + (b.amount || 0), 0);
  const commissionDue = bookings.filter(b => ['pending', 'due'].includes(b.commission_status)).reduce((s, b) => s + (b.commission_amount || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-heading font-bold text-slate-900">Partner Dashboard</h1>
          <p className="text-slate-600 text-sm">Welcome, {user?.user_metadata?.full_name || user?.email}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/partner/properties/new" className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2.5 rounded-lg font-semibold text-sm hover:bg-brand-700">
            <Plus className="h-4 w-4" /> Add Property
          </Link>
          <button onClick={handleLogout} className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-red-600"><LogOut className="h-4 w-4" /> Logout</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500 uppercase">Properties</p>
          <p className="text-2xl font-heading font-bold text-brand-600">{properties.length}</p>
          <p className="text-xs text-slate-400">{publishedCount} published · {pendingCount} pending</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500 uppercase">Bookings</p>
          <p className="text-2xl font-heading font-bold text-purple-600">{bookings.length}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500 uppercase">Total Revenue</p>
          <p className="text-2xl font-heading font-bold text-green-600">{formatPrice(totalBookingValue)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500 uppercase">Commission Due</p>
          <p className="text-2xl font-heading font-bold text-amber-600">{formatPrice(commissionDue)}</p>
          <p className="text-xs text-slate-400">Platform commission owed</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 rounded-lg p-1 max-w-md">
        {([
          { key: 'properties', label: 'Properties', icon: Building },
          { key: 'bookings', label: 'Bookings', icon: ShoppingBag },
          { key: 'commission', label: 'Commission', icon: DollarSign },
        ] as const).map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={cn('flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors flex-1 justify-center',
              activeTab === tab.key ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-600 hover:text-slate-800')}>
            <tab.icon className="h-4 w-4" />{tab.label}
          </button>
        ))}
      </div>

      {/* Properties Tab */}
      {activeTab === 'properties' && (
        <>
          {properties.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
              <Building className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h2 className="text-xl font-heading font-bold text-slate-900 mb-2">No Properties Yet</h2>
              <p className="text-slate-600 mb-6">Start by adding your first hotel, homestay, or hostel listing.</p>
              <Link href="/partner/properties/new" className="bg-brand-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-brand-700 inline-flex items-center gap-2"><Plus className="h-4 w-4" /> Add Property</Link>
            </div>
          ) : (
            <div className="space-y-4">
              {properties.map(p => (
                <div key={p.id} className="bg-white border border-slate-200 rounded-xl p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-heading font-semibold text-slate-900 truncate">{p.name || 'Untitled Property'}</h3>
                        <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full shrink-0', STATUS_COLORS[p.status])}>{statusLabel(p.status)}</span>
                        {p.featured && <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0" />}
                      </div>
                      <p className="text-xs text-slate-500 capitalize">{p.type || 'hotel'} · {p.destination_slug?.replace(/-/g, ' ')}</p>
                      {p.published_at && <p className="text-xs text-green-600 mt-1">Published: {formatDateTime(p.published_at)}</p>}

                      {/* Completeness check */}
                      {p.status === 'draft' && (
                        <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                          <p className="text-xs font-medium text-amber-800 mb-1">Missing for publication:</p>
                          <div className="flex flex-wrap gap-1">
                            {!p.description && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Description</span>}
                            {(!p.images || (p.images as any[]).length === 0) && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Images</span>}
                            {(!p.rooms || (p.rooms as any[]).length === 0) && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Room types</span>}
                            {!p.address_line1 && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Address</span>}
                            {!p.cancellation_policy && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Cancellation policy</span>}
                          </div>
                        </div>
                      )}

                      {p.status === 'changes_requested' && p.admin_notes && (
                        <p className="text-sm text-orange-600 mt-2 bg-orange-50 px-3 py-1.5 rounded-lg">Admin note: {p.admin_notes}</p>
                      )}
                      {p.status === 'rejected' && p.rejection_reason && (
                        <p className="text-sm text-red-600 mt-2 bg-red-50 px-3 py-1.5 rounded-lg">Reason: {p.rejection_reason}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {(p.status === 'draft' || p.status === 'changes_requested') && (
                        <Link href={`/partner/properties/${p.id}/edit`} className="text-sm font-medium text-brand-600 hover:text-brand-700 px-3 py-1.5 border border-brand-200 rounded-lg">Edit</Link>
                      )}
                      {p.status === 'published' && p.slug && (
                        <Link href={`/hotels/${p.slug}`} className="text-sm font-medium text-green-600 hover:text-green-700 px-3 py-1.5 border border-green-200 rounded-lg flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> View</Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Bookings Tab */}
      {activeTab === 'bookings' && (
        <>
          {bookings.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
              <ShoppingBag className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h2 className="text-xl font-heading font-bold text-slate-900 mb-2">No Bookings Yet</h2>
              <p className="text-slate-600">Bookings will appear here once guests book your properties.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {bookings.map(b => (
                <div key={b.id} className="bg-white border border-slate-200 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sm font-semibold text-brand-600">{b.booking_ref}</span>
                        <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', STATUS_COLORS[b.status])}>{statusLabel(b.status)}</span>
                        <span className={cn('text-xs px-2 py-0.5 rounded-full', STATUS_COLORS[b.payment_method])}>{statusLabel(b.payment_method)}</span>
                      </div>
                      <p className="font-medium text-slate-900">{b.guest_name} · <a href={`tel:${b.guest_phone}`} className="text-brand-600">{b.guest_phone}</a></p>
                      <div className="flex gap-4 text-sm text-slate-500 mt-1">
                        {b.check_in && <span>Check-in: {b.check_in}</span>}
                        {b.check_out && <span>Check-out: {b.check_out}</span>}
                        <span>{b.num_guests} guest(s)</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{formatDateTime(b.created_at)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-slate-900">{formatPrice(b.amount)}</p>
                      {b.commission_amount > 0 && (
                        <p className="text-xs text-slate-500">
                          Commission: {formatPrice(b.commission_amount)}
                          <span className={cn('ml-1 px-1 py-0.5 rounded text-[10px] font-medium', STATUS_COLORS[b.commission_status])}>{statusLabel(b.commission_status)}</span>
                        </p>
                      )}
                    </div>
                  </div>
                  {b.special_requests && <p className="mt-2 text-sm text-slate-600 bg-slate-50 px-3 py-2 rounded-lg">{b.special_requests}</p>}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Commission Tab */}
      {activeTab === 'commission' && (
        <div>
          <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-heading font-bold text-slate-900 mb-4">Commission Summary</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-slate-50 rounded-lg p-4 text-center">
                <p className="text-sm text-slate-500">Total Commission</p>
                <p className="text-xl font-bold text-slate-900">{formatPrice(bookings.reduce((s, b) => s + (b.commission_amount || 0), 0))}</p>
              </div>
              <div className="bg-amber-50 rounded-lg p-4 text-center">
                <p className="text-sm text-amber-700">Pending / Due</p>
                <p className="text-xl font-bold text-amber-700">{formatPrice(commissionDue)}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <p className="text-sm text-green-700">Paid</p>
                <p className="text-xl font-bold text-green-700">{formatPrice(bookings.filter(b => b.commission_status === 'paid').reduce((s, b) => s + (b.commission_amount || 0), 0))}</p>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-4">Commission is calculated on offline/pay-at-hotel bookings. Platform commission rate is set per property.</p>
          </div>
          <div className="space-y-3">
            {bookings.filter(b => b.commission_amount > 0).map(b => (
              <div key={b.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <span className="font-mono text-sm text-brand-600">{b.booking_ref}</span>
                  <span className="text-sm text-slate-600 ml-2">{b.guest_name}</span>
                  <span className="text-xs text-slate-400 ml-2">{b.check_in || b.activity_date}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold">{formatPrice(b.commission_amount)}</span>
                  <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', STATUS_COLORS[b.commission_status])}>{statusLabel(b.commission_status)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
