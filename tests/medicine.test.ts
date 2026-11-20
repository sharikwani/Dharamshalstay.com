import { describe, expect, it } from 'vitest';
import { checkPrescriptionFile, isOutsideArea, medicineRequestSchema } from '@/lib/medicine/validate';
import { DELIVERY_HOURS, MEDICINE_AREAS } from '@/lib/medicine/options';

const valid = {
  patient_name: 'Pema Lhamo', phone: '+91 98160 12345', area: 'Kandi', address: 'Near the Kandi bus stop, house 12, upper road',
  medicines: 'Salbutamol inhaler 100 mcg', urgency: 'Asthma attack tonight, the inhaler is finished',
  doctor_name: 'Dr. Sharma', doctor_phone: '94180 00000', consent: true,
};

const head = (...b: number[]) => Uint8Array.from([...b, ...new Array(Math.max(0, 12 - b.length)).fill(0)]);

describe('medicine request form', () => {
  it('accepts a complete request and normalises both phones to 91XXXXXXXXXX', () => {
    const r = medicineRequestSchema.safeParse(valid);
    expect(r.success).toBe(true);
    if (r.success) { expect(r.data.phone).toBe('919816012345'); expect(r.data.doctor_phone).toBe('919418000000'); }
  });

  it('needs consent, a known area and the doctor details', () => {
    expect(medicineRequestSchema.safeParse({ ...valid, consent: false }).success).toBe(false);
    expect(medicineRequestSchema.safeParse({ ...valid, area: 'Goa' }).success).toBe(false);
    expect(medicineRequestSchema.safeParse({ ...valid, doctor_phone: '123' }).success).toBe(false);
  });

  it('serves the six areas the chemist covers, plus Other', () => {
    expect(MEDICINE_AREAS).toEqual(['Kandi', 'Dharnu', 'Dari', 'Barol', 'Shyam Nagar', 'Khaniyara', 'Other']);
    expect(isOutsideArea('Other')).toBe(true);
    expect(isOutsideArea('Kandi')).toBe(false);
  });

  it('states the delivery charges the owner set', () => {
    expect(DELIVERY_HOURS).toMatchObject({ freeFrom: '10 am', freeUntil: '6 pm', lateUntil: '10 pm', lateCharge: 200 });
  });
});

describe('owner alert', () => {
  it('a new request reaches the owner on WhatsApp in the default "important" mode', async () => {
    const { shouldAlert } = await import('@/lib/owner-alerts');
    expect(shouldAlert('important', 'admin_alert', 'Urgent medicine request: Kandi')).toBe(true);
  });
});

describe('prescription file check', () => {
  it('accepts a real PDF and a real JPEG', () => {
    expect(checkPrescriptionFile({ type: 'application/pdf', size: 1000, head: head(0x25, 0x50, 0x44, 0x46) })).toEqual({ ext: 'pdf', contentType: 'application/pdf' });
    expect(checkPrescriptionFile({ type: 'image/jpeg', size: 1000, head: head(0xff, 0xd8, 0xff) })).toEqual({ ext: 'jpg', contentType: 'image/jpeg' });
  });

  it('rejects a renamed file, a file over 5 MB and other types', () => {
    expect(checkPrescriptionFile({ type: 'application/pdf', size: 1000, head: head(0xff, 0xd8, 0xff) })).toHaveProperty('error');
    expect(checkPrescriptionFile({ type: 'image/jpeg', size: 6 * 1024 * 1024, head: head(0xff, 0xd8, 0xff) })).toHaveProperty('error');
    expect(checkPrescriptionFile({ type: 'text/plain', size: 10, head: head(0x41) })).toHaveProperty('error');
    expect(checkPrescriptionFile({ type: 'image/png', size: 0, head: head() })).toHaveProperty('error');
  });
});
