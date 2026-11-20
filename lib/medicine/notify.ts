/**
 * The owner gets every medicine request on WhatsApp with the complete details (owner, 20 Nov 2026). Inside the
 * 24-hour chat window that is one plain message; outside it, the details are split over owner_update template
 * messages, whose fields hold 300 characters each (cleanParam in lib/whatsapp-cloud.ts).
 */
import { messageOwner } from '@/lib/owner-alerts';
import { isOutsideArea, type MedicineRequestInput } from './validate';

const FIELD_MAX = 300;

/** Split text into pieces of at most `max` characters, at spaces where possible. */
function splitText(s: string, max: number): string[] {
  const out: string[] = [];
  let rest = s.trim();
  while (rest.length > max) {
    let cut = rest.lastIndexOf(' ', max);
    if (cut < max / 2) cut = max;
    out.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) out.push(rest);
  return out;
}

export function medicineOwnerMessage(r: MedicineRequestInput, link: string): { text: string; templates: [string, string, string][] } {
  const oneLine = (s: string) => s.replace(/\s+/g, ' ').trim();
  const area = r.area + (isOutsideArea(r.area) ? ' (outside our delivery areas)' : '');
  const fields: [string, string][] = [
    ['Patient', r.patient_name], ['Phone', '+' + r.phone], ['Area', area], ['Address', oneLine(r.address)],
    ['Medicines', oneLine(r.medicines)], ['Why urgent', oneLine(r.urgency)],
    ['Doctor', `${r.doctor_name}, +${r.doctor_phone}`],
  ];
  const text = `💊 *New emergency medicine request*\n\n${fields.map(([k, v]) => `*${k}:* ${v}`).join('\n')}\n\nPrescription and status: ${link}`;

  // Pack "Label: value" pieces into template fields of at most 300 characters, splitting long values.
  const pieces = fields.flatMap(([k, v]) => splitText(`${k}: ${v}`, FIELD_MAX));
  const chunks: string[] = [];
  for (const p of pieces) {
    const last = chunks[chunks.length - 1];
    if (last !== undefined && last.length + 3 + p.length <= FIELD_MAX) chunks[chunks.length - 1] = `${last} | ${p}`;
    else chunks.push(p);
  }
  const title = (i: number) => `Medicine request ${i + 1}/${chunks.length}: ${r.patient_name}, ${r.area}`.slice(0, FIELD_MAX);
  return { text, templates: chunks.map((c, i) => [title(i), c, link]) };
}

/** WhatsApp the owner the complete request. Never throws. */
export async function notifyOwnerOfMedicineRequest(r: MedicineRequestInput, link: string): Promise<void> {
  try { await messageOwner(medicineOwnerMessage(r, link)); }
  catch (e) { console.error('Medicine request WhatsApp to owner failed:', e); }
}
