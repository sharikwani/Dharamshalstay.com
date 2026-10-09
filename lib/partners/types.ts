export const ACTIVITY_PARTNER_TYPES = ['paragliding', 'taxi', 'trek'] as const;
export type ActivityPartnerType = (typeof ACTIVITY_PARTNER_TYPES)[number];
export const PARTNER_TYPES = ['hotel', ...ACTIVITY_PARTNER_TYPES] as const;
export type PartnerType = (typeof PARTNER_TYPES)[number];

export type PartnerStatus = 'onboarding' | 'pending_verification' | 'verified' | 'changes_requested' | 'suspended' | 'rejected';
export const EDITABLE_STATUSES: PartnerStatus[] = ['onboarding', 'changes_requested'];

export const PARTNER_TYPE_LABELS: Record<PartnerType, string> = {
  hotel: 'Hotel, homestay or hostel', paragliding: 'Paragliding operator', taxi: 'Taxi driver or taxi operator', trek: 'Trek company or travel agency',
};

export const DOC_TYPES = [
  'aadhaar_front', 'aadhaar_back', 'pan', 'tourism_registration', 'driving_licence',
  'pilot_licence', 'vehicle_rc', 'vehicle_permit', 'vehicle_insurance', 'other',
] as const;
export type DocType = (typeof DOC_TYPES)[number];

export const DOC_LABELS: Record<DocType, string> = {
  aadhaar_front: 'Aadhaar card — front (masked)',
  aadhaar_back: 'Aadhaar card — back',
  pan: 'PAN card',
  tourism_registration: 'Himachal tourism department registration',
  driving_licence: 'Driving licence',
  pilot_licence: 'Paragliding pilot licence / certificate',
  vehicle_rc: 'Vehicle registration certificate (RC)',
  vehicle_permit: 'Commercial (taxi) permit',
  vehicle_insurance: 'Vehicle insurance',
  other: 'Other document',
};

const STAFF_DOCS: DocType[] = ['driving_licence', 'pilot_licence'];
const VEHICLE_DOCS: DocType[] = ['vehicle_rc', 'vehicle_permit', 'vehicle_insurance'];
export function docTarget(doc: DocType): 'partner' | 'staff' | 'vehicle' {
  if (STAFF_DOCS.includes(doc)) return 'staff';
  if (VEHICLE_DOCS.includes(doc)) return 'vehicle';
  return 'partner';
}

export const STAFF_ROLES = ['driver', 'pilot', 'guide'] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];
export const VEHICLE_TYPES = ['sedan', 'suv', 'innova', 'tempo', 'bus'] as const;
export type VehicleType = (typeof VEHICLE_TYPES)[number];
