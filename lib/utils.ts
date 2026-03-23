import { siteConfig } from './config';

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(price);
}

export function getWhatsAppLink(message?: string): string {
  const base = `https://wa.me/${siteConfig.whatsapp}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function slugify(text: string): string {
  return text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function truncate(text: string, length: number): string {
  return text.length <= length ? text : text.slice(0, length).trimEnd() + '…';
}

// ===== DATE VALIDATION HELPERS =====

/** Returns today's date as YYYY-MM-DD string in IST timezone */
export function getTodayIST(): string {
  const now = new Date();
  // IST is UTC+5:30
  const ist = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
  return ist.toISOString().split('T')[0];
}

/** Returns min date for date inputs (today in YYYY-MM-DD) */
export function getMinDate(): string {
  return getTodayIST();
}

/** Returns min checkout date (day after check-in) */
export function getMinCheckoutDate(checkInDate: string): string {
  if (!checkInDate) return getMinDate();
  const d = new Date(checkInDate);
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

/** Validate that check-in is today or future and check-out is after check-in */
export function validateBookingDates(checkIn: string, checkOut: string): { valid: boolean; error?: string } {
  const today = getTodayIST();
  if (!checkIn) return { valid: false, error: 'Check-in date is required' };
  if (!checkOut) return { valid: false, error: 'Check-out date is required' };
  if (checkIn < today) return { valid: false, error: 'Check-in cannot be in the past' };
  if (checkOut <= checkIn) return { valid: false, error: 'Check-out must be after check-in' };
  return { valid: true };
}

/** Validate activity date (today or future) */
export function validateActivityDate(date: string): { valid: boolean; error?: string } {
  if (!date) return { valid: false, error: 'Date is required' };
  if (date < getTodayIST()) return { valid: false, error: 'Date cannot be in the past' };
  return { valid: true };
}

// ===== COMMISSION HELPERS =====

export function calculateCommission(amount: number, pct: number): number {
  return Math.round(amount * pct / 100);
}

// ===== STATUS HELPERS =====

export const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700',
  pending_review: 'bg-amber-100 text-amber-700',
  pending: 'bg-amber-100 text-amber-700',
  changes_requested: 'bg-orange-100 text-orange-700',
  approved: 'bg-blue-100 text-blue-700',
  published: 'bg-green-100 text-green-700',
  confirmed: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  suspended: 'bg-red-100 text-red-700',
  cancelled: 'bg-red-100 text-red-700',
  completed: 'bg-emerald-100 text-emerald-700',
  new: 'bg-blue-100 text-blue-700',
  contacted: 'bg-amber-100 text-amber-700',
  converted: 'bg-green-100 text-green-700',
  closed: 'bg-slate-100 text-slate-600',
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-slate-100 text-slate-600',
  archived: 'bg-slate-100 text-slate-600',
  paid: 'bg-green-100 text-green-700',
  due: 'bg-amber-100 text-amber-700',
  overdue: 'bg-red-100 text-red-700',
  disputed: 'bg-purple-100 text-purple-700',
  waived: 'bg-slate-100 text-slate-600',
  not_applicable: 'bg-slate-50 text-slate-400',
  no_show: 'bg-red-100 text-red-700',
  failed: 'bg-red-100 text-red-700',
  online: 'bg-green-100 text-green-700',
  offline: 'bg-amber-100 text-amber-700',
  pay_at_hotel: 'bg-amber-100 text-amber-700',
};

export function statusLabel(s: string): string {
  return (s || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
