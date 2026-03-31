'use client';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Phone, MessageCircle, ArrowRight } from 'lucide-react';
import { siteConfig } from '@/lib/config';
import { getWhatsAppLink } from '@/lib/utils';
import { Suspense } from 'react';

function SuccessContent() {
  const params = useSearchParams();
  const ref = params.get('ref') || '';

  return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle className="h-10 w-10 text-green-600" />
      </div>
      <h1 className="text-3xl font-heading font-bold text-slate-900 mb-3">Booking Confirmed!</h1>
      {ref && (
        <p className="text-lg text-slate-600 mb-2">
          Reference: <span className="font-mono font-bold text-brand-600">{ref}</span>
        </p>
      )}
      <p className="text-slate-600 mb-8">
        Payment received successfully. You will receive a confirmation on your email and WhatsApp shortly. Our team will contact you with the hotel details.
      </p>

      <div className="bg-slate-50 rounded-2xl p-6 mb-8 text-left space-y-3">
        <h3 className="font-semibold text-slate-900">What happens next?</h3>
        <div className="flex items-start gap-3">
          <span className="shrink-0 w-6 h-6 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center">1</span>
          <p className="text-sm text-slate-600">Confirmation email with booking details sent to your inbox</p>
        </div>
        <div className="flex items-start gap-3">
          <span className="shrink-0 w-6 h-6 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center">2</span>
          <p className="text-sm text-slate-600">Our team confirms with the property and sends you the hotel contact</p>
        </div>
        <div className="flex items-start gap-3">
          <span className="shrink-0 w-6 h-6 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center">3</span>
          <p className="text-sm text-slate-600">Arrive at the hotel, show your booking reference, and enjoy your stay!</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <a href={getWhatsAppLink('Hi! My booking ref is ' + ref + '. Please confirm.')} target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 bg-green-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-600">
          <MessageCircle className="h-4 w-4" /> WhatsApp Us
        </a>
        <Link href="/hotels" className="flex items-center justify-center gap-2 bg-brand-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-brand-700">
          Browse More Hotels <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <p className="text-xs text-slate-400 mt-8">
        Questions? Call <a href={'tel:' + siteConfig.phone} className="text-brand-600">{siteConfig.phone}</a>
      </p>
    </div>
  );
}

export default function BookingSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" /></div>}>
      <SuccessContent />
    </Suspense>
  );
}
