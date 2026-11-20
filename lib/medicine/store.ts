/**
 * Emergency medicine requests (migration v57). Saved privately; the owner screens each one in /admin/medicine,
 * confirms the prescription with the doctor and only then asks the partner chemist to deliver.
 */
import { serviceClient, HttpError } from '@/lib/server-auth';
import { adminEmail, escHtml, sendEmail } from '@/lib/email';
import { siteConfig } from '@/lib/config';
import { MEDICINE_BUCKET } from './options';
import { isOutsideArea, type MedicineRequestInput } from './validate';

export async function submitMedicineRequest(
  input: MedicineRequestInput, ipHash: string | null, file: { bytes: Buffer; ext: string; contentType: string },
): Promise<{ id: string }> {
  const sb = serviceClient();
  if (ipHash) {
    const since = new Date(Date.now() - 24 * 3600e3).toISOString();
    const { count } = await sb.from('medicine_requests').select('id', { count: 'exact', head: true }).eq('ip_hash', ipHash).gte('created_at', since);
    if ((count || 0) >= 3) throw new HttpError(429, 'Too many requests from this connection today. Please WhatsApp us. If this is life-threatening, call 108.');
  }
  const id = crypto.randomUUID();
  const path = `${id}.${file.ext}`;
  const { error: upErr } = await sb.storage.from(MEDICINE_BUCKET).upload(path, file.bytes, { contentType: file.contentType, upsert: false });
  if (upErr) {
    console.error('Prescription upload failed:', upErr);
    throw new HttpError(500, 'Could not save the prescription. Please try again or WhatsApp us.');
  }
  const { error } = await sb.from('medicine_requests').insert({
    id, patient_name: input.patient_name, phone: input.phone, area: input.area, address: input.address,
    medicines: input.medicines, urgency: input.urgency, doctor_name: input.doctor_name, doctor_phone: input.doctor_phone,
    prescription_path: path, prescription_type: file.contentType, status: 'new', ip_hash: ipHash,
  });
  if (error) {
    await sb.storage.from(MEDICINE_BUCKET).remove([path]);
    console.error('Medicine request failed:', error);
    throw new HttpError(500, 'Could not send your request. Please try again or WhatsApp us.');
  }
  // "Urgent" in the subject also sends it to the owner's WhatsApp (lib/owner-alerts.ts). No name, phone, medicines or
  // health details in the alert (it is kept in the email log and passes through Meta): they stay in admin.
  const outside = isOutsideArea(input.area) ? ' (outside our delivery areas)' : '';
  await sendEmail({
    to: adminEmail(), subject: `Urgent medicine request: ${input.area}`,
    html: `<h2>New emergency medicine request</h2><p>Area: ${escHtml(input.area)}${outside}. Sent ${escHtml(new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit' }))}.</p>`
      + `<p>Check the prescription and call the doctor here: <a href="${siteConfig.url}/admin/medicine">${siteConfig.url}/admin/medicine</a></p>`,
  }).catch((e) => console.error('Medicine request email failed:', e));
  return { id };
}
