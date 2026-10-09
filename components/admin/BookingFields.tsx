'use client';
import { STAFF_ROLE_FOR, type ActivityCategory, type PaymentChoice, type PaymentChannel } from '@/lib/manual-booking';

export const INPUT = 'w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500';
export const LABEL = 'text-xs font-semibold text-slate-500 block mb-1';

export type PaymentValue = { choice: PaymentChoice; amount: string; channel: PaymentChannel; reference: string };
export const EMPTY_PAYMENT: PaymentValue = { choice: 'partner_collects', amount: '', channel: 'upi', reference: '' };

const CHOICES: { key: PaymentChoice; title: string }[] = [
  { key: 'partner_collects', title: 'Customer pays the partner/hotel directly' },
  { key: 'platform_paid', title: 'Customer paid Dharamshala Stay' },
  { key: 'unpaid', title: 'Not paid yet' },
];
const CHANNELS: { key: PaymentChannel; label: string }[] = [
  { key: 'upi', label: 'UPI' }, { key: 'bank', label: 'Bank transfer' }, { key: 'cash', label: 'Cash' }, { key: 'card', label: 'Card' },
];

/** Builds the payment part of an API body. */
export function paymentBody(p: PaymentValue, finalAmount: number | null) {
  if (p.choice !== 'platform_paid') return { choice: p.choice };
  const amt = p.amount.trim() === '' ? finalAmount : Number(p.amount);
  return {
    choice: p.choice,
    ...(amt != null && Number.isFinite(amt) ? { amount_received: Math.round(amt) } : {}),
    channel: p.channel,
    ...(p.reference.trim() ? { reference: p.reference.trim() } : {}),
  };
}

export function PaymentFields({ value, onChange, finalAmount }: { value: PaymentValue; onChange: (v: PaymentValue) => void; finalAmount: number | null }) {
  const set = (patch: Partial<PaymentValue>) => onChange({ ...value, ...patch });
  return (
    <div>
      <div className="grid gap-2 sm:grid-cols-3">
        {CHOICES.map((c) => (
          <label key={c.key} className={`flex items-start gap-2 p-3 border rounded-lg cursor-pointer text-sm ${value.choice === c.key ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}>
            <input type="radio" name="payment-choice" checked={value.choice === c.key} onChange={() => set({ choice: c.key })} className="mt-0.5" />
            <span className="font-medium">{c.title}</span>
          </label>
        ))}
      </div>
      {value.choice === 'platform_paid' && (
        <div className="grid gap-3 sm:grid-cols-3 mt-3">
          <div>
            <label className={LABEL}>Amount received (₹)</label>
            <input type="number" min={0} className={INPUT} value={value.amount} placeholder={finalAmount != null ? String(finalAmount) : ''} onChange={(e) => set({ amount: e.target.value })} />
          </div>
          <div>
            <label className={LABEL}>Method</label>
            <select className={INPUT} value={value.channel} onChange={(e) => set({ channel: e.target.value as PaymentChannel })}>
              {CHANNELS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL}>Reference</label>
            <input className={INPUT} value={value.reference} maxLength={200} onChange={(e) => set({ reference: e.target.value })} />
          </div>
        </div>
      )}
    </div>
  );
}

export type OptionPartner = {
  id: string; legal_name?: string | null; business_name?: string | null; commission_pct?: number | null;
  staff: { id: string; full_name: string; role: string }[];
  vehicles: { id: string; registration_no: string; make_model?: string | null; seats?: number | null }[];
};
export type AssignValue = { partner_id: string; staff_id: string; vehicle_id: string };
export const EMPTY_ASSIGN: AssignValue = { partner_id: '', staff_id: '', vehicle_id: '' };
export const partnerLabel = (p: OptionPartner) => p.legal_name || p.business_name || 'Partner';
const STAFF_LABEL = { driver: 'Driver', guide: 'Guide', pilot: 'Pilot' } as const;

export function AssignFields({ category, partners, value, onChange }: { category: ActivityCategory; partners: OptionPartner[]; value: AssignValue; onChange: (v: AssignValue) => void }) {
  const partner = partners.find((p) => p.id === value.partner_id);
  const staffLabel = STAFF_LABEL[STAFF_ROLE_FOR[category]];
  return (
    <div>
      {partners.length === 0 && (
        <p className="text-sm text-slate-500 mb-3">No approved {category} partners yet — leave unassigned or approve one in Partners.</p>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className={LABEL}>Partner</label>
          <select className={INPUT} value={value.partner_id} onChange={(e) => onChange({ partner_id: e.target.value, staff_id: '', vehicle_id: '' })}>
            <option value="">Unassigned</option>
            {partners.map((p) => <option key={p.id} value={p.id}>{partnerLabel(p)}</option>)}
          </select>
        </div>
        {partner && (
          <div>
            <label className={LABEL}>{staffLabel}</label>
            <select className={INPUT} value={value.staff_id} onChange={(e) => onChange({ ...value, staff_id: e.target.value })}>
              <option value="">Not chosen yet</option>
              {partner.staff.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
            </select>
          </div>
        )}
        {partner && category === 'taxi' && (
          <div>
            <label className={LABEL}>Vehicle</label>
            <select className={INPUT} value={value.vehicle_id} onChange={(e) => onChange({ ...value, vehicle_id: e.target.value })}>
              <option value="">Not chosen yet</option>
              {partner.vehicles.map((v) => <option key={v.id} value={v.id}>{v.registration_no}{v.make_model ? ` · ${v.make_model}` : ''}{v.seats ? ` · ${v.seats} seats` : ''}</option>)}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}
