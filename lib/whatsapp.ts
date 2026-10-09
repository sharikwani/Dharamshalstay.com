export function normalizeIndianPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let d = raw.replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  return /^[6-9]\d{9}$/.test(d) ? '91' + d : null;
}

export function waLink(phone: string | null | undefined, text: string): string | null {
  const p = normalizeIndianPhone(phone);
  return p ? `https://wa.me/${p}?text=${encodeURIComponent(text)}` : null;
}

export type ShareBooking = {
  booking_ref: string; category: string; item_name: string; date_text: string; num_guests: number;
  guest_name: string; guest_phone: string; amount: number; payment_text: string;
  commission_amount?: number | null; assignee_text?: string | null;
};
const rs = (n: number) => 'Rs.' + Math.round(n).toLocaleString('en-IN');
const TYPE: Record<string, string> = { hotel: 'Hotel stay', taxi: 'Taxi', trek: 'Trek', paragliding: 'Paragliding', guide: 'Local guide' };

export function bookingShareText(b: ShareBooking, audience: 'partner' | 'customer'): string {
  const lines = [
    audience === 'partner' ? `New booking from Dharamshala Stay (${b.booking_ref})` : `Your Dharamshala Stay booking is confirmed (${b.booking_ref})`,
    `${TYPE[b.category] || b.category}: ${b.item_name}`,
    `When: ${b.date_text}`,
    `People: ${b.num_guests}`,
  ];
  if (audience === 'partner') lines.push(`Customer: ${b.guest_name}, ${b.guest_phone}`);
  if (b.assignee_text) lines.push(audience === 'partner' ? `Assigned: ${b.assignee_text}` : `Your ${b.category === 'taxi' ? 'driver' : 'host'}: ${b.assignee_text}`);
  lines.push(`Price: ${rs(b.amount)}`, `Payment: ${b.payment_text}`);
  if (audience === 'partner' && b.commission_amount) lines.push(`Dharamshala Stay commission: ${rs(b.commission_amount)}`);
  return lines.join('\n');
}
