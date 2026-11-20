import { z } from 'zod';
import { MEDICINE_AREAS, PRESCRIPTION_MAX_BYTES } from './options';

const phone = (msg: string) => z.string().trim().transform((v) => v.replace(/\D/g, ''))
  .refine((d) => d.length === 10 || (d.length === 12 && d.startsWith('91')), msg)
  .transform((d) => (d.length === 10 ? '91' + d : d));

export const medicineRequestSchema = z.object({
  patient_name: z.string().trim().min(2, 'Please enter the patient name').max(80),
  phone: phone('Please enter a valid Indian mobile number'),
  area: z.enum(MEDICINE_AREAS, { errorMap: () => ({ message: 'Please choose your area' }) }),
  address: z.string().trim().min(10, 'Please give the full address or a landmark').max(300),
  medicines: z.string().trim().min(3, 'Please list the medicines you need').max(1000),
  urgency: z.string().trim().min(10, 'Please tell us why it is urgent').max(600),
  doctor_name: z.string().trim().min(3, 'Please enter the doctor name').max(80),
  doctor_phone: phone('Please enter the doctor or clinic mobile number so we can confirm the prescription'),
  consent: z.literal(true, { errorMap: () => ({ message: 'Please agree that we may call your doctor to confirm the prescription' }) }),
  website: z.string().max(0).optional(), // honeypot
});
export type MedicineRequestInput = z.infer<typeof medicineRequestSchema>;

export const isOutsideArea = (area: string) => area === 'Other';

const TYPES: Record<string, { ext: 'jpg' | 'png' | 'webp' | 'pdf'; magic: (b: Uint8Array) => boolean }> = {
  'image/jpeg': { ext: 'jpg', magic: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  'image/png': { ext: 'png', magic: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  'image/webp': { ext: 'webp', magic: (b) => String.fromCharCode(b[0], b[1], b[2], b[3]) === 'RIFF' && String.fromCharCode(b[8], b[9], b[10], b[11]) === 'WEBP' },
  'application/pdf': { ext: 'pdf', magic: (b) => b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46 },
};

/** Pass the first 12 bytes as `head` so a renamed file cannot pass as a prescription. */
export function checkPrescriptionFile(f: { type: string; size: number; head: Uint8Array }): { ext: 'jpg' | 'png' | 'webp' | 'pdf'; contentType: string } | { error: string } {
  const t = Object.prototype.hasOwnProperty.call(TYPES, f.type) ? TYPES[f.type] : null;
  if (!t) return { error: 'The prescription must be a photo (JPG, PNG, WebP) or a PDF.' };
  if (f.size <= 0) return { error: 'The prescription file is empty.' };
  if (f.size > PRESCRIPTION_MAX_BYTES) return { error: 'The prescription file must be 4 MB or smaller.' };
  if (f.head.length < 4 || !t.magic(f.head)) return { error: 'The prescription file could not be read. Please send a clear photo or the original PDF.' };
  return { ext: t.ext, contentType: f.type };
}
