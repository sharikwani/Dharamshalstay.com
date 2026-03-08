import Link from 'next/link';
import { Mountain, Search, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <Mountain className="h-16 w-16 text-brand-300 mx-auto mb-6" />
        <h1 className="text-4xl font-heading font-bold text-slate-900 mb-3">Page Not Found</h1>
        <p className="text-slate-600 mb-8">This page doesn't exist. Let us help you find what you need.</p>
        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <Link href="/" className="inline-flex items-center justify-center gap-2 bg-brand-600 text-white px-5 py-3 rounded-xl font-medium hover:bg-brand-700"><ArrowLeft className="h-4 w-4" /> Home</Link>
          <Link href="/hotels" className="inline-flex items-center justify-center gap-2 border border-slate-200 text-slate-700 px-5 py-3 rounded-xl font-medium hover:bg-slate-50"><Search className="h-4 w-4" /> Browse Hotels</Link>
        </div>
      </div>
    </div>
  );
}
