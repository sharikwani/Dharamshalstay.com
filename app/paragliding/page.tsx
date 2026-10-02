import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Wind, MapPin, Clock, Users, Star, Shield, ArrowRight, MessageCircle } from 'lucide-react';
import { Breadcrumb, SectionHeading, FAQSection } from '@/components/ui/Cards';
import BookingForm from '@/components/forms/BookingForm';
import JsonLd from '@/components/seo/JsonLd';
import { generateSEO, faqSchema } from '@/lib/seo';
import { formatPrice, getWhatsAppLink } from '@/lib/utils';
import { placeImage } from '@/lib/place-images';

export const metadata: Metadata = generateSEO({
  title: 'Paragliding in Bir Billing & Dharamshala - Book Flights',
  description: 'Book tandem paragliding flights in Bir Billing and Dharamshala. Certified pilots, stunning Kangra Valley views. From ₹2,500/person.',
  path: '/paragliding',
});

const PACKAGES = [
  {
    id: 'pg-1', name: 'Tandem Paragliding - Bir Billing', slug: 'tandem-bir-billing',
    destination: 'Bir Billing', type: 'tandem', duration: '15-25 min flight',
    altitude: 'Launch at 2,400m', price: 3500,
    description: 'Fly tandem with a certified pilot from the world-famous Bir Billing launch site. Soar over tea gardens and the Kangra Valley with Dhauladhar views.',
    image: placeImage('bir-paragliding'),
    includes: ['Certified pilot', 'All safety equipment', 'GoPro video & photos', 'Transport to launch site', 'Landing field pickup'],
    featured: true,
  },
  {
    id: 'pg-2', name: 'Tandem Paragliding - Dharamshala', slug: 'tandem-dharamshala',
    destination: 'Dharamshala', type: 'tandem', duration: '10-15 min flight',
    altitude: 'Launch at about 1,600 m (Indrunag)', price: 2500,
    description: 'A shorter but equally thrilling flight from the hills above Dharamshala. Perfect for first-timers wanting a taste of the skies.',
    image: placeImage('dhauladhar-hero'),
    includes: ['Certified pilot', 'Safety equipment', 'GoPro video', 'Transport'],
    featured: true,
  },
  {
    id: 'pg-3', name: 'Scenic Long Flight - Bir Billing', slug: 'scenic-long-bir',
    destination: 'Bir Billing', type: 'scenic', duration: '30-45 min flight',
    altitude: 'Launch at 2,400m, thermal soaring', price: 5500,
    description: 'An extended flight for those who want more airtime. Ride thermals higher, cover more distance, and get panoramic shots of the entire valley.',
    image: placeImage('kangra-valley'),
    includes: ['Certified pilot', 'Extended flight time', 'GoPro HD video', 'Transport', 'Snacks'],
    featured: false,
  },
];

const FAQS = [
  { question: 'Is paragliding safe?', answer: 'Yes, when flown with registered, experienced pilots in suitable weather. Tandem pilots and operators in Himachal must be registered with the state Tourism Department, and we only work with registered operators. Like any adventure sport, it carries some risk.' },
  { question: 'What should I wear?', answer: 'Comfortable clothing, sturdy shoes (not sandals), and a windbreaker. Gloves recommended in winter.' },
  { question: 'Can I fly if I have no experience?', answer: 'Absolutely -- tandem flights require zero experience. Your certified pilot handles everything.' },
  { question: 'Best time for paragliding here?', answer: 'Mid-September to mid-July. Paragliding at Bir Billing is banned every year from 15 July to 15 September for the monsoon. October-November and March-May are the best months.' },
  { question: 'What if the weather is bad?', answer: 'Safety first -- flights are rescheduled or refunded if wind/weather conditions are unsafe.' },
];

