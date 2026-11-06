'use client';
import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Shield } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const SLOW = 'Sign-in did not get a reply in time. Check your internet and try again. If it keeps happening, close other admin tabs and reload this page.';

export default function AdminLogin() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Already signed in as admin (e.g. a second tab): go straight to the dashboard.
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return;
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.session.user.id).single();
      if (profile?.role === 'admin') router.replace('/admin/dashboard');
    }).catch(() => {});
  }, [router]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setLoading(true); setError('');
    const fd = new FormData(e.currentTarget);
    try {
      const { data, error: err } = await supabase.auth.signInWithPassword({
        email: (fd.get('email') as string).trim(), password: fd.get('password') as string,
      });
      if (err) {
        setError(/fetch|network|abort|timeout/i.test(err.message) ? SLOW : err.message);
        setLoading(false); return;
      }
      // Check admin role
      const { data: profile, error: profileErr } = await supabase.from('profiles').select('role').eq('id', data.user?.id).single();
      if (profileErr && profileErr.code !== 'PGRST116') { setError(SLOW); setLoading(false); return; }
      if (profile?.role !== 'admin') { setError('Access denied. Admin accounts only.'); await supabase.auth.signOut(); setLoading(false); return; }
      router.push('/admin/dashboard');
    } catch {
      setError(SLOW); setLoading(false);
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Shield className="h-10 w-10 text-brand-600 mx-auto mb-3" />
          <h1 className="text-2xl font-heading font-bold text-slate-900 mb-1">Admin Portal</h1>
          <p className="text-slate-600">Sign in to manage the platform.</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-4 shadow-sm">
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Email</label><input name="email" type="email" required className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" /></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Password</label><input name="password" type="password" required className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" /></div>
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <button type="submit" disabled={loading} className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 rounded-lg disabled:opacity-60">{loading ? 'Signing in...' : 'Sign In'}</button>
        </form>
      </div>
    </div>
  );
}
