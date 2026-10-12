import { describe, expect, it } from 'vitest';
import { accountHome } from '@/lib/account-home';

describe('accountHome', () => {
  it('sends each role to its own area', () => {
    expect(accountHome('admin')).toBe('/admin/dashboard');
    expect(accountHome('partner')).toBe('/partner/dashboard');
    expect(accountHome('user')).toBe('/account');
    expect(accountHome(null)).toBe('/account');
  });
});
