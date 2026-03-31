'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserPlus, Loader2, Mail, Lock, User, Phone, AlertCircle, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function UserRegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const u = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true); setError('');

    const { data, error: signUpErr } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { full_name: form.name, phone: form.phone } },
    });

    if (signUpErr) { setError(signUpErr.message); setLoading(false); return; }

    // Create profile with role 'user'
    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        full_name: form.name,
        phone: form.phone,
        email: form.email,
        role: 'user',
      });
    }

    router.push('/account');
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-heading font-bold text-slate-900">Create Account</h1>
          <p className="text-slate-600 mt-1">Sign up to book hotels and track your trips</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input type="text" value={form.name} onChange={e => u('name', e.target.value)} required placeholder="Your name"
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input type="email" value={form.email} onChange={e => u('email', e.target.value)} required placeholder="you@example.com"
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Phone</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input type="tel" value={form.phone} onChange={e => u('phone', e.target.value)} required placeholder="+91 98765 43210"
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input type="password" value={form.password} onChange={e => u('password', e.target.value)} required placeholder="Min 6 characters"
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
          </div>
          {error && <div className="flex items-center gap-2 text-red-600 text-sm"><AlertCircle className="h-4 w-4" />{error}</div>}
          <button type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-brand-600 text-white py-3 rounded-xl font-semibold hover:bg-brand-700 disabled:opacity-50">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} Create Account
          </button>
        </form>
        <p className="text-center text-sm text-slate-500 mt-4">
          Already have an account? <Link href="/auth/login" className="text-brand-600 font-medium hover:text-brand-700">Sign in</Link>
        </p>
        <div className="flex items-start gap-2 mt-4 text-xs text-slate-400">
          <Check className="h-3.5 w-3.5 mt-0.5 shrink-0 text-green-500" />
          <span>By signing up, you agree to our <Link href="/terms" className="underline">Terms</Link> and <Link href="/privacy" className="underline">Privacy Policy</Link></span>
        </div>
      </div>
    </div>
  );
}
