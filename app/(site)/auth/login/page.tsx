'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogIn, Loader2, Mail, Lock, AlertCircle, MailCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function UserLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // Set when the email + password were correct but the email isn't confirmed yet
  const [unconfirmed, setUnconfirmed] = useState(false);
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [resendError, setResendError] = useState('');

  // Arriving from the confirmation link signs the user in; send them on.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace('/account');
    });
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (err) {
      // Supabase only reports this after the password has been checked,
      // so the credentials are right — the email just needs confirming.
      if (err.code === 'email_not_confirmed') {
        setUnconfirmed(true); setResendState('idle'); setResendError('');
      } else {
        setError(err.message);
      }
      setLoading(false); return;
    }
    router.push('/account');
  }

  async function resendConfirmation() {
    setResendState('sending'); setResendError('');
    const { error: err } = await supabase.auth.resend({
      type: 'signup', email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/login` },
    });
    if (err) { setResendError(err.message); setResendState('idle'); return; }
    setResendState('sent');
  }

  if (unconfirmed) return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md text-center">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4"><MailCheck className="h-8 w-8 text-amber-600" /></div>
        <h1 className="text-2xl font-heading font-bold text-slate-900 mb-2">Confirm your email first</h1>
        <p className="text-slate-600 mb-2">Your email and password are correct, but your email address hasn&apos;t been confirmed yet.</p>
        <p className="text-slate-600 mb-6">We sent a confirmation link to <strong>{email.trim()}</strong>. Click it to access your account. Check your spam folder if you can&apos;t find it.</p>
        {resendError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl mb-4">{resendError}</p>}
        {resendState === 'sent' && <p className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-xl mb-4">A new confirmation email is on its way.</p>}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button type="button" onClick={resendConfirmation} disabled={resendState !== 'idle'} className="bg-brand-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-brand-700 disabled:opacity-50">
            {resendState === 'sending' ? 'Sending...' : resendState === 'sent' ? 'Email Sent' : 'Resend Confirmation Email'}
          </button>
          <button type="button" onClick={() => setUnconfirmed(false)} className="border border-slate-300 text-slate-700 px-6 py-3 rounded-xl font-semibold hover:bg-slate-50">
            Back to Sign In
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-heading font-bold text-slate-900">Welcome Back</h1>
          <p className="text-slate-600 mt-1">Sign in to view your bookings</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com"
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Your password"
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
          </div>
          {error && <div className="flex items-center gap-2 text-red-600 text-sm"><AlertCircle className="h-4 w-4" />{error}</div>}
          <button type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-brand-600 text-white py-3 rounded-xl font-semibold hover:bg-brand-700 disabled:opacity-50">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />} Sign In
          </button>
        </form>
        <p className="text-center text-sm text-slate-500 mt-4">
          {"Don't have an account? "}<Link href="/auth/register" className="text-brand-600 font-medium hover:text-brand-700">Sign up</Link>
        </p>
        <p className="text-center text-sm text-slate-500 mt-2">
          <Link href="/partner/login" className="text-slate-400 hover:text-slate-600">Hotel partner login</Link>
        </p>
      </div>
    </div>
  );
}
