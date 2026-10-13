'use client';
import { useEffect, useState } from 'react';
import type { RoomInfo } from '@/lib/availability/calc';

/**
 * Rooms left per room type for the chosen stay. Null while dates are incomplete or if the lookup fails:
 * the page then shows no badges and the server still refuses sold-out bookings.
 */
export function useRoomAvailability(propertyId: string | undefined, checkIn: string, checkOut: string): Record<string, RoomInfo> | null {
  const [rooms, setRooms] = useState<Record<string, RoomInfo> | null>(null);
  useEffect(() => {
    setRooms(null);
    if (!propertyId || !checkIn || !checkOut || checkOut <= checkIn) return;
    const ctrl = new AbortController();
    const q = new URLSearchParams({ property_id: propertyId, check_in: checkIn, check_out: checkOut });
    fetch(`/api/availability?${q}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.rooms) setRooms(d.rooms); })
      .catch(() => {});
    return () => ctrl.abort();
  }, [propertyId, checkIn, checkOut]);
  return rooms;
}
