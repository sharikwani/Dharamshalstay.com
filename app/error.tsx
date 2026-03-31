'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { console.error('Page error:', error); }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="h-8 w-8 text-red-500" />
        </div>
        <h2 className="text-xl font-heading font-bold text-slate-900 mb-2">Something went wrong</h2>
        <p className="text-slate-600 mb-6">We apologize for the inconvenience. Please try again or go back to the homepage.</p>
        <div className="flex justify-center gap-3">
          <button onClick={reset} className="flex items-center gap-2 bg-brand-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-brand-700">
            <RefreshCw className="h-4 w-4" /> Try Again
          </button>
          <Link href="/" className="flex items-center gap-2 border border-slate-300 text-slate-700 px-5 py-2.5 rounded-xl font-medium hover:bg-slate-50">
            <Home className="h-4 w-4" /> Home
          </Link>
        </div>
      </div>
    </div>
  );
}
