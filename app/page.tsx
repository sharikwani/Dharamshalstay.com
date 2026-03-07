import Link from 'next/link';
import Image from 'next/image';
import {
  Shield,
  HeadphonesIcon,
  Mountain,
  Car,
  ArrowRight,
  MessageCircle,
  Building,
  Wind,
  Heart,
  Sparkles,
  IndianRupee,
  Compass,
  Palette,
  Coffee,
} from 'lucide-react';
import {
  DestinationCard,
  SectionHeading,
  FAQSection,
  TestimonialCard,
} from '@/components/ui/Cards';
import HeroSearch from '@/components/sections/HeroSearch';
import JsonLd from '@/components/seo/JsonLd';
import { getDestinations, getFeaturedTreks } from '@/lib/db';
import { getFeaturedBlogPosts } from '@/data/blog';
import { testimonials, homepageFAQs } from '@/data/testimonials';
import { faqSchema } from '@/lib/seo';
import { getWhatsAppLink } from '@/lib/utils';
import { UNSPLASH_IMAGES } from '@/types';

export const revalidate = 60;

export default async function HomePage() {
  const [destinations, featuredTreks] = await Promise.all([
    getDestinations(),
    getFeaturedTreks(),
  ]);
  const featuredBlogs = getFeaturedBlogPosts();

  return (
    <>
      <JsonLd data={faqSchema(homepageFAQs)} />

      {/* ===== HERO — Premium tourism-first design ===== */}
      <section className="relative min-h-[600px] lg:min-h-[680px] flex items-center overflow-hidden">
        <Image
          src={UNSPLASH_IMAGES.hero}
          alt="Dhauladhar mountains Dharamshala"
          fill
          className="object-cover scale-105"
          priority
          quality={90}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-brand-950/80 via-brand-950/50 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 w-full py-20 lg:py-28">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md text-white text-xs font-medium px-3 py-1.5 rounded-full mb-6 border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Dharamshala&apos;s Only Local Travel Marketplace
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-bold text-white leading-[1.1] mb-5">
              Your Himalayan
              <br />
              <span className="bg-gradient-to-r from-amber-200 to-orange-200 bg-clip-text text-transparent">
                Adventure Starts Here
              </span>
            </h1>
            <p className="text-lg lg:text-xl text-blue-100/90 mb-10 max-w-2xl leading-relaxed">
              Hotels, treks, paragliding &amp; taxis — handpicked by locals
              who&apos;ve lived every trail, tasted every café, and watched every
              sunrise in the Kangra Valley.
            </p>
          </div>
          <HeroSearch />
        </div>
      </section>

      {/* ===== WHY BOOK WITH US — Trust strip ===== */}
      <section className="py-10 bg-white relative -mt-6 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 lg:gap-8">
            {[
              {
                icon: IndianRupee,
                label: 'Better Local Pricing',
                desc: 'Direct hotel rates, no OTA markup',
              },
              {
                icon: Shield,
                label: 'Verified Properties',
                desc: 'Every stay personally inspected',
              },
              {
                icon: HeadphonesIcon,
                label: '2-Hour Response',
                desc: 'WhatsApp, call, or email',
              },
              {
                icon: Heart,
                label: 'Local Expertise',
                desc: 'We live here — ask us anything',
              },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-3 group">
                <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center shrink-0 group-hover:bg-brand-100 transition-colors">
                  <item.icon className="h-5 w-5 text-brand-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800 text-sm">
                    {item.label}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== WHAT MAKES US DIFFERENT ===== */}
      <section className="py-16 lg:py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-heading font-bold text-slate-900 mb-3">
              Why Thousands Choose Dharamshala Stay
            </h2>
            <p className="text-slate-600 text-lg max-w-2xl mx-auto">
              We&apos;re not another generic booking platform. We&apos;re a local
              team that builds real relationships with every hotel, guide, and
              driver.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: Building,
                title: 'Handpicked Stays',
                desc: 'Every hotel, homestay, and hostel on our platform is personally visited. We reject properties that do not meet our standards for cleanliness, service, and value.',
                highlight: '100% Verified',
              },
              {
                icon: Compass,
                title: 'Complete Trip Planning',
                desc: "Hotels, airport taxis, Triund treks, Bir Billing paragliding — one platform, one team. Tell us your dates and we'll build your perfect Dharamshala itinerary.",
                highlight: 'All-In-One',
              },
              {
                icon: IndianRupee,
                title: 'Better Than OTA Prices',
                desc: 'We negotiate directly with property owners — no platform commissions inflating your room rate. Many guests save 15–30% compared to MakeMyTrip and Booking.com.',
                highlight: 'Save 15–30%',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="bg-white rounded-2xl p-7 border border-slate-100 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-xl bg-brand-50 flex items-center justify-center">
                    <item.icon className="h-5 w-5 text-brand-600" />
                  </div>
                  <span className="text-xs font-bold text-brand-600 bg-brand-50 px-2 py-1 rounded-full">
                    {item.highlight}
                  </span>
                </div>
                <h3 className="font-heading font-bold text-lg text-slate-900 mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== BEST AREAS TO STAY ===== */}
      <section className="py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <SectionHeading
            title="Best Areas to Stay in Dharamshala"
            subtitle="Each neighbourhood has its own character — find yours."
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {destinations.map((d: any) => (
              <DestinationCard key={d.id} destination={d} />
            ))}
          </div>
          <div className="text-center mt-8">
            <Link
              href="/hotels"
              className="inline-flex items-center gap-2 bg-brand-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-brand-700 transition-colors"
            >
              Browse All Hotels <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ===== EXPERIENCES — Trek, Paragliding, Taxi ===== */}
      <section className="py-16 lg:py-20 bg-brand-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-heading font-bold mb-3">
              Experiences Only Locals Can Offer
            </h2>
            <p className="text-blue-200 text-lg max-w-2xl mx-auto">
              We do not just book rooms. We craft complete Dharamshala
              experiences.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: Mountain,
                title: 'Guided Treks',
                desc: 'Triund, Kareri Lake, Indrahar Pass — with certified local guides, camping gear, and meals.',
                href: '/treks',
                image: UNSPLASH_IMAGES.trek1,
                price: 'From ₹1,500',
              },
              {
                icon: Wind,
                title: 'Paragliding',
                desc: "Soar over the Kangra Valley from Bir Billing — the world's #2 paragliding site. HD video included.",
                href: '/paragliding',
                image:
                  'https://images.unsplash.com/photo-1503264116251-35a269479413?w=600&q=80',
                price: 'From ₹2,500',
              },
              {
                icon: Car,
                title: 'Airport & Outstation Taxis',
                desc: 'Gaggal Airport, Pathankot, Delhi, Manali — reliable drivers who know every mountain road.',
                href: '/taxi',
                image: UNSPLASH_IMAGES.taxi,
                price: 'From ₹900',
              },
            ].map((exp) => (
              <Link
                key={exp.title}
                href={exp.href}
                className="group relative rounded-2xl overflow-hidden aspect-[4/5] flex items-end"
              >
                <Image
                  src={exp.image}
                  alt={exp.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  sizes="(max-width:768px) 100vw, 33vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="relative p-6 w-full">
                  <div className="flex items-center gap-2 mb-2">
                    <exp.icon className="h-5 w-5 text-orange-300" />
                    <span className="text-xs font-semibold text-orange-300">
                      {exp.price}
                    </span>
                  </div>
                  <h3 className="text-xl font-heading font-bold text-white mb-1">
                    {exp.title}
                  </h3>
                  <p className="text-sm text-white/70 line-clamp-2">
                    {exp.desc}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ===== COMBO OFFERS / PACKAGES ===== */}
      <section className="py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-heading font-bold text-slate-900 mb-3">
              Special Dharamshala Packages
            </h2>
            <p className="text-slate-600 text-lg max-w-2xl mx-auto">
              Exclusive deals you won&apos;t find on any other platform.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: 'Weekend Escape',
                duration: '2N/3D',
                price: '₹5,999',
                desc: 'Hotel + Triund Trek + Airport Taxi',
                tag: 'Most Popular',
              },
              {
                title: 'Adventure Package',
                duration: '3N/4D',
                price: '₹8,999',
                desc: 'Hotel + Triund + Paragliding (Bir) + Taxi',
                tag: 'Best Value',
              },
              {
                title: 'Spiritual Retreat',
                duration: '4N/5D',
                price: '₹11,999',
                desc: 'Homestay + Meditation + Yoga + Local Food Tour',
                tag: 'Unique',
              },
            ].map((pkg) => (
              <div
                key={pkg.title}
                className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-lg transition-shadow relative overflow-hidden"
              >
                <span className="absolute top-4 right-4 text-xs font-bold text-brand-600 bg-brand-50 px-2.5 py-1 rounded-full">
                  {pkg.tag}
                </span>
                <h3 className="font-heading font-bold text-xl text-slate-900 mb-1">
                  {pkg.title}
                </h3>
                <p className="text-sm text-slate-500 mb-3">{pkg.duration}</p>
                <p className="text-slate-700 text-sm mb-4">{pkg.desc}</p>
                <div className="flex items-end justify-between">
                  <div>
                    <span className="text-2xl font-bold text-slate-900">
                      {pkg.price}
                    </span>
                    <span className="text-xs text-slate-500 ml-1">
                      / person
                    </span>
                  </div>
                  <a
                    href={getWhatsAppLink(
                      `Hi! I'm interested in the ${pkg.title} package.`,
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
                  >
                    Enquire <ArrowRight className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-slate-500 mt-6">
            All packages customizable.{' '}
            <a
              href={getWhatsAppLink('Hi! I want a custom package.')}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-600 font-medium"
            >
              WhatsApp us for custom quotes →
            </a>
          </p>
        </div>
      </section>

      {/* ===== SEASONAL HIGHLIGHTS ===== */}
      <section className="py-16 lg:py-20 bg-gradient-to-br from-blue-50 via-white to-amber-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-heading font-bold text-slate-900 mb-3">
              What&apos;s Special Right Now
            </h2>
            <p className="text-slate-600 text-lg">
              Spring in Dharamshala means clear skies, blooming rhododendrons,
              and perfect trekking weather.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                icon: Mountain,
                title: 'Triund Open',
                desc: 'Clear skies, moderate temps. Best trekking months are here.',
              },
              {
                icon: Wind,
                title: 'Paragliding Season',
                desc: 'Mar–Jun peak thermals at Bir Billing. Book early.',
              },
              {
                icon: Coffee,
                title: 'Café Hopping',
                desc: "McLeod Ganj's rooftop cafés are buzzing with live music.",
              },
              {
                icon: Palette,
                title: 'Tibetan Festivals',
                desc: 'Experience Losar and teachings at Tsuglagkhang Complex.',
              },
            ].map((s) => (
              <div
                key={s.title}
                className="bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-slate-100"
              >
                <s.icon className="h-6 w-6 text-brand-600 mb-3" />
                <h3 className="font-heading font-semibold text-slate-900 mb-1">
                  {s.title}
                </h3>
                <p className="text-sm text-slate-600">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== TESTIMONIALS ===== */}
      <section className="py-16 lg:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <SectionHeading
            title="What Travellers Say"
            subtitle="Real reviews from real guests."
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {testimonials.map((t) => (
              <TestimonialCard key={t.id} t={t} />
            ))}
          </div>
        </div>
      </section>

      {/* ===== LIST YOUR PROPERTY CTA ===== */}
      <section className="py-16 bg-brand-900 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <Building className="h-10 w-10 text-orange-400 mx-auto mb-4" />
          <h2 className="text-2xl sm:text-3xl font-heading font-bold mb-3">
            Own a Hotel or Homestay?
          </h2>
          <p className="text-blue-200 mb-6 max-w-xl mx-auto">
            List your property for free and reach thousands of travellers
            searching for Dharamshala stays.
          </p>
          <Link
            href="/partner/register"
            className="inline-flex items-center gap-2 bg-orange-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-orange-600 transition-colors"
          >
            List Your Property Free <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section className="py-16 lg:py-20 bg-slate-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <SectionHeading title="Frequently Asked Questions" />
          <FAQSection faqs={homepageFAQs} />
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section className="py-16 bg-brand-600 text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-heading font-bold mb-4">
            Ready for Your Dharamshala Trip?
          </h2>
          <p className="text-blue-100 text-lg mb-8">
            Send your dates and preferences — our team will build the perfect
            plan. Free, fast, personal.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Link
              href="/hotels"
              className="inline-flex items-center justify-center gap-2 bg-white text-brand-700 px-6 py-3 rounded-xl font-semibold hover:bg-blue-50 transition-colors"
            >
              Browse Hotels
            </Link>
            <a
              href={getWhatsAppLink(
                'Hi! Help me plan my Dharamshala trip.',
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-green-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-600 transition-colors"
            >
              <MessageCircle className="h-4 w-4" /> WhatsApp Us
            </a>
          </div>
        </div>
      </section>
    </>
  );
}