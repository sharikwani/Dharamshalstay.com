import { Metadata } from 'next';
import { Breadcrumb } from '@/components/ui/Cards';
import { siteConfig } from '@/lib/config';
import { generateSEO } from '@/lib/seo';

export const metadata: Metadata = generateSEO({ title: 'Privacy Policy', description: 'Privacy Policy for Dharamshala Stay - how we collect, use, and protect your personal data.', path: '/privacy' });

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Privacy Policy' }]} />
      <h1 className="text-3xl font-heading font-bold text-slate-900 mb-2">Privacy Policy</h1>
      <p className="text-sm text-slate-500 mb-8">Last updated: October 2026</p>
      <div className="space-y-8 text-slate-600 leading-relaxed">
        <section>
          <h2 className="text-xl font-heading font-semibold text-slate-900 mb-3">1. What information do we collect?</h2>
          <p>When you use {siteConfig.name}, we collect personal information you provide when making a booking or inquiry, including your name, email address, phone number, and travel dates. We also collect standard analytics data about how you interact with our website.</p>
          <p className="mt-2">Payment-related information is processed securely through our payment partners. We do not store your full card or bank details on our servers.</p>
        </section>
        <section>
          <h2 className="text-xl font-heading font-semibold text-slate-900 mb-3">2. How do we use your information?</h2>
          <p>We use your information to process bookings and reservations, communicate about your travel plans, send confirmations via email and WhatsApp, improve our services, and respond to your inquiries.</p>
        </section>
        <section>
          <h2 className="text-xl font-heading font-semibold text-slate-900 mb-3">Which emails and WhatsApp messages do we send?</h2>
          <p>When you book or send an enquiry, we email you about it: confirmations, payment reminders, an arrival guide before your trip and a request to review your stay afterwards. These service emails are part of the booking and are sent whether or not you subscribe to anything.</p>
          <p className="mt-2">We send travel ideas and offers (at most once a week) only if you ask for them: by ticking the box on a form, saying yes on WhatsApp, or confirming a newsletter sign-up by email. We keep a record of when and how you agreed. Every such email has a one-click unsubscribe link, and you can also reply &quot;unsubscribe&quot; or tell us on WhatsApp. We stop emailing addresses that bounce or report spam.</p>
          <p className="mt-2">Emails are sent through Resend, and some marketing text is drafted with the help of an AI model; we never send it your payment details. We record whether our emails were delivered and opened so we can fix delivery problems and send less of what people don&apos;t read.</p>
        </section>
        <section>
          <h2 className="text-xl font-heading font-semibold text-slate-900 mb-3">How do the party games (tambola, quiz, lucky draw) use your details?</h2>
          <p>To join a game at dharamshalastay.com/play you give a name, an email and a mobile number, and you can add a photo. Your name and photo are shown to the other players in that game and appear on a winner&apos;s certificate, which the winner can share. Your email and number are never shown to other players: we use them to send a winner their discount coupon. We send you offers only if you tick the box to receive them. Games close after a day; tell us if you want your game details deleted.</p>
        </section>
        <section>
          <h2 className="text-xl font-heading font-semibold text-slate-900 mb-3">3. Who do we share your information with?</h2>
          <p>We share booking details with hotels, homestays, taxi operators, trek guides, and paragliding operators necessary to fulfill your reservation. We do not sell or rent your personal information to third parties for marketing. We may disclose information when required by law.</p>
        </section>
        <section>
          <h2 className="text-xl font-heading font-semibold text-slate-900 mb-3">4. Do we use cookies and tracking?</h2>
          <p>We use essential cookies for website functionality and analytics cookies to understand usage patterns. You can control cookies through your browser settings.</p>
        </section>
        <section>
          <h2 className="text-xl font-heading font-semibold text-slate-900 mb-3">5. How do we keep your data secure?</h2>
          <p>We protect your information using industry-standard encryption (HTTPS/TLS), secure database hosting, and access controls. No method of transmission is 100% secure, but we take reasonable precautions.</p>
        </section>
        <section>
          <h2 className="text-xl font-heading font-semibold text-slate-900 mb-3">6. What are your rights?</h2>
          <p>You may access, correct, or delete your personal data by contacting us at {siteConfig.email} or calling {siteConfig.phone}. We will respond to valid requests within 30 days.</p>
        </section>
        <section>
          <h2 className="text-xl font-heading font-semibold text-slate-900 mb-3">7. What about links to other websites?</h2>
          <p>Our website may link to third-party sites (hotels, OTAs, map services). We are not responsible for their privacy practices. Please review their policies independently.</p>
        </section>
        <section>
          <h2 className="text-xl font-heading font-semibold text-slate-900 mb-3">8. Can this policy change?</h2>
          <p>We may update this policy periodically. Changes will be posted here with an updated date. Continued use constitutes acceptance.</p>
        </section>
        <section>
          <h2 className="text-xl font-heading font-semibold text-slate-900 mb-3">9. How can I contact you about privacy?</h2>
          <p>Email: {siteConfig.email} | Phone: {siteConfig.phone}<br />Address: {siteConfig.address}</p>
        </section>
      </div>
    </div>
  );
}
