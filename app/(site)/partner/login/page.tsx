'use client';
import { useEffect, useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building, Eye, EyeOff, MailCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function PartnerLogin() {
  const router = useRouter();
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // Set when the email + password were correct but the email isn't confirmed yet
  const [unconfirmedEmail, setUnconfirmedEmail] = useState('');
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [resendError, setResendError] = useState('');

  // Arriving from the confirmation link signs the partner in; send them on.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace('/partner/dashboard');
    });
  }, [router]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setLoading(true); setError('');
    const fd = new FormData(e.currentTarget);
    const email = (fd.get('email') as string).trim();
    const { error: err } = await supabase.auth.signInWithPassword({
      email, password: fd.get('password') as string,
    });
    if (err) {
      // Supabase only reports this after the password has been checked,
      // so the credentials are right — the email just needs confirming.
      if (err.code === 'email_not_confirmed') {
        setUnconfirmedEmail(email); setResendState('idle'); setResendError('');
      } else {
        setError(err.message);
      }
      setLoading(false); return;
    }
    router.push('/partner/dashboard');
  }

  async function resendConfirmation() {
    setResendState('sending'); setResendError('');
    const { error: err } = await supabase.auth.resend({
      type: 'signup', email: unconfirmedEmail,
      options: { emailRedirectTo: `${window.location.origin}/partner/login` },
    });
    if (err) { setResendError(err.message); setResendState('idle'); return; }
    setResendState('sent');
  }

  if (unconfirmedEmail) return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4"><MailCheck className="h-8 w-8 text-amber-600" /></div>
        <h1 className="text-2xl font-heading font-bold text-slate-900 mb-2">Confirm your email first</h1>
        <p className="text-slate-600 mb-2">Your email and password are correct, but your email address hasn't been confirmed yet.</p>
        <p className="text-slate-600 mb-6">We sent a confirmation link to <strong>{unconfirmedEmail}</strong>. Click it to access your partner account. Check your spam folder if you can't find it.</p>
        {resendError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-4">{resendError}</p>}
        {resendState === 'sent' && <p className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg mb-4">A new confirmation email is on its way.</p>}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button type="button" onClick={resendConfirmation} disabled={resendState !== 'idle'} className="bg-brand-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-brand-700 transition-colors disabled:opacity-60">
            {resendState === 'sending' ? 'Sending...' : resendState === 'sent' ? 'Email Sent' : 'Resend Confirmation Email'}
          </button>
          <button type="button" onClick={() => setUnconfirmedEmail('')} className="border border-slate-300 text-slate-700 px-6 py-3 rounded-lg font-semibold hover:bg-slate-50 transition-colors">
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );

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
