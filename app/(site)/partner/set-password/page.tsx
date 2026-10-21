'use client';
import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { KeyRound, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

/** Choose a password from the one-time link we email (new partner accounts and "Forgot password?"). */
export default function SetPassword() {
  const router = useRouter();
  const [stage, setStage] = useState<'checking' | 'ready' | 'bad' | 'saving'>('checking');
  const [error, setError] = useState('');

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const token_hash = q.get('token_hash');
    if (!token_hash) { setStage('bad'); return; }
    // Remove the token from the address bar so it is not kept in history or shared by accident.
    window.history.replaceState(null, '', '/partner/set-password');
    supabase.auth.verifyOtp({ token_hash, type: 'recovery' }).then(({ error: err }) => setStage(err ? 'bad' : 'ready'));
  }, []);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get('password') || '');
    if (password.length < 8) { setError('Use at least 8 characters.'); return; }
    if (password !== fd.get('confirm')) { setError('The two passwords do not match.'); return; }
    setStage('saving'); setError('');
    const { error: err } = await supabase.auth.updateUser({ password });
    if (err) { setError(err.message); setStage('ready'); return; }
    router.replace('/partner/dashboard');
  }

  const field = 'w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none';
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="w-12 h-12 bg-brand-50 rounded-full flex items-center justify-center mb-3"><KeyRound className="h-6 w-6 text-brand-700" /></div>
        <h1 className="text-2xl font-heading font-bold text-slate-900 mb-1">Choose your password</h1>
        {stage === 'checking' && <p className="flex items-center gap-2 text-slate-600"><Loader2 className="h-4 w-4 animate-spin" />Checking your link…</p>}
        {stage === 'bad' && (
          <p className="text-slate-600">This link has expired or was already used. <Link href="/partner/login?forgot=1" className="text-brand-600 font-medium underline">Send me a new link</Link>.</p>
        )}
        {(stage === 'ready' || stage === 'saving') && (
          <form onSubmit={submit} className="space-y-3 mt-3">
            <input name="password" type="password" autoComplete="new-password" required placeholder="New password (8+ characters)" className={field} />
            <input name="confirm" type="password" autoComplete="new-password" required placeholder="Type it again" className={field} />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button disabled={stage === 'saving'} className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-2.5 rounded-lg disabled:opacity-60">{stage === 'saving' ? 'Saving…' : 'Save password and continue'}</button>
          </form>
        )}
      </div>
    </div>
  );
}
