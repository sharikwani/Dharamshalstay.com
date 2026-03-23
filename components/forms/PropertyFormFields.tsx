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
