export const ALLOWED_MIME = ['image/jpeg', 'image/png', 'application/pdf'];
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export const isPan = (s: string) => /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(s.trim().toUpperCase());
export const isIfsc = (s: string) => /^[A-Z]{4}0[A-Z0-9]{6}$/.test(s.trim().toUpperCase());
export const isUpi = (s: string) => /^[\w.\-]{2,256}@[a-zA-Z]{2,64}$/.test(s.trim());
export const isAccountNumber = (s: string) => /^\d{9,18}$/.test(s.trim());

/** "hp 39 a 1234" -> "HP39A1234"; Bharat series "22 BH 1234 AA" also accepted. */
export function normalizeVehicleReg(s: string): string | null {
  const v = s.toUpperCase().replace(/[\s-]/g, '');
  if (/^[A-Z]{2}\d{1,2}[A-Z]{0,3}\d{1,4}$/.test(v)) return v;
  if (/^\d{2}BH\d{4}[A-Z]{1,2}$/.test(v)) return v;
  return null;
}

const MAGIC: Record<string, number[]> = {
  'image/jpeg': [0xff, 0xd8, 0xff], 'image/png': [0x89, 0x50, 0x4e, 0x47], 'application/pdf': [0x25, 0x50, 0x44, 0x46],
};

/** Pass `head` (the file's first bytes) to also check the content really is the declared type. */
export function checkUpload(f: { type: string; size: number; head?: Uint8Array }): string | null {
  if (!ALLOWED_MIME.includes(f.type)) return 'Please upload a JPG, PNG or PDF file.';
  if (f.size > MAX_UPLOAD_BYTES) return 'File is too big. The limit is 4 MB.';
  if (f.size <= 0) return 'The file is empty.';
  if (f.head && !MAGIC[f.type].every((b, i) => f.head![i] === b)) return 'This file does not look like a real JPG, PNG or PDF. Please upload the original file.';
  return null;
}

const norm = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase();
export function namesMatch(a: string, b: string): boolean {
  return norm(a).length > 1 && norm(a) === norm(b);
}