export default function ParaglidingPage() {
  return (
    <>
      <JsonLd data={faqSchema(FAQS)} />

      {/* Hero */}
      <section className="relative h-[350px]">
        <Image src={placeImage('bir-paragliding')} alt="Paragliders over Bir Billing in the Kangra Valley" fill className="object-cover" priority />
        <div className="absolute inset-0 bg-gradient-to-b from-brand-950/60 to-brand-950/80" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 h-full flex flex-col justify-end pb-10 text-white">
          <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Paragliding' }]} />
          <h1 className="text-3xl sm:text-4xl font-heading font-bold mt-2">Paragliding in Bir Billing & Dharamshala</h1>
          <p className="text-blue-200 mt-2 max-w-2xl">
            Experience the thrill of flying over the Kangra Valley. Certified pilots, stunning views, and unforgettable memories.
          </p>
        </div>
      </section>

      {/* Highlights */}
      <section className="py-8 bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Shield, label: 'Registered Pilots', desc: 'HP Tourism registered' },
              { icon: Wind, label: 'World-Class Site', desc: 'Hosted 2015 World Cup' },
              { icon: Clock, label: '15-45 Min Flights', desc: 'Multiple options' },
              { icon: Star, label: 'HD Video Included', desc: 'GoPro footage' },
            ].map(h => (
              <div key={h.label} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <h.icon className="h-5 w-5 text-brand-600 shrink-0" />
                <div><p className="font-semibold text-sm text-slate-800">{h.label}</p><p className="text-xs text-slate-500">{h.desc}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Packages */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <SectionHeading title="Paragliding Packages" subtitle="Choose your adventure" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {PACKAGES.map(pkg => (
              <div key={pkg.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow group">
                <div className="relative aspect-[16/9]">
                  <Image src={pkg.image} alt={pkg.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="(max-width:768px) 100vw, 33vw" />
                  {pkg.featured && <span className="absolute top-3 left-3 bg-orange-500 text-white text-xs font-bold px-2.5 py-1 rounded">POPULAR</span>}
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="h-3.5 w-3.5 text-brand-500" />
                    <span className="text-xs font-medium text-slate-500">{pkg.destination}</span>
                    <span className="text-xs text-slate-400">·</span>
                    <span className="text-xs text-slate-500">{pkg.duration}</span>
                  </div>
                  <h3 className="text-lg font-heading font-semibold text-slate-900 mb-2">{pkg.name}</h3>
                  <p className="text-sm text-slate-600 line-clamp-2 mb-3">{pkg.description}</p>
                  <div className="flex flex-wrap gap-1 mb-4">
                    {pkg.includes.slice(0, 3).map(inc => (
                      <span key={inc} className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded">✓ {inc}</span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <div>
                      <span className="text-xl font-bold text-slate-900">{formatPrice(pkg.price)}</span>
                      <span className="text-xs text-slate-500 ml-1">/ person</span>
                    </div>
                    <a href={getWhatsAppLink(`Hi! I'm interested in ${pkg.name}`)} target="_blank" rel="noopener noreferrer"
                      className="text-sm font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1">
                      Book Now <ArrowRight className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Booking + FAQ */}
      <section className="py-12 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <h2 className="text-2xl font-heading font-bold mb-4">About Paragliding in This Region</h2>
              <div className="prose prose-slate max-w-none mb-8">
                <p>Bir Billing is India&apos;s best-known paragliding site and hosted the 2015 Paragliding World Cup. About 70 km from Dharamshala, the launch site at Billing sits at about 2,400 metres, roughly 1,000 metres above the landing ground in Bir, with sweeping views over the Kangra Valley.</p>
                <p>Dharamshala also offers shorter flights from Indrunag above the town, good for first-timers or travellers short on time. We work only with operators registered with Himachal Pradesh Tourism. Flying is suspended every year from 15 July to 15 September for the monsoon. Read our <Link href="/blog/bir-billing-paragliding-guide">Bir Billing paragliding guide</Link> for costs, season and tips.</p>
              </div>
              <h2 className="text-2xl font-heading font-bold mb-4">FAQs</h2>
              <FAQSection faqs={FAQS} />
            </div>
            <div>
              <div className="sticky top-20 space-y-4">
                <BookingForm category="paragliding" entityName="Paragliding Flight" defaultAmount={3500} commissionPct={15} />
                <a href={getWhatsAppLink('Hi! I want to book paragliding.')} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 bg-green-500 text-white py-3 rounded-xl font-medium hover:bg-green-600 w-full">
                  <MessageCircle className="h-4 w-4" /> WhatsApp Us
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
