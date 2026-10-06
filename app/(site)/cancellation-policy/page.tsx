import { Metadata } from 'next';
import { Breadcrumb } from '@/components/ui/Cards';
import { siteConfig } from '@/lib/config';
import { generateSEO } from '@/lib/seo';

export const metadata: Metadata = generateSEO({ title: 'Cancellation and Refund Policy', description: 'Cancellation and refund policy for hotel bookings, treks, taxis, and paragliding on Dharamshala Stay.', path: '/cancellation-policy' });

export default function CancellationPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Cancellation & Refund Policy' }]} />
      <h1 className="text-3xl font-heading font-bold text-slate-900 mb-2">Cancellation and Refund Policy</h1>
      <p className="text-sm text-slate-500 mb-8">Last updated: March 2026</p>
      <div className="space-y-8 text-slate-600 leading-relaxed">
        <section>
          <h2 className="text-xl font-heading font-semibold text-slate-900 mb-3">General Policy</h2>
          <p>Cancellation and refund terms depend on the type of service booked and the specific policies of the service provider. {siteConfig.name} will assist with cancellation processing, but final refund decisions rest with the hotel, transport operator, or activity provider.</p>
        </section>

        <section>
          <h2 className="text-xl font-heading font-semibold text-slate-900 mb-3">Hotel Bookings</h2>
          <div className="bg-slate-50 rounded-xl p-5 space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-slate-200">
              <span className="font-medium text-slate-800">Free Cancellation bookings</span>
              <span className="text-green-700 font-semibold">Full refund if cancelled before check-in date</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-200">
              <span className="font-medium text-slate-800">7+ days before check-in</span>
              <span className="text-green-700 font-semibold">Full refund (minus processing fees)</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-200">
              <span className="font-medium text-slate-800">3-7 days before check-in</span>
              <span className="text-amber-700 font-semibold">50% refund</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-200">
              <span className="font-medium text-slate-800">Less than 3 days / No-show</span>
              <span className="text-red-700 font-semibold">No refund</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="font-medium text-slate-800">Non-refundable bookings</span>
              <span className="text-red-700 font-semibold">No refund at any time</span>
            </div>
          </div>
          <p className="mt-3 text-sm">Note: Individual hotels may have stricter or more lenient policies. The specific cancellation terms shown at the time of booking will apply. Peak season (April-June, October-December) bookings may have different cancellation windows.</p>
        </section>

        <section>
          <h2 className="text-xl font-heading font-semibold text-slate-900 mb-3">Taxi Bookings</h2>
          <div className="bg-slate-50 rounded-xl p-5 space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-slate-200">
              <span className="font-medium text-slate-800">24+ hours before pickup</span>
              <span className="text-green-700 font-semibold">Full refund</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-200">
              <span className="font-medium text-slate-800">6-24 hours before pickup</span>
              <span className="text-amber-700 font-semibold">50% refund</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="font-medium text-slate-800">Less than 6 hours / No-show</span>
              <span className="text-red-700 font-semibold">No refund</span>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-heading font-semibold text-slate-900 mb-3">Trek Bookings</h2>
          <div className="bg-slate-50 rounded-xl p-5 space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-slate-200">
              <span className="font-medium text-slate-800">7+ days before trek date</span>
              <span className="text-green-700 font-semibold">Full refund (minus 10% processing)</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-200">
              <span className="font-medium text-slate-800">3-7 days before trek</span>
              <span className="text-amber-700 font-semibold">50% refund</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="font-medium text-slate-800">Less than 3 days / No-show</span>
              <span className="text-red-700 font-semibold">No refund</span>
            </div>
          </div>
          <p className="mt-3 text-sm">If a trek is cancelled by the operator due to weather, safety concerns, or government restrictions, you will receive a full refund or the option to reschedule at no additional cost.</p>
        </section>

        <section>
          <h2 className="text-xl font-heading font-semibold text-slate-900 mb-3">Paragliding Bookings</h2>
          <div className="bg-slate-50 rounded-xl p-5 space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-slate-200">
              <span className="font-medium text-slate-800">48+ hours before activity</span>
              <span className="text-green-700 font-semibold">Full refund</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-200">
              <span className="font-medium text-slate-800">24-48 hours before</span>
              <span className="text-amber-700 font-semibold">50% refund</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="font-medium text-slate-800">Less than 24 hours</span>
              <span className="text-red-700 font-semibold">No refund</span>
            </div>
          </div>
          <p className="mt-3 text-sm">Paragliding is weather-dependent. If a flight is cancelled by the operator due to wind or weather conditions, you will receive a full refund or free rescheduling.</p>
        </section>

        <section>
          <h2 className="text-xl font-heading font-semibold text-slate-900 mb-3">Refund Processing</h2>
          <p>Approved refunds will be processed within 5-7 business days to the original payment method. Bank processing may take an additional 3-5 business days to reflect in your account. For cash payments, refunds will be issued via bank transfer.</p>
        </section>

        <section>
          <h2 className="text-xl font-heading font-semibold text-slate-900 mb-3">How to Cancel</h2>
          <p>To cancel a booking, contact us via WhatsApp at +91-{siteConfig.whatsapp?.slice(-10) || '9805700665'}, call {siteConfig.phone}, or email {siteConfig.email}. Please have your booking reference number ready. We aim to confirm cancellation within 2 hours during business hours (9 AM - 9 PM IST).</p>
        </section>

        <section>
          <h2 className="text-xl font-heading font-semibold text-slate-900 mb-3">Modifications</h2>
          <p>Date changes and booking modifications are subject to availability and may incur price differences. Contact us as early as possible for the best chance of accommodating changes. Modification requests within 24 hours of check-in/activity may be treated as cancellation + rebooking.</p>
        </section>

        <section>
          <h2 className="text-xl font-heading font-semibold text-slate-900 mb-3">Contact</h2>
          <p>For cancellation requests or refund inquiries: Email {siteConfig.email} | Phone {siteConfig.phone}<br />Address: {siteConfig.address}</p>
        </section>
      </div>
    </div>
  );
}
