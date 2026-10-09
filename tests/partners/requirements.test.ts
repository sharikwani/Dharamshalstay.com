import { describe, it, expect } from 'vitest';
import { missingItems, readyToSign, latestDocs, type OnboardingInput } from '@/lib/partners/requirements';

const doc = (doc_type: any, extra: Partial<{ status: string; staff_id: string; vehicle_id: string; created_at: string }> = {}) =>
  ({ doc_type, status: 'pending', staff_id: null, vehicle_id: null, created_at: '2026-10-09T10:00:00Z', ...extra });

const base = (over: Partial<OnboardingInput> = {}): OnboardingInput => ({
  partner_type: 'trek', legal_name: 'Ravi Kumar', phone: '9816000000', pan_number: 'ABCDE1234F',
  payout_method: 'upi', payout_details: { upi_id: 'ravi@okhdfcbank', account_holder: 'Ravi Kumar' },
  documents: [doc('aadhaar_front'), doc('aadhaar_back'), doc('pan'), doc('tourism_registration')],
  staff: [], vehicles: [], agreementSigned: false, ...over,
});
const keys = (s: OnboardingInput) => missingItems(s).map((m) => m.key);

describe('missingItems', () => {
  it('a complete trek agency only needs to sign', () => {
    expect(keys(base())).toEqual(['agreement']);
    expect(readyToSign(base())).toBe(true);
  });
  it('lists missing business, payout and documents', () => {
    const k = keys(base({ legal_name: '', payout_method: null, pan_number: null, documents: [] }));
    expect(k).toEqual(expect.arrayContaining(['legal_name', 'pan_number', 'payout', 'doc:aadhaar_front', 'doc:aadhaar_back', 'doc:pan', 'doc:tourism_registration']));
    expect(readyToSign(base({ documents: [] }))).toBe(false);
  });
  it('rejected document counts as missing until re-uploaded', () => {
    const rejected = base({ documents: [doc('aadhaar_front', { status: 'rejected' }), doc('aadhaar_back'), doc('pan'), doc('tourism_registration')] });
    expect(keys(rejected)).toContain('doc:aadhaar_front');
    const reuploaded = base({ documents: [...rejected.documents, doc('aadhaar_front', { created_at: '2026-10-10T10:00:00Z' })] });
    expect(keys(reuploaded)).not.toContain('doc:aadhaar_front');
  });
  it('taxi needs a vehicle with RC, permit, insurance and a driver with licence', () => {
    const t = base({ partner_type: 'taxi', documents: [doc('aadhaar_front'), doc('aadhaar_back'), doc('pan')] });
    expect(keys(t)).toEqual(expect.arrayContaining(['vehicle', 'driver']));
    expect(keys(t)).not.toContain('doc:tourism_registration');
    const withFleet = base({
      partner_type: 'taxi',
      vehicles: [{ id: 'v1', registration_no: 'HP39A1234', active: true }],
      staff: [{ id: 's1', role: 'driver', full_name: 'Sonu', active: true }],
      documents: [doc('aadhaar_front'), doc('aadhaar_back'), doc('pan'), doc('vehicle_rc', { vehicle_id: 'v1' }), doc('driving_licence', { staff_id: 's1' })],
    });
    expect(keys(withFleet)).toEqual(['vehicle_doc:v1:vehicle_permit', 'vehicle_doc:v1:vehicle_insurance', 'agreement']);
  });
  it('paragliding needs registration and a pilot with licence', () => {
    const p = base({ partner_type: 'paragliding', staff: [{ id: 'p1', role: 'pilot', full_name: 'Amit', active: true }] });
    expect(keys(p)).toEqual(['staff_doc:p1:pilot_licence', 'agreement']);
  });
  it('signed agreement removes the agreement item', () => {
    expect(keys(base({ agreementSigned: true }))).toEqual([]);
  });
});

describe('latestDocs', () => {
  it('keeps only the newest document per slot', () => {
    const out = latestDocs([doc('pan', { created_at: '2026-01-01T00:00:00Z' }), doc('pan', { created_at: '2026-02-01T00:00:00Z' })]);
    expect(out).toHaveLength(1);
    expect(out[0].created_at).toBe('2026-02-01T00:00:00Z');
  });
});
