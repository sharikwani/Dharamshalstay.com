'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Inbox, Building, PlusCircle, ShoppingBag, MessageSquare, Car, Mountain, Wind, Users, LogOut, ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

type NavItem = { href: string; label: string; hint: string; icon: any; badge?: 'review' | 'inquiries' };

// One menu for the whole admin, grouped by job so it is obvious where things live.
export const ADMIN_NAV: { title: string; items: NavItem[] }[] = [
  {
    title: 'Start here',
    items: [{ href: '/admin/dashboard', label: 'Home', hint: 'What needs your attention today', icon: Home }],
  },
  {
    title: 'Hotels & stays',
    items: [
      { href: '/admin/approvals', label: 'To review', hint: 'New listings from owners waiting for your OK', icon: Inbox, badge: 'review' },
      { href: '/admin/properties', label: 'All properties', hint: 'Edit, publish, hide or delete any listing', icon: Building },
      { href: '/admin/import', label: 'Add a property', hint: 'Copy a hotel in from its website', icon: PlusCircle },
    ],
  },
  {
    title: 'Customers',
    items: [
      { href: '/admin/bookings', label: 'Bookings', hint: 'Paid and pending bookings, commission', icon: ShoppingBag },
      { href: '/admin/inquiries', label: 'Inquiries', hint: 'Questions and leads from the website', icon: MessageSquare, badge: 'inquiries' },
    ],
  },
  {
    title: 'Tours & transport',
    items: [
      { href: '/admin/taxis', label: 'Taxi routes', hint: 'Routes and fares', icon: Car },
      { href: '/admin/treks', label: 'Treks', hint: 'Trek pages and prices', icon: Mountain },
      { href: '/admin/paragliding', label: 'Paragliding', hint: 'Flight packages', icon: Wind },
      { href: '/admin/guides', label: 'Local guides', hint: 'Guide profiles', icon: Users },
    ],
  },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '';
  const router = useRouter();
  const [counts, setCounts] = useState<{ review: number; inquiries: number }>({ review: 0, inquiries: 0 });
  const isLogin = pathname.startsWith('/admin/login');

  useEffect(() => {
    if (isLogin) return;
    Promise.all([
      supabase.from('properties').select('id', { count: 'exact', head: true }).eq('status', 'pending_review'),
      supabase.from('inquiries').select('id', { count: 'exact', head: true }).eq('status', 'new'),
    ]).then(([r, i]) => setCounts({ review: r.count || 0, inquiries: i.count || 0 }));
  }, [pathname, isLogin]);

  if (isLogin) return <>{children}</>;

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');
  const signOut = async () => { await supabase.auth.signOut(); router.push('/admin/login'); };

  return (
    <div className="bg-slate-50 min-h-[70vh]">
      {/* Phone / tablet: one scrollable row of tabs */}
      <nav className="lg:hidden sticky top-0 z-30 bg-white border-b border-slate-200 overflow-x-auto scrollbar-hide" aria-label="Admin menu">
        <div className="flex gap-1 px-3 py-2 w-max">
          {ADMIN_NAV.flatMap(g => g.items).map(item => {
            const n = item.badge ? counts[item.badge] : 0;
            return (
              <Link key={item.href} href={item.href}
                className={cn('flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap',
                  isActive(item.href) ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100')}>
                <item.icon className="h-4 w-4" />{item.label}
                {n > 0 && <span className={cn('text-xs font-bold rounded-full px-1.5', isActive(item.href) ? 'bg-white/25' : 'bg-amber-100 text-amber-800')}>{n}</span>}
              </Link>
            );
          })}
          <button onClick={signOut} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-500 hover:text-red-600 whitespace-nowrap">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </nav>

      <div className="flex">
        {/* Desktop: grouped sidebar that stays put */}
        <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-slate-200 bg-white sticky top-0 h-screen overflow-y-auto">
          <div className="px-5 py-5 border-b border-slate-100">
            <p className="font-heading font-bold text-slate-900">Admin panel</p>
            <p className="text-xs text-slate-500">Dharamshala Stay</p>
          </div>
          <nav className="flex-1 px-3 py-4 space-y-5" aria-label="Admin menu">
            {ADMIN_NAV.map(group => (
              <div key={group.title}>
                <p className="px-2 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{group.title}</p>
                <div className="space-y-0.5">
                  {group.items.map(item => {
                    const n = item.badge ? counts[item.badge] : 0;
                    const active = isActive(item.href);
                    return (
                      <Link key={item.href} href={item.href} title={item.hint}
                        className={cn('flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm transition-colors',
                          active ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-slate-700 hover:bg-slate-100')}>
                        <item.icon className={cn('h-4 w-4 shrink-0', active ? 'text-brand-600' : 'text-slate-400')} />
                        <span className="flex-1">{item.label}</span>
                        {n > 0 && <span className="text-xs font-bold rounded-full px-2 py-0.5 bg-amber-100 text-amber-800">{n}</span>}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
          <div className="px-3 py-4 border-t border-slate-100 space-y-0.5">
            <Link href="/" target="_blank" className="flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100">
              <ExternalLink className="h-4 w-4 text-slate-400" /> View website
            </Link>
            <button onClick={signOut} className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm text-slate-600 hover:bg-red-50 hover:text-red-600">
              <LogOut className="h-4 w-4 text-slate-400" /> Sign out
            </button>
          </div>
        </aside>

        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}

/** Plain-language title + one-line explanation used at the top of every admin page. */
export function AdminPageHeader({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-slate-900">{title}</h1>
        <p className="text-sm text-slate-500 mt-1 max-w-2xl">{description}</p>
      </div>
      {action}
    </div>
  );
}
