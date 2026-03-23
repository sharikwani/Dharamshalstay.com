import { Metadata } from 'next';
import { Breadcrumb } from '@/components/ui/Cards';
import { siteConfig } from '@/lib/config';
import { generateSEO } from '@/lib/seo';

export const metadata: Metadata = generateSEO({ title: 'Disclaimer', description: 'Disclaimer for Dharamshala Stay travel booking platform.', path: '/disclaimer' });

export default function DisclaimerPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Disclaimer' }]} />
      <h1 className="text-3xl font-heading font-bold text-slate-900 mb-2">Disclaimer</h1>
      <p className="text-sm text-slate-500 mb-8">Last updated: March 2026</p>
      <div className="space-y-8 text-slate-600 leading-relaxed">
        <section>
          <h2 className="text-xl font-heading font-semibold text-slate-900 mb-3">General Disclaimer</h2>
          <p>The information provided on {siteConfig.name} ({siteConfig.url}) is for general informational purposes and to facilitate travel bookings in the Dharamshala and Kangra Valley region. While we strive to keep information accurate and up-to-date, we make no representations or warranties of any kind, express or implied, about the completeness, accuracy, reliability, or availability of the information, products, or services on this website.</p>
        </section>
        <section>
          <h2 className="text-xl font-heading font-semibold text-slate-900 mb-3">Pricing Disclaimer</h2>
          <p>Hotel room rates, trek prices, taxi fares, and paragliding package costs displayed on our platform are indicative and subject to change without notice. Prices may vary based on season, demand, availability, special events, and currency fluctuations. The final price will be confirmed at the time of booking. Any price comparison shown on our website (such as savings compared to other platforms) is based on publicly available information at the time of listing and may not reflect real-time pricing on other platforms.</p>
        </section>
        <section>
          <h2 className="text-xl font-heading font-semibold text-slate-900 mb-3">Service Provider Disclaimer</h2>
          <p>{siteConfig.name} acts as an intermediary connecting travellers with independent service providers including hotels, homestays, taxi operators, trek guides, and paragliding operators. We do not own, operate, or manage any of these services. The quality, safety, and delivery of services is the responsibility of the respective service provider. We recommend that users verify important details directly with the service provider before making final arrangements.</p>
        </section>
        <section>
          <h2 className="text-xl font-heading font-semibold text-slate-900 mb-3">Adventure Activities</h2>
          <p>Trekking, paragliding, and other adventure activities involve inherent risks. Participants should assess their fitness level, follow safety guidelines, and use appropriate equipment. {siteConfig.name} does not assume liability for injuries, accidents, or losses during adventure activities. We recommend purchasing comprehensive travel insurance that covers adventure sports.</p>
        </section>
        <section>
          <h2 className="text-xl font-heading font-semibold text-slate-900 mb-3">Photos and Descriptions</h2>
          <p>Property photos and descriptions are provided by hotel owners, sourced from public listings, or taken during property inspections. Actual conditions may vary from photos due to renovations, seasonal changes, or normal wear and tear. Room assignments are subject to availability and may differ from images shown.</p>
        </section>
        <section>
          <h2 className="text-xl font-heading font-semibold text-slate-900 mb-3">Weather and Natural Events</h2>
          <p>Dharamshala is located in the Himalayan foothills and is subject to weather changes, landslides (especially during monsoon season), and other natural events. Travel plans may be affected by road conditions, weather, or government advisories. {siteConfig.name} is not responsible for disruptions caused by natural or unforeseen events.</p>
        </section>
        <section>
          <h2 className="text-xl font-heading font-semibold text-slate-900 mb-3">External Links</h2>
          <p>Our website may contain links to third-party websites. We have no control over the content, privacy policies, or practices of these external sites and accept no responsibility for them.</p>
        </section>
        <section>
          <h2 className="text-xl font-heading font-semibold text-slate-900 mb-3">Contact</h2>
          <p>If you have questions about this disclaimer, contact us at {siteConfig.email} or call {siteConfig.phone}.</p>
        </section>
      </div>
    </div>
  );
}
