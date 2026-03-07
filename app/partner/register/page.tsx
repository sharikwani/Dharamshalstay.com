'use client';
import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { Building, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function PartnerRegister() {
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setLoading(true); setError('');
    const fd = new FormData(e.currentTarget);
    const email = fd.get('email') as string;
    const password = fd.get('password') as string;
    const full_name = fd.get('full_name') as string;
    const phone = fd.get('phone') as string;
    const business_name = fd.get('business_name') as string;

    const { error: err } = await supabase.auth.signUp({
      email, password,
      options: { data: { role: 'partner', full_name, phone, business_name } },
    });

    if (err) { setError(err.message); setLoading(false); return; }
    setSuccess(true); setLoading(false);
  }

  if (success) return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"><Building className="h-8 w-8 text-green-600" /></div>
        <h1 className="text-2xl font-heading font-bold text-slate-900 mb-2">Registration Successful!</h1>
        <p className="text-slate-600 mb-6">Please check your email to verify your account. Once verified, you can log in and start adding your property.</p>
        <Link href="/partner/login" className="bg-brand-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-brand-700 transition-colors inline-block">Go to Login</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <Building className="h-10 w-10 text-brand-600 mx-auto mb-3" />
          <h1 className="text-2xl font-heading font-bold text-slate-900 mb-1">List Your Property</h1>
          <p className="text-slate-600">Create a partner account to list your hotel, homestay, or hostel on Dharamshala Stay.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-4 shadow-sm">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
            <input name="full_name" required className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" placeholder="Your full name" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Business / Property Name *</label>
            <input name="business_name" required className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" placeholder="e.g. Mountain View Homestay" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number *</label>
            <input name="phone" type="tel" required className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" placeholder="+91 98057 00665" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
            <input name="email" type="email" required className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" placeholder="you@example.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password *</label>
            <div className="relative">
              <input name="password" type={showPw ? 'text' : 'password'} required minLength={8} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none pr-10" placeholder="Min 8 characters" />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" onClick={() => setShowPw(!showPw)}>{showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
            </div>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <button type="submit" disabled={loading} className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-60">
            {loading ? 'Creating Account...' : 'Create Partner Account'}
          </button>

          <p className="text-sm text-center text-slate-500">
            Already have an account? <Link href="/partner/login" className="text-brand-600 font-medium hover:underline">Log in</Link>
          </p>
        </form>

        <div className="mt-6 text-center text-xs text-slate-400">
          <p>By registering, you agree to our <Link href="/terms" className="underline">Terms</Link> and <Link href="/privacy" className="underline">Privacy Policy</Link>.</p>
        </div>
      </div>
    </div>
  );
}

