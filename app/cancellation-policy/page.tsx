import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cancellation Policy | Dharamshala Stay",
  description:
    "Read the cancellation, refund, and booking modification policy for Dharamshala Stay.",
};

export default function CancellationPolicyPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl font-bold text-slate-900">Cancellation Policy</h1>
      <p className="mt-4 text-slate-600">
        This page explains cancellation, modification, refund, and booking-related terms for Dharamshala Stay.
      </p>

      <div className="mt-8 space-y-6 text-slate-700">
        <section>
          <h2 className="text-xl font-semibold text-slate-900">Hotel Bookings</h2>
          <p className="mt-2">
            Cancellation and refund eligibility for hotel bookings depends on the specific property,
            booking terms, payment method, and time of cancellation.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900">Taxi, Trek, and Activity Bookings</h2>
          <p className="mt-2">
            Taxi, trek, paragliding, and other activity bookings may have separate cancellation rules
            depending on partner availability, weather conditions, and scheduling commitments.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900">Refund Processing</h2>
          <p className="mt-2">
            Eligible refunds, where applicable, are processed according to the payment mode used at the
            time of booking and may require verification from the service provider.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900">Contact Support</h2>
          <p className="mt-2">
            For any booking change or cancellation request, please contact our support team as early as possible.
          </p>
        </section>
      </div>
    </main>
  );
}
