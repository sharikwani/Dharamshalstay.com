import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Disclaimer | Dharamshala Stay",
  description:
    "Read the disclaimer for Dharamshala Stay regarding listings, availability, pricing, third-party providers, and travel information.",
};

export default function DisclaimerPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl font-bold text-slate-900">Disclaimer</h1>
      <p className="mt-4 text-slate-600">
        Dharamshala Stay acts as a travel discovery, inquiry, and booking
        assistance platform for hotels, taxis, treks, paragliding, and related
        travel services in and around Dharamshala.
      </p>

      <div className="mt-8 space-y-6 text-slate-700">
        <section>
          <h2 className="text-xl font-semibold text-slate-900">
            Information Accuracy
          </h2>
          <p className="mt-2">
            We make reasonable efforts to keep listings, prices, availability,
            descriptions, and travel information accurate and up to date.
            However, details may change without prior notice, and we do not
            guarantee that all information will always be complete, current, or
            error-free.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900">
            Third-Party Providers
          </h2>
          <p className="mt-2">
            Many services shown on this website are provided by independent
            third-party hotels, homestays, taxi operators, trek organizers,
            activity partners, and local service providers. Service delivery,
            quality, safety practices, availability, and final fulfillment are
            ultimately the responsibility of the relevant provider.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900">
            Pricing and Availability
          </h2>
          <p className="mt-2">
            Prices, taxes, fees, inclusions, exclusions, and availability may
            vary based on season, demand, provider changes, local conditions,
            and booking dates. Final confirmation is subject to provider
            acceptance and availability at the time of booking.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900">
            Travel and Weather Risks
          </h2>
          <p className="mt-2">
            Mountain travel may be affected by weather, road conditions,
            landslides, operational constraints, local restrictions, and other
            circumstances beyond our control. Trekking, paragliding, and outdoor
            activities involve inherent risk. Users should evaluate suitability,
            follow safety instructions, and rely on qualified operators.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900">
            No Professional Advice
          </h2>
          <p className="mt-2">
            Content on this website is provided for general informational and
            booking-support purposes only. It should not be treated as legal,
            financial, medical, or professional travel safety advice.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900">
            Contact
          </h2>
          <p className="mt-2">
            If you have questions about any listing, pricing, policy, or service
            provider, please contact us before making a booking decision.
          </p>
        </section>
      </div>
    </main>
  );
}