// lib/rooms/notify.ts
import { adminEmail, sendEmail } from '@/lib/email';
import type { RoomDiff } from './validate';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

type Change = { hotel: string; who: string; totalBefore: number | null; totalAfter: number; diff: RoomDiff };

export function roomChangeEmail(p: Change): { subject: string; html: string } {
  const lines: string[] = [];
  if (p.totalBefore !== p.totalAfter) {
    lines.push(p.totalBefore == null ? `Total rooms set to ${p.totalAfter}` : `Total rooms ${p.totalBefore} → ${p.totalAfter}`);
  }
  lines.push(...p.diff.lines);
  const items = lines.map((l) => `<li>${esc(l)}</li>`).join('');
  return {
    subject: `Rooms updated: ${p.hotel}`,
    html: `<div style="font-family:sans-serif"><h2>Rooms updated: ${esc(p.hotel)}</h2><p>Changed by ${esc(p.who)}.</p><ul>${items}</ul></div>`,
  };
}

/** Never throws: a failed notice must not affect the save. */
export async function sendRoomChangeEmail(p: Change): Promise<void> {
  try {
    const { subject, html } = roomChangeEmail(p);
    await sendEmail({ to: adminEmail(), subject, html });
  } catch (e) {
    console.error('Room change email failed:', e);
  }
}
