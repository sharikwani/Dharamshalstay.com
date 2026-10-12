import { describe, it, expect } from 'vitest';
import { isPan, isIfsc, isUpi, isAccountNumber, normalizeVehicleReg, checkUpload, namesMatch, MAX_UPLOAD_BYTES } from '@/lib/partners/validate';
import { docTarget } from '@/lib/partners/types';

describe('identity and bank formats', () => {
  it('PAN', () => { expect(isPan('ABCDE1234F')).toBe(true); expect(isPan('abcde1234f')).toBe(true); expect(isPan('ABCD1234F')).toBe(false); });
  it('IFSC', () => { expect(isIfsc('SBIN0001234')).toBe(true); expect(isIfsc('SBIN1001234')).toBe(false); });
  it('UPI', () => { expect(isUpi('ravi.kumar@okhdfcbank')).toBe(true); expect(isUpi('no-at-sign')).toBe(false); });
  it('account number', () => { expect(isAccountNumber('123456789012')).toBe(true); expect(isAccountNumber('12ab')).toBe(false); });
});

describe('vehicle registration', () => {
  it('normalizes spacing and case', () => expect(normalizeVehicleReg(' hp 39 a 1234 ')).toBe('HP39A1234'));
  it('accepts BH series', () => expect(normalizeVehicleReg('22 BH 1234 AA')).toBe('22BH1234AA'));
  it('rejects junk', () => expect(normalizeVehicleReg('hello')).toBeNull());
});

describe('checkUpload', () => {
  it('accepts a small jpg/png/pdf', () => {
    expect(checkUpload({ type: 'image/jpeg', size: 1000 })).toBeNull();
    expect(checkUpload({ type: 'application/pdf', size: 1000 })).toBeNull();
  });
  it('rejects other types and big files', () => {
    expect(checkUpload({ type: 'image/gif', size: 10 })).toMatch(/JPG, PNG or PDF/);
    expect(checkUpload({ type: 'image/png', size: MAX_UPLOAD_BYTES + 1 })).toMatch(/4 MB/);
  });
  it('checks the file really is the declared type when the first bytes are given', () => {
    const jpg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1]);
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d]);
    const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);
    expect(checkUpload({ type: 'image/jpeg', size: 5, head: jpg })).toBeNull();
    expect(checkUpload({ type: 'image/png', size: 5, head: png })).toBeNull();
    expect(checkUpload({ type: 'application/pdf', size: 5, head: pdf })).toBeNull();
    expect(checkUpload({ type: 'image/jpeg', size: 5, head: pdf })).toMatch(/does not look like/);
    expect(checkUpload({ type: 'application/pdf', size: 5, head: png })).toMatch(/does not look like/);
    expect(checkUpload({ type: 'image/png', size: 2, head: new Uint8Array([0x89, 0x50]) })).toMatch(/does not look like/);
  });
});

describe('namesMatch', () => {
  it('ignores case and extra spaces', () => expect(namesMatch('  Ravi  Kumar ', 'ravi kumar')).toBe(true));
  it('rejects a different name', () => expect(namesMatch('Ravi Kumar', 'Ravi Sharma')).toBe(false));
  it('rejects empty', () => expect(namesMatch('', '')).toBe(false));
});

describe('docTarget', () => {
  it('routes documents to their owner', () => {
    expect(docTarget('pan')).toBe('partner');
    expect(docTarget('driving_licence')).toBe('staff');
    expect(docTarget('vehicle_rc')).toBe('vehicle');
  });
});
