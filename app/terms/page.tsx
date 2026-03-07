import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions | Dharamshala Stay",
  description:
    "Read the terms and conditions for using Dharamshala Stay, including bookings, listings, payments, and platform usage rules.",
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl font-bold text-slate-900">
        Terms &amp; Conditions
      </h1>
      <p className="mt-4 text-slate-600">
        These Terms &amp; Conditions govern your access to and use of
        Dharamshala Stay, including hotel listings, travel inquiries, taxi
        bookings, trekking services, paragliding packages, and related features
        available through the platform.
      </p>

      <div className="mt-8 space-y-6 text-slate-700">
        <section>
          <h2 className="text-xl font-semibold text-slate-900">
            Acceptance of Terms
          </h2>
          <p className="mt-2">
            By using this website, submitting an inquiry, creating an account,
            listing a property, or making a booking request, you agree to these
            Terms &amp; Conditions.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900">
            Nature of the Platform
          </h2>
          <p className="mt-2">
            Dharamshala Stay operates as a travel discovery, booking assistance,
            and listing platform for hotels, homestays, taxis, treks,
            paragliding, and related local travel services. Some services may be
            fulfilled directly by independent third-party providers.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900">
            Booking and Inquiry Terms
          </h2>
          <p className="mt-2">
            All bookings and inquiries are subject to availability, provider
            acceptance, pricing confirmation, and any specific policies attached
            to the relevant hotel, activity, or transport service. Submission of
            a request does not automatically guarantee confirmation unless
            explicitly communicated.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900">
            Pricing and Payments
          </h2>
          <p className="mt-2">
            Prices shown on the website may change based on season, demand,
            provider updates, taxes, fees, and availability. Online and offline
            payment options may be offered depending on the listing or service.
            Final pricing and payment terms are subject to confirmation at the
            time of booking.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900">
            Listing Provider Responsibilities
          </h2>
          <p className="mt-2">
            Hotels, property owners, taxi operators, and activity providers are
            responsible for ensuring that their listing information, pricing,
            availability, images, legal compliance, safety practices, and
            service quality are accurate and up to date.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900">
            User Responsibilities
          </h2>
          <p className="mt-2">
            Users agree to provide accurate information, use the platform
            lawfully, avoid fraudulent bookings or misuse, and comply with any
            property, transport, trek, or activity-specific rules communicated
            during the booking process.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900">
            Cancellations and Refunds
          </h2>
          <p className="mt-2">
            Cancellation, refund, and modification eligibility depends on the
            service booked, the provider&apos;s policy, timing of cancellation,
            and payment status. Users should review the applicable cancellation
            policy before booking.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900">
            Limitation of Liability
          </h2>
          <p className="mt-2">
            Dharamshala Stay is not liable for losses, delays, cancellations,
            weather disruptions, accidents, force majeure events, pricing
            disputes, provider non-performance, or third-party service failures
            beyond its reasonable control.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900">
            Changes to Terms
          </h2>
          <p className="mt-2">
            We may update these Terms &amp; Conditions from time to time. The
            latest version published on the website will apply from the date of
            posting unless otherwise stated.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900">Contact</h2>
          <p className="mt-2">
            If you have any questions about these Terms &amp; Conditions, please
            contact Dharamshala Stay through the contact details available on
            the website.
          </p>
        </section>
      </div>
    </main>
  );
}
