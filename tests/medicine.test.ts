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

describe('owner WhatsApp with the complete details', () => {
  const req = {
    patient_name: 'Pema Lhamo', phone: '919816012345', area: 'Kandi' as const, address: 'Near the Kandi bus stop, house 12, upper road',
    medicines: 'Salbutamol inhaler 100 mcg, 1', urgency: 'Asthma attack tonight, the inhaler is finished',
    doctor_name: 'Dr. Sharma', doctor_phone: '919418000000', consent: true as const,
  };
  const link = 'https://www.dharamshalastay.com/admin/medicine';

  it('puts every field in the chat message', async () => {
    const { medicineOwnerMessage } = await import('@/lib/medicine/notify');
    const m = medicineOwnerMessage(req, link);
    for (const v of ['Pema Lhamo', '+919816012345', 'Kandi', 'house 12', 'Salbutamol inhaler 100 mcg, 1', 'Asthma attack', 'Dr. Sharma', '+919418000000', link]) expect(m.text).toContain(v);
  });

  it('splits the details over template messages that fit the 300-character limit, losing nothing', async () => {
    const { medicineOwnerMessage } = await import('@/lib/medicine/notify');
    const long = { ...req, medicines: 'Paracetamol 650 mg, 10 tablets; '.repeat(20).trim(), address: 'Ward 3, near the temple, '.repeat(8).trim() };
    const m = medicineOwnerMessage(long, link);
    expect(m.templates.length).toBeGreaterThan(1);
    for (const [title, detail, l] of m.templates) {
      expect(title.length).toBeLessThanOrEqual(300);
      expect(detail.length).toBeLessThanOrEqual(300);
      expect(l).toBe(link);
    }
    const joined = m.templates.map((t) => t[1]).join(' ');
    expect(joined.replace(/\s+/g, '')).toContain(long.medicines.replace(/\s+/g, ''));
    expect(joined).toContain('+919418000000');
  });

  it('the admin email no longer sends its own (shorter) WhatsApp', async () => {
    const { shouldAlert } = await import('@/lib/owner-alerts');
    expect(shouldAlert('all', 'admin_medicine_request', 'Urgent medicine request: Kandi')).toBe(false);
  });
});

describe('30-day clean-up', () => {
  it('deletes old prescription files and clears the health details of old requests', async () => {
    const { purgeOldMedicineData } = await import('@/lib/medicine/purge');
    const calls: any = {};
    const query: any = {
      select: () => query, lt: () => query, or: () => query, limit: async () => ({ data: [{ id: 'a', prescription_path: 'a.pdf' }, { id: 'b', prescription_path: null }] }),
      update: (patch: any) => { calls.patch = patch; return { in: async (_c: string, ids: string[]) => { calls.ids = ids; return { error: null }; } }; },
    };
    const sb: any = { from: () => query, storage: { from: () => ({ remove: async (paths: string[]) => { calls.removed = paths; return { error: null }; } }) } };
    expect(await purgeOldMedicineData(sb)).toBe(2);
    expect(calls.removed).toEqual(['a.pdf']);
    expect(calls.ids).toEqual(['a', 'b']);
    expect(calls.patch).toMatchObject({ prescription_path: null, medicines: 'Deleted after 30 days', urgency: 'Deleted after 30 days' });
  });
});

describe('prescription file check', () => {
  it('stays under the 4.5 MB Vercel request limit', () => {
    expect(checkPrescriptionFile({ type: 'image/jpeg', size: 4.2 * 1024 * 1024, head: head(0xff, 0xd8, 0xff) })).toHaveProperty('error');
    expect(checkPrescriptionFile({ type: 'image/jpeg', size: 3.9 * 1024 * 1024, head: head(0xff, 0xd8, 0xff) })).toHaveProperty('ext', 'jpg');
  });

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
