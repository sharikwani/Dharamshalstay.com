'use client';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

/**
 * Accounts the team made with a temporary password carry user_metadata.must_change_password.
 * Until the partner chooses their own password, every partner page sends them to /partner/set-password.
 */
export default function PasswordChangeGate() {
  const router = useRouter();
  const path = usePathname();
  useEffect(() => {
    if (!path || path.startsWith('/partner/set-password') || path.startsWith('/partner/login') || path.startsWith('/partner/register')) return;
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user?.user_metadata?.must_change_password) router.replace('/partner/set-password?change=1');
    });
  }, [path, router]);
  return null;
}
