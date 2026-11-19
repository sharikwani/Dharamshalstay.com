import { describe, expect, it } from 'vitest';
import { isPhoneLoginEmail, loginEmailFor, phoneLoginEmail } from '@/lib/partners/phone-login';

describe('phone login', () => {
  it('turns Indian mobile numbers in any format into the stand-in address', () => {
    const want = '919711900435@phone.dharamshalastay.com';
    expect(phoneLoginEmail('+91 97119 00435')).toBe(want);
    expect(phoneLoginEmail('9711900435')).toBe(want);
    expect(phoneLoginEmail('09711900435')).toBe(want);
    expect(phoneLoginEmail('919711900435')).toBe(want);
  });
  it('rejects things that are not phone numbers', () => {
    expect(phoneLoginEmail('12345')).toBeNull();
    expect(phoneLoginEmail('')).toBeNull();
  });
  it('leaves emails alone at login', () => {
    expect(loginEmailFor(' owner@hotel.com ')).toBe('owner@hotel.com');
    expect(loginEmailFor('97119 00435')).toBe('919711900435@phone.dharamshalastay.com');
  });
  it('spots stand-in addresses', () => {
    expect(isPhoneLoginEmail('919711900435@PHONE.dharamshalastay.com')).toBe(true);
    expect(isPhoneLoginEmail('owner@dharamshalastay.com')).toBe(false);
    expect(isPhoneLoginEmail(null)).toBe(false);
  });
});
