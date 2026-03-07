'use client';
import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function PartnerLogin() {
  const router = useRouter();
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setLoading(true); setError('');
    const fd = new FormData(e.currentTarget);
    const { error: err } = await supabase.auth.signInWithPassword({
      email: fd.get('email') as string, password: fd.get('password') as string,
    });
    if (err) { setError(err.message); setLoading(false); return; }
    router.push('/partner/dashboard');
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Building className="h-10 w-10 text-brand-600 mx-auto mb-3" />
          <h1 className="text-2xl font-heading font-bold text-slate-900 mb-1">Partner Login</h1>
          <p className="text-slate-600">Sign in to manage your property listings.</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-4 shadow-sm">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input name="email" type="email" required className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <div className="relative">
              <input name="password" type={showPw ? 'text' : 'password'} required className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none pr-10" />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" onClick={() => setShowPw(!showPw)}>{showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
            </div>
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <button type="submit" disabled={loading} className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-60">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
          <p className="text-sm text-center text-slate-500">
            Don't have an account? <Link href="/partner/register" className="text-brand-600 font-medium hover:underline">Register free</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

