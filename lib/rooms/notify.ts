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

type RenameCheck = { hotel: string; from: string; to: string; failed: string[] };

export function renameCheckEmail(p: RenameCheck): { subject: string; html: string } {
  return {
    subject: `Room rename needs a check: ${p.hotel}`,
    html: `<div style="font-family:sans-serif"><h2>Room rename needs a check: ${esc(p.hotel)}</h2>`
      + `<p>The room "${esc(p.from)}" was renamed to "${esc(p.to)}", but updating ${esc(p.failed.join(', '))} failed.</p>`
      + `<p>Please check these for the old name and fix them by hand.</p></div>`,
  };
}

/** Never throws: the rooms are already saved. */
export async function sendRenameCheckEmail(p: RenameCheck): Promise<void> {
  try {
    const { subject, html } = renameCheckEmail(p);
    await sendEmail({ to: adminEmail(), subject, html });
  } catch (e) {
    console.error('Room rename check email failed:', e);
  }
}
