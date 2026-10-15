'use client';
import { Printer } from 'lucide-react';

export default function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()}
      className="inline-flex items-center gap-2 border border-slate-300 text-slate-700 px-5 py-2.5 rounded-xl font-semibold hover:bg-slate-50 text-sm">
      <Printer className="h-4 w-4" /> Print or save as PDF
    </button>
  );
}
