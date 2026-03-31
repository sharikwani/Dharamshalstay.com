'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X, Mountain, User, LogIn, UserCircle } from 'lucide-react';
import { NAV_LINKS, siteConfig } from '@/lib/config';
import { supabase } from '@/lib/supabase';

export default function Header() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });
    return () => { listener.subscription.unsubscribe(); };
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-brand-900 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 group">
            <Mountain className="h-7 w-7 text-orange-500" />
            <div className="leading-tight">
              <span className="text-lg font-heading font-bold tracking-tight">Dharamshala Stay</span>
              <span className="text-[10px] uppercase tracking-widest text-blue-300 hidden sm:block">Local Travel Experts</span>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-1">
            {NAV_LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="px-3 py-2 text-sm font-medium text-blue-100 hover:text-white hover:bg-white/10 rounded-lg transition-colors">{l.label}</Link>
            ))}
          </nav>

          <div className="hidden lg:flex items-center gap-3">
            <Link href="/partner/login" className="text-sm text-blue-200 hover:text-white transition-colors">
              List Your Property
            </Link>
            {user ? (
              <Link href="/account" className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors">
                <UserCircle className="h-4 w-4" /> My Account
              </Link>
            ) : (
              <Link href="/auth/login" className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors">
                <LogIn className="h-4 w-4" /> Login
              </Link>
            )}
            <Link href="/contact" className="bg-orange-500 text-white px-4 py-2 text-sm font-semibold rounded-lg hover:bg-orange-600 transition-colors">
              Enquire Now
            </Link>
          </div>

          <button className="lg:hidden p-2 text-white" onClick={() => setOpen(!open)}>
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="lg:hidden bg-brand-950 border-t border-white/10">
          <nav className="max-w-7xl mx-auto px-4 py-3 space-y-1">
            {NAV_LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="block px-3 py-2.5 text-base text-blue-100 hover:text-white hover:bg-white/10 rounded-lg" onClick={() => setOpen(false)}>{l.label}</Link>
            ))}
            <div className="pt-3 border-t border-white/10 space-y-2">
              {user ? (
                <Link href="/account" className="block px-3 py-2.5 text-blue-100 hover:text-white flex items-center gap-2" onClick={() => setOpen(false)}>
                  <UserCircle className="h-4 w-4" /> My Account
                </Link>
              ) : (
                <Link href="/auth/login" className="block px-3 py-2.5 text-blue-100 hover:text-white flex items-center gap-2" onClick={() => setOpen(false)}>
                  <LogIn className="h-4 w-4" /> Login / Sign Up
                </Link>
              )}
              <Link href="/partner/login" className="block px-3 py-2.5 text-blue-200 hover:text-white" onClick={() => setOpen(false)}>List Your Property</Link>
              <Link href="/contact" className="block bg-orange-500 text-white px-4 py-3 text-center font-semibold rounded-lg" onClick={() => setOpen(false)}>Enquire Now</Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
