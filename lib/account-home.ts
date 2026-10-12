/** Where "My Account" leads for each kind of account. */
export function accountHome(role: string | null | undefined): string {
  if (role === 'admin') return '/admin/dashboard';
  if (role === 'partner') return '/partner/dashboard';
  return '/account';
}
