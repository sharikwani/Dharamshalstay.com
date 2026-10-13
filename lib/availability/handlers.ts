// lib/availability/handlers.ts
import { NextResponse } from 'next/server';
import { monthGrid, setUnits, type PropertySummary } from './store';
import { isMonth, rangeProblem } from './validate';

export const UNTRACKED_ERROR = 'This room type has no room count yet, so it is always bookable and the calendar is off. Set its room count (Rooms to sell) first.';

/** What the calendars may see of a property (never owner_id). */
export const publicProperty = (p: PropertySummary) => ({ id: p.id, name: p.name, rooms: p.rooms });

export async function readJson(req: Request): Promise<any | null> {
  try { return await req.json(); } catch { return null; }
}

/** GET for one property the caller may edit: its room types, plus a month grid when room_key and month are given. */
export async function gridResponse(prop: PropertySummary, params: URLSearchParams): Promise<NextResponse> {
  const roomKey = params.get('room_key');
  if (!roomKey) return NextResponse.json({ property: publicProperty(prop) });
  const month = params.get('month');
  if (!isMonth(month)) return NextResponse.json({ error: 'month must be YYYY-MM' }, { status: 400 });
  if (!prop.rooms.some((r) => r.key === roomKey)) return NextResponse.json({ error: 'Unknown room type' }, { status: 400 });
  const grid = await monthGrid(prop.id, roomKey, month);
  return NextResponse.json({ property: publicProperty(prop), grid });
}

/** PUT for one property the caller may edit: validate, then set rooms open for each day of the range. */
export async function putResponse(prop: PropertySummary, body: any, userId: string): Promise<NextResponse> {
  const problem = rangeProblem(body ?? {}, prop.rooms.map((r) => r.key));
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });
  const room = prop.rooms.find((r) => r.key === body.room_key);
  if (!room?.tracked) return NextResponse.json({ error: UNTRACKED_ERROR }, { status: 409 });
  const days = await setUnits(prop.id, room.key, body.from, body.to, body.units, userId);
  return NextResponse.json({ ok: true, days });
}
