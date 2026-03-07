import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Dharamshala Stay",
  description:
    "Read the privacy policy for Dharamshala Stay, including how we collect, use, store, and protect your information.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl font-bold text-slate-900">Privacy Policy</h1>
      <p className="mt-4 text-slate-600">
        Dharamshala Stay values your privacy and is committed to protecting your
        personal information. This Privacy Policy explains how we collect, use,
        store, and safeguard your data when you use our website and services.
      </p>

      <div className="mt-8 space-y-6 text-slate-700">
        <section>
          <h2 className="text-xl font-semibold text-slate-900">
            Information We Collect
          </h2>
          <p className="mt-2">
            We may collect personal information such as your name, phone number,
            email address, travel dates, booking preferences, inquiry details,
            and any information you submit through forms, WhatsApp, or booking
            requests on our platform.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900">
            How We Use Your Information
          </h2>
          <p className="mt-2">
            We use your information to respond to inquiries, process bookings,
            coordinate with hotels and service providers, improve our platform,
            send service-related updates, and provide customer support.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900">
            Sharing of Information
          </h2>
          <p className="mt-2">
            We may share relevant booking and inquiry information with hotels,
            taxi operators, trek providers, paragliding partners, or other
            service providers only to the extent necessary to fulfill your
            request or booking.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900">
            Data Storage and Security
          </h2>
          <p className="mt-2">
            We take reasonable administrative and technical measures to protect
            your information. However, no online system can guarantee absolute
            security, and users should share information responsibly.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900">
            Cookies and Analytics
          </h2>
          <p className="mt-2">
            Our website may use cookies, analytics tools, and similar
            technologies to improve performance, understand user behavior, and
            enhance the browsing experience.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900">
            Your Rights
          </h2>
          <p className="mt-2">
            You may contact us to request correction, update, or deletion of
            your personal information, subject to legal, operational, and
            booking-related requirements.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900">
            Contact Us
          </h2>
          <p className="mt-2">
            If you have any questions about this Privacy Policy or how your data
            is handled, please contact Dharamshala Stay through the contact
            options available on the website.
          </p>
        </section>
      </div>
    </main>
  );
}