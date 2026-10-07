'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Inbox, MessageSquare, IndianRupee, PlusCircle, CheckCircle2, ChevronRight, Eye } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatPrice, STATUS_COLORS, statusLabel, cn } from '@/lib/utils';
import { ADMIN_NAV } from '@/components/admin/AdminShell';

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
      setAdminName((profile.full_name || user.user_metadata?.full_name || '').split(' ')[0]);

      const [propRes, pendRes, bookRes, inqRes] = await Promise.all([
        supabase.from('properties').select('id, status'),
        supabase.from('properties').select('*').eq('status', 'pending_review').order('submitted_at', { ascending: false }).limit(5),
        supabase.from('bookings').select('*').order('created_at', { ascending: false }).limit(10),
        supabase.from('inquiries').select('id', { count: 'exact', head: true }).eq('status', 'new'),
      ]);

      const props = propRes.data || [];
      const books = bookRes.data || [];
      setStats({
        published: props.filter((p: any) => p.status === 'published').length,
        pendingReview: props.filter((p: any) => p.status === 'pending_review').length,
        newInquiries: inqRes.count || 0,
        pendingCommission: books.filter((b: any) => ['pending', 'due', 'overdue'].includes(b.commission_status)).reduce((s: number, b: any) => s + (b.commission_amount || 0), 0),
      });
      setPending(pendRes.data || []);
      setRecentBookings(books.slice(0, 5));
      setLoading(false);
    }
    load();
  }, [router]);

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" /></div>;

  const todo = [
    stats.pendingReview > 0 && { href: '/admin/approvals', icon: Inbox, tone: 'bg-amber-500', text: `${stats.pendingReview} new ${stats.pendingReview === 1 ? 'property is' : 'properties are'} waiting for your review`, cta: 'Review' },
    stats.newInquiries > 0 && { href: '/admin/inquiries', icon: MessageSquare, tone: 'bg-pink-500', text: `${stats.newInquiries} new ${stats.newInquiries === 1 ? 'inquiry needs' : 'inquiries need'} a reply`, cta: 'Reply' },
    stats.pendingCommission > 0 && { href: '/admin/bookings', icon: IndianRupee, tone: 'bg-violet-500', text: `${formatPrice(stats.pendingCommission)} commission still to collect`, cta: 'See bookings' },
  ].filter(Boolean) as { href: string; icon: any; tone: string; text: string; cta: string }[];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-heading font-bold text-slate-900">Hello{adminName ? `, ${adminName}` : ''}</h1>
          <p className="text-sm text-slate-500 mt-1">{stats.published} properties are live on the website.</p>
        </div>
        <Link href="/admin/import" className="inline-flex items-center gap-2 bg-emerald-600 text-white px-5 py-3 rounded-xl font-semibold text-[15px] hover:bg-emerald-700 shadow-sm self-start">
          <PlusCircle className="h-4 w-4" /> Add a property
        </Link>
      </div>

      {/* 1. To-do list */}
      <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mb-8">
        <h2 className="px-5 py-4 font-heading font-bold text-lg text-slate-900 border-b border-slate-100">Needs your attention</h2>
        {todo.length === 0 ? (
          <p className="px-5 py-5 flex items-center gap-2 text-[15px] text-green-700"><CheckCircle2 className="h-5 w-5" /> All caught up. Nothing is waiting on you.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {todo.map(t => (
              <li key={t.href}>
                <Link href={t.href} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 group">
                  <span className={cn('w-11 h-11 rounded-xl text-white flex items-center justify-center shrink-0 shadow-sm', t.tone)}><t.icon className="h-5 w-5" /></span>
                  <span className="flex-1 text-[15px] font-medium text-slate-800">{t.text}</span>
                  <span className="text-sm font-semibold text-white bg-brand-600 group-hover:bg-brand-700 px-4 py-2 rounded-lg flex items-center gap-1 whitespace-nowrap shadow-sm">{t.cta}<ChevronRight className="h-4 w-4" /></span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 2. Latest activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-heading font-bold text-lg text-slate-900">Waiting for review</h2>
            <Link href="/admin/approvals" className="text-sm text-brand-600 hover:text-brand-700">See all</Link>
          </div>
          {pending.length === 0 ? <p className="text-sm text-slate-500">Nothing to review.</p> : (
            <ul className="space-y-2">
              {pending.map(p => (
                <li key={p.id} className="flex items-center justify-between gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 text-sm truncate">{p.name || 'Untitled'}</p>
                    <p className="text-xs text-slate-500 capitalize">{p.type} · {p.destination_slug?.replace(/-/g, ' ')}</p>
                  </div>
                  <Link href={`/admin/approvals/${p.id}`} className="shrink-0 text-xs font-medium text-brand-700 px-3 py-1.5 border border-brand-200 rounded-lg flex items-center gap-1 hover:bg-brand-50"><Eye className="h-3.5 w-3.5" /> Review</Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-heading font-bold text-lg text-slate-900">Latest bookings</h2>
            <Link href="/admin/bookings" className="text-sm text-brand-600 hover:text-brand-700">See all</Link>
          </div>
          {recentBookings.length === 0 ? <p className="text-sm text-slate-500">No bookings yet.</p> : (
            <ul className="space-y-2">
              {recentBookings.map(b => (
                <li key={b.id} className="flex items-center justify-between gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 text-sm truncate">{b.guest_name}</p>
                    <p className="text-xs text-slate-500 capitalize">{b.category} · {formatPrice(b.amount)}</p>
                  </div>
                  <span className={cn('shrink-0 text-xs font-medium px-2 py-0.5 rounded-full', STATUS_COLORS[b.status])}>{statusLabel(b.status)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* 3. Plain-language map of the admin */}
      <section>
        <h2 className="font-heading font-bold text-lg text-slate-900 mb-3">Where to find things</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ADMIN_NAV.slice(1).flatMap(g => g.items).map(item => (
            <Link key={item.href} href={item.href} className="flex items-center gap-4 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-brand-300 transition">
              <span className={cn('w-12 h-12 rounded-xl text-white flex items-center justify-center shrink-0 shadow-sm', item.tone)}><item.icon className="h-6 w-6" /></span>
              <span>
                <span className="block font-semibold text-[15px] text-slate-900">{item.label}</span>
                <span className="block text-xs text-slate-500 mt-0.5">{item.hint}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
