import { Metadata } from 'next';
import { Breadcrumb } from '@/components/ui/Cards';
import { siteConfig } from '@/lib/config';
import { generateSEO } from '@/lib/seo';

export const metadata: Metadata = generateSEO({ title: 'Terms and Conditions', description: 'Terms and conditions for using Dharamshala Stay booking platform.', path: '/terms' });

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Terms and Conditions' }]} />
      <h1 className="text-3xl font-heading font-bold text-slate-900 mb-2">Terms and Conditions</h1>
      <p className="text-sm text-slate-500 mb-8">Last updated: March 2026</p>
      <div className="space-y-8 text-slate-600 leading-relaxed">
        <section>
          <h2 className="text-xl font-heading font-semibold text-slate-900 mb-3">1. Acceptance of Terms</h2>
          <p>By accessing and using {siteConfig.name} ({siteConfig.url}), you agree to these Terms and Conditions. If you do not agree, please do not use our services. These terms apply to all visitors, users, and partners of the platform.</p>
        </section>
        <section>
          <h2 className="text-xl font-heading font-semibold text-slate-900 mb-3">2. Services</h2>
          <p>{siteConfig.name} is a travel booking platform connecting travellers with hotels, homestays, taxi services, trek operators, and paragliding operators in the Dharamshala, McLeod Ganj, and Kangra Valley region of Himachal Pradesh, India. We act as an intermediary and are not the direct provider of accommodation, transport, or activity services.</p>
        </section>
        <section>
          <h2 className="text-xl font-heading font-semibold text-slate-900 mb-3">3. Bookings and Payments</h2>
          <p>All bookings are subject to availability and confirmation by the service provider. Prices displayed are indicative and may vary based on season, room availability, and special dates. Final pricing will be confirmed at the time of booking. Payment terms vary by service provider and booking type. Advance payment, partial payment, or pay-at-property options may be available depending on the listing.</p>
        </section>
        <section>
          <h2 className="text-xl font-heading font-semibold text-slate-900 mb-3">4. User Responsibilities</h2>
          <p>You agree to provide accurate personal information during bookings, maintain the confidentiality of your account credentials, comply with the rules and policies of the service providers (hotels, transport, etc.), and not misuse the platform for fraudulent or illegal purposes.</p>
        </section>
        <section>
          <h2 className="text-xl font-heading font-semibold text-slate-900 mb-3">5. Property Listings</h2>
          <p>Property information including descriptions, photos, amenities, and prices is provided by the property owners/managers or sourced from publicly available information. While we strive for accuracy, we cannot guarantee that all details are current or error-free. We recommend confirming specific requirements directly with the property.</p>
        </section>
        <section>
          <h2 className="text-xl font-heading font-semibold text-slate-900 mb-3">6. Limitation of Liability</h2>
          <p>{siteConfig.name} acts as an intermediary and is not liable for the quality, safety, or suitability of services provided by hotels, transport operators, trek guides, or other partners. We are not responsible for losses due to natural disasters, strikes, government actions, or other force majeure events. Our total liability shall not exceed the booking commission earned on the disputed transaction.</p>
        </section>
        <section>
          <h2 className="text-xl font-heading font-semibold text-slate-900 mb-3">7. Intellectual Property</h2>
          <p>All content on this website including text, graphics, logos, images, and software is the property of {siteConfig.name} or its content partners and is protected by Indian copyright laws. You may not reproduce, distribute, or create derivative works without written permission.</p>
        </section>
        <section>
          <h2 className="text-xl font-heading font-semibold text-slate-900 mb-3">8. Partner Terms</h2>
          <p>Hotels, homestays, and other service providers listing on {siteConfig.name} agree to provide accurate information, honour confirmed bookings at the listed price, maintain the quality of service as described, and pay applicable commission on completed bookings.</p>
        </section>
        <section>
          <h2 className="text-xl font-heading font-semibold text-slate-900 mb-3">9. Dispute Resolution</h2>
          <p>Any disputes arising from the use of our services shall first be attempted to be resolved through mutual discussion. If unresolved, disputes shall be subject to the jurisdiction of courts in Dharamshala, Himachal Pradesh, India.</p>
        </section>
        <section>
          <h2 className="text-xl font-heading font-semibold text-slate-900 mb-3">10. Changes</h2>
          <p>We reserve the right to modify these terms at any time. Updated terms will be posted here. Continued use after changes constitutes acceptance.</p>
        </section>
        <section>
          <h2 className="text-xl font-heading font-semibold text-slate-900 mb-3">11. Contact</h2>
          <p>Email: {siteConfig.email} | Phone: {siteConfig.phone}<br />Address: {siteConfig.address}</p>
        </section>
      </div>
    </div>
  );
}
