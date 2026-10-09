'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Inbox, Building, PlusCircle, ShoppingBag, MessageSquare, Car, Mountain, Wind, Users, LogOut, ExternalLink, BadgeCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

// tone = the colour of the item's icon tile, so each section is recognisable at a glance.
type NavItem = { href: string; label: string; hint: string; icon: any; tone: string; badge?: 'review' | 'inquiries' };

// One menu for the whole admin, grouped by job so it is obvious where things live.
export const ADMIN_NAV: { title: string; items: NavItem[] }[] = [
  {
    title: 'Start here',
    items: [{ href: '/admin/dashboard', label: 'Home', hint: 'What needs your attention today', icon: Home, tone: 'bg-brand-500' }],
  },
  {
    title: 'Hotels & stays',
    items: [
      { href: '/admin/approvals', label: 'To review', hint: 'New listings from owners waiting for your OK', icon: Inbox, tone: 'bg-amber-500', badge: 'review' },
      { href: '/admin/properties', label: 'All properties', hint: 'Edit, publish, hide or delete any listing', icon: Building, tone: 'bg-sky-500' },
      { href: '/admin/import', label: 'Add a property', hint: 'Copy a hotel in from its website', icon: PlusCircle, tone: 'bg-emerald-500' },
    ],
  },
  {
    title: 'Customers',
    items: [
      { href: '/admin/bookings', label: 'Bookings', hint: 'Paid and pending bookings, commission', icon: ShoppingBag, tone: 'bg-violet-500' },
      { href: '/admin/inquiries', label: 'Inquiries', hint: 'Questions and leads from the website', icon: MessageSquare, tone: 'bg-pink-500', badge: 'inquiries' },
    ],
  },
  {
    title: 'Partners',
    items: [
      { href: '/admin/partners', label: 'Partners', hint: 'Verify paragliding, taxi and trek partners', icon: BadgeCheck, tone: 'bg-teal-500' },
    ],
  },
  {
    title: 'Tours & transport',
    items: [
      { href: '/admin/taxis', label: 'Taxi routes', hint: 'Routes and fares', icon: Car, tone: 'bg-yellow-500' },
      { href: '/admin/treks', label: 'Treks', hint: 'Trek pages and prices', icon: Mountain, tone: 'bg-green-600' },
      { href: '/admin/paragliding', label: 'Paragliding', hint: 'Flight packages', icon: Wind, tone: 'bg-cyan-500' },
      { href: '/admin/guides', label: 'Local guides', hint: 'Guide profiles', icon: Users, tone: 'bg-orange-500' },
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
    <div className="bg-slate-100 min-h-[70vh]">
      {/* Phone / tablet: a swipeable row of big button tabs */}
      <nav className="lg:hidden sticky top-0 z-30 bg-brand-950 overflow-x-auto scrollbar-hide shadow-md" aria-label="Admin menu">
        <div className="flex gap-2 px-3 py-3 w-max">
          {ADMIN_NAV.flatMap(g => g.items).map(item => {
            const n = item.badge ? counts[item.badge] : 0;
            const active = isActive(item.href);
            return (
              <Link key={item.href} href={item.href}
                className={cn('flex items-center gap-2 pl-1.5 pr-4 py-1.5 rounded-xl text-[15px] font-semibold whitespace-nowrap transition-colors',
                  active ? 'bg-white text-brand-900 shadow' : 'bg-white/10 text-white hover:bg-white/20')}>
                <span className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-white', item.tone)}><item.icon className="h-4 w-4" /></span>
                {item.label}
                {n > 0 && <span className="text-xs font-bold rounded-full px-2 py-0.5 bg-red-500 text-white">{n}</span>}
              </Link>
            );
          })}
          <button onClick={signOut} className="flex items-center gap-2 px-4 py-1.5 rounded-xl text-[15px] font-semibold text-white/80 bg-white/10 hover:bg-red-500 hover:text-white whitespace-nowrap">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </nav>

      <div className="flex">
        {/* Desktop: dark CRM-style sidebar with big button items */}
        <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-brand-950 text-white sticky top-0 h-screen overflow-y-auto">
          <div className="px-5 py-3 border-b border-white/10">
            <p className="font-heading font-bold">Admin panel <span className="font-normal text-sm text-white/50">· Dharamshala Stay</span></p>
          </div>
          <nav className="flex-1 px-3 py-3 space-y-3" aria-label="Admin menu">
            {ADMIN_NAV.map(group => (
              <div key={group.title}>
                <p className="px-2 mb-1 text-[11px] font-semibold uppercase tracking-wider text-white/40">{group.title}</p>
                <div className="space-y-1">
                  {group.items.map(item => {
                    const n = item.badge ? counts[item.badge] : 0;
                    const active = isActive(item.href);
                    return (
                      <Link key={item.href} href={item.href} title={item.hint}
                        className={cn('flex items-center gap-2.5 p-1.5 pr-3 rounded-lg text-sm font-medium transition-all',
                          active ? 'bg-white text-brand-900 font-semibold shadow-lg' : 'text-white/85 hover:bg-white/10 hover:text-white')}>
                        <span className={cn('w-7 h-7 rounded-md flex items-center justify-center text-white shrink-0 shadow-sm', item.tone)}>
                          <item.icon className="h-4 w-4" />
                        </span>
                        <span className="flex-1">{item.label}</span>
                        {n > 0 && <span className="text-xs font-bold rounded-full min-w-[24px] text-center px-2 py-0.5 bg-red-500 text-white">{n}</span>}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
          <div className="px-3 py-2.5 border-t border-white/10 grid grid-cols-2 gap-1.5">
            <Link href="/" target="_blank" className="flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium text-white/80 bg-white/10 hover:bg-white/20 hover:text-white">
              <ExternalLink className="h-3.5 w-3.5" /> View website
            </Link>
            <button onClick={signOut} className="flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium text-white/80 bg-white/10 hover:bg-red-500 hover:text-white">
              <LogOut className="h-3.5 w-3.5" /> Sign out
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
