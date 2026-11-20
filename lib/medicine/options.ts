/**
 * Emergency medicine delivery (/medicine-delivery-dharamshala, migration v57). A licensed partner chemist delivers
 * emergency medicines only, after we confirm the prescription with the doctor (owner, 20 Nov 2026).
 */

/** Areas the partner chemist delivers to (owner, 20 Nov 2026). "Other" is accepted but flagged in admin. */
export const MEDICINE_AREAS = ['Kandi', 'Dharnu', 'Dari', 'Barol', 'Shyam Nagar', 'Khaniyara', 'Other'] as const;
export type MedicineArea = (typeof MEDICINE_AREAS)[number];

/** Delivery is free 10 am - 6 pm; Rs 200 extra on every delivery 6 pm - 10 pm. Paid on delivery by UPI or cash. */
export const DELIVERY_HOURS = { freeFrom: '10 am', freeUntil: '6 pm', lateUntil: '10 pm', lateCharge: 200, payment: 'UPI or cash on delivery' } as const;

export const MEDICINE_STATUSES = ['new', 'checking', 'doctor_confirmed', 'delivered', 'rejected'] as const;
export type MedicineStatus = (typeof MEDICINE_STATUSES)[number];
export const MEDICINE_STATUS_LABELS: Record<MedicineStatus, string> = {
  new: 'New', checking: 'Checking', doctor_confirmed: 'Doctor confirmed', delivered: 'Delivered', rejected: 'Rejected',
};

export const MEDICINE_BUCKET = 'medicine-prescriptions';
export const PRESCRIPTION_MAX_BYTES = 5 * 1024 * 1024;
/** Prescriptions are health data: the file is deleted this many days after the request. */
export const PRESCRIPTION_RETENTION_DAYS = 30;
