// lib/rooms/handlers.ts
import { NextResponse } from 'next/server';
import { HttpError } from '@/lib/server-auth';
import { inBackground } from '@/lib/background';
import { todayIST } from '@/lib/bookings/timing';
import { capProblem, diffRooms, normaliseRooms } from './validate';
import { saveRooms, upcomingBookingCount, type RoomsProperty } from './store';
import { sendRoomChangeEmail } from './notify';

const publicProperty = (p: RoomsProperty) => ({
  id: p.id, name: p.name, status: p.status, total_rooms: p.total_rooms,
  extra_bed_charge: p.extra_bed_charge, rooms: p.rooms, updated_at: p.updated_at,
});

export async function roomsGet(prop: RoomsProperty): Promise<NextResponse> {
  return NextResponse.json({ property: publicProperty(prop) });
}

export async function roomsPut(prop: RoomsProperty, body: unknown, who: { label: string }): Promise<NextResponse> {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, any>;
  const total = b.total_rooms;
  if (typeof total !== 'number' || !Number.isInteger(total) || total < 1 || total > 500) {
    throw new HttpError(400, 'Total rooms must be 1-500.');
  }
  if (typeof b.expected_updated_at !== 'string' || !b.expected_updated_at) {
    throw new HttpError(400, 'Please reload the page and try again.');
  }

  const norm = normaliseRooms(b.rooms, { newId: () => crypto.randomUUID(), defaultExtraBedPrice: prop.extra_bed_charge ?? 0 });
  if ('error' in norm) throw new HttpError(400, norm.error);
  const cap = capProblem(total, norm.rooms);
  if (cap) throw new HttpError(400, cap);
  const diff = diffRooms(prop.rooms, norm.rooms);
  if ('error' in diff) throw new HttpError(400, diff.error);

  if (b.expected_updated_at !== prop.updated_at) {
    throw new HttpError(409, 'Someone else changed these rooms. Reload to see the latest.');
  }

  const today = todayIST();
  for (const r of diff.removed) {
    if ((await upcomingBookingCount(prop.id, r.name, r.id, today)) > 0) {
      throw new HttpError(409, `"${r.name}" has upcoming bookings. Switch it off instead of deleting it.`);
    }
  }

  const saved = await saveRooms(prop, { total_rooms: total, rooms: norm.rooms }, diff, today);
  if (!saved.ok) throw new HttpError(saved.status, saved.error);

  if (diff.lines.length > 0 || prop.total_rooms !== total) {
    const change = { hotel: prop.name, who: who.label, totalBefore: prop.total_rooms, totalAfter: total, diff };
    inBackground('Room change email', () => sendRoomChangeEmail(change));
  }

  return NextResponse.json({
    property: publicProperty({ ...prop, total_rooms: total, rooms: norm.rooms, updated_at: saved.updated_at }),
  });
}
