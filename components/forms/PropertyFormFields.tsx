/**
 * components/forms/PropertyFormFields.tsx
 *
 * CRITICAL: These components are extracted to module level to prevent the
 * focus-loss bug where inline component definitions inside a parent component
 * cause React to unmount/remount the input on every keystroke.
 */
'use client';
import { Check } from 'lucide-react';

interface InputProps {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  value: any;
  onChange: (value: any) => void;
  step?: string;
  [key: string]: any;
}

/**
 * Controlled input field for property forms.
 * Defined at module level to prevent remount on parent re-render.
 */
export function PropertyInput({ label, name, type = 'text', required = false, placeholder = '', value, onChange, step, ...rest }: InputProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        value={value ?? ''}
        onChange={e => onChange(type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)}
        required={required}
        placeholder={placeholder}
        step={step}
        className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
        {...rest}
      />
    </div>
  );
}

/** Numeric columns on `properties` that a partner can leave blank. */
const NULLABLE_NUMBER_FIELDS = ['star_rating', 'total_rooms', 'year_established', 'extra_bed_charge', 'latitude', 'longitude'];

/**
 * Turns cleared number inputs ('' or 0 for star rating) into null so Postgres
 * gets NULL instead of an invalid '' or an out-of-range 0. Only touches keys
 * that are already present in the payload.
 */
export function normalizePropertyNumbers(payload: Record<string, any>): Record<string, any> {
  for (const f of NULLABLE_NUMBER_FIELDS) {
    if (!(f in payload)) continue;
    const v = payload[f];
    const n = v === '' || v == null ? NaN : Number(v);
    payload[f] = Number.isFinite(n) ? n : null;
  }
  if (payload.star_rating != null && !(payload.star_rating >= 1 && payload.star_rating <= 5)) payload.star_rating = null;
  // "Panchvati Cottages " saved as typed gave a second listing with a slug ending in a dash.
  if (typeof payload.name === 'string') payload.name = payload.name.trim();
  return payload;
}

/** Columns that are NOT NULL on `properties`, with where the partner fills them in. */
const REQUIRED_PROPERTY_FIELDS: { field: string; label: string }[] = [
  { field: 'name', label: 'Property Name (Basic Info)' },
  { field: 'type', label: 'Property Type (Basic Info)' },
  { field: 'address_line1', label: 'Address Line 1 (Location)' },
  { field: 'city', label: 'City (Location)' },
];

/** Labels of required fields that are still empty -- check before saving, even for a draft. */
export function missingPropertyFields(form: Record<string, any>): string[] {
  return REQUIRED_PROPERTY_FIELDS.filter(({ field }) => !String(form[field] ?? '').trim()).map(({ label }) => label);
}

interface CheckboxProps {
  label: string;
  checked: boolean;
  onChange: () => void;
}

/**
 * Checkbox toggle for property forms.
 * Defined at module level to prevent remount on parent re-render.
 */
export function PropertyCheckbox({ label, checked, onChange }: CheckboxProps) {
  return (
    <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer transition-colors ${
      checked ? 'bg-brand-50 border-brand-300 text-brand-700' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
    }`}>
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
        checked ? 'bg-brand-600 border-brand-600' : 'border-slate-300'
      }`}>
        {checked && <Check className="h-3 w-3 text-white" />}
      </div>
      {label}
    </label>
  );
}
