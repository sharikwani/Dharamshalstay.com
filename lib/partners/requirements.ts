import { DOC_LABELS, type ActivityPartnerType, type DocType } from './types';

export type OnboardingInput = {
  partner_type: ActivityPartnerType;
  legal_name: string | null;
  phone: string | null;
  pan_number: string | null;
  payout_method: 'bank' | 'upi' | null;
  payout_details: Record<string, string> | null;
  documents: { doc_type: DocType; status: string; staff_id: string | null; vehicle_id: string | null; created_at: string }[];
  staff: { id: string; role: string; full_name: string; active: boolean }[];
  vehicles: { id: string; registration_no: string; active: boolean }[];
  agreementSigned: boolean;
};
export type Missing = { key: string; label: string };

const slot = (d: { doc_type: string; staff_id: string | null; vehicle_id: string | null }) => `${d.doc_type}|${d.staff_id || ''}|${d.vehicle_id || ''}`;

/** Newest document for each (type, staff, vehicle) slot. */
export function latestDocs<T extends { doc_type: string; staff_id: string | null; vehicle_id: string | null; created_at: string }>(docs: T[]): T[] {
  const best = new Map<string, T>();
  for (const d of docs) {
    const cur = best.get(slot(d));
    if (!cur || d.created_at > cur.created_at) best.set(slot(d), d);
  }
  return Array.from(best.values());
}

const PARTNER_DOCS: Record<ActivityPartnerType, DocType[]> = {
  taxi: ['aadhaar_front', 'aadhaar_back', 'pan'],
  paragliding: ['aadhaar_front', 'aadhaar_back', 'pan', 'tourism_registration'],
  trek: ['aadhaar_front', 'aadhaar_back', 'pan', 'tourism_registration'],
};
const VEHICLE_DOCS: DocType[] = ['vehicle_rc', 'vehicle_permit', 'vehicle_insurance'];

function payoutComplete(method: string | null, d: Record<string, string> | null): boolean {
  if (!d || !d.account_holder) return false;
  if (method === 'upi') return !!d.upi_id;
  if (method === 'bank') return !!d.account_number && !!d.ifsc;
  return false;
}

export function missingItems(s: OnboardingInput): Missing[] {
  const out: Missing[] = [];
  const docs = latestDocs(s.documents).filter((d) => d.status !== 'rejected');
  const has = (t: DocType, by: { staff_id?: string; vehicle_id?: string } = {}) =>
    docs.some((d) => d.doc_type === t && (d.staff_id || undefined) === by.staff_id && (d.vehicle_id || undefined) === by.vehicle_id);

  if (!s.legal_name?.trim()) out.push({ key: 'legal_name', label: 'Your full legal name' });
  if (!s.phone?.trim()) out.push({ key: 'phone', label: 'Phone number' });
  if (!s.pan_number?.trim()) out.push({ key: 'pan_number', label: 'PAN number' });
  if (!payoutComplete(s.payout_method, s.payout_details)) out.push({ key: 'payout', label: 'Bank or UPI details for payouts' });

  for (const t of PARTNER_DOCS[s.partner_type]) if (!has(t)) out.push({ key: `doc:${t}`, label: DOC_LABELS[t] });

  if (s.partner_type === 'taxi') {
    const vehicles = s.vehicles.filter((v) => v.active);
    if (!vehicles.length) out.push({ key: 'vehicle', label: 'At least one vehicle' });
    for (const v of vehicles) for (const t of VEHICLE_DOCS) {
      if (!has(t, { vehicle_id: v.id })) out.push({ key: `vehicle_doc:${v.id}:${t}`, label: `${DOC_LABELS[t]} for ${v.registration_no}` });
    }
  }
  const needRole = s.partner_type === 'taxi' ? 'driver' : s.partner_type === 'paragliding' ? 'pilot' : null;
  if (needRole) {
    const licence: DocType = needRole === 'driver' ? 'driving_licence' : 'pilot_licence';
    const people = s.staff.filter((p) => p.active && p.role === needRole);
    if (!people.length) out.push({ key: needRole, label: needRole === 'driver' ? 'At least one driver' : 'At least one pilot' });
    for (const p of people) if (!has(licence, { staff_id: p.id })) out.push({ key: `staff_doc:${p.id}:${licence}`, label: `${DOC_LABELS[licence]} for ${p.full_name}` });
  }
  if (!s.agreementSigned) out.push({ key: 'agreement', label: 'Sign the partner agreement' });
  return out;
}

export function readyToSign(s: OnboardingInput): boolean {
  return missingItems(s).every((m) => m.key === 'agreement');
}
