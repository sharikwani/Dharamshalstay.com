import Link from "next/link";
import Image from "next/image";
import {
  Shield,
  HeadphonesIcon,
  MapPin,
  Car,
  ArrowRight,
  Star,
  MessageCircle,
  Building,
  Wind,
} from "lucide-react";
import {
  HotelCard,
  DestinationCard,
  TrekCard,
  BlogCard,
  SectionHeading,
  FAQSection,
  TestimonialCard,
} from "@/components/ui/Cards";
import HeroSearch from "@/components/sections/HeroSearch";
import JsonLd from "@/components/seo/JsonLd";
import { getFeaturedHotels } from "@/data/hotels";
import { destinations } from "@/data/destinations";
import { getFeaturedTreks } from "@/data/treks";
import { getFeaturedBlogPosts } from "@/data/blog";
import { testimonials, homepageFAQs } from "@/data/testimonials";
import { faqSchema } from "@/lib/seo";
import { getWhatsAppLink } from "@/lib/utils";
import { UNSPLASH_IMAGES } from "@/types";

export default function HomePage() {
  const featuredHotels = getFeaturedHotels();
  const featuredTreks = getFeaturedTreks();
  const featuredBlogs = getFeaturedBlogPosts();

  return (
    <>
      <JsonLd data={faqSchema(homepageFAQs)} />

      <section className="relative flex min-h-[540px] items-center">
        <Image
          src={UNSPLASH_IMAGES.hero}
          alt="Dhauladhar mountains Dharamshala"
          fill
          className="object-cover"
          priority
          quality={85}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-brand-950/70 via-brand-950/50 to-brand-950/80" />
        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-16 sm:px-6">
          <h1 className="mb-4 max-w-3xl text-balance font-heading text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl xl:text-6xl">
            Discover Dharamshala &amp; McLeod Ganj
          </h1>
          <p className="mb-8 max-w-2xl text-lg text-blue-100">
            Hotels, homestays, treks, paragliding &amp; taxi — curated by locals
            who know every trail, café, and sunset spot.
          </p>
          <HeroSearch />
        </div>
      </section>

      <section className="border-b border-slate-100 bg-white py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid grid-cols-2 gap-6 text-center lg:grid-cols-4">
            {[
              { icon: MapPin, label: "Local Experts", desc: "Based in Dharamshala" },
              { icon: Shield, label: "Best Rates", desc: "Direct property pricing" },
              { icon: HeadphonesIcon, label: "Quick Support", desc: "Reply within 2 hours" },
              { icon: Star, label: "Curated Stays", desc: "Personally verified" },
            ].map((item) => (
              <div key={item.label} className="flex flex-col items-center gap-1.5">
                <item.icon className="h-6 w-6 text-brand-600" />
                <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                <p className="text-xs text-slate-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14 lg:py-18">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeading
            title="Explore Destinations"
            subtitle="From McLeod Ganj's buzz to Naddi's serene ridges"
          />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {destinations.map((d) => (
              <DestinationCard key={d.id} destination={d} />
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-14 lg:py-18">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeading
            title="Featured Hotels & Stays"
            subtitle="Handpicked for quality, location, and guest experience."
          />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featuredHotels.slice(0, 6).map((h) => (
              <HotelCard key={h.id} hotel={h} />
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link
              href="/hotels"
              className="inline-flex items-center gap-2 font-semibold text-brand-600 hover:text-brand-700"
            >
              View All Hotels <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="py-14 lg:py-18">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeading
            title="Treks & Experiences"
            subtitle="From the iconic Triund ridge to hidden glacial lakes."
          />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featuredTreks.map((t) => (
              <TrekCard key={t.id} trek={t} />
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden py-16">
        <Image
          src="https://images.unsplash.com/photo-1503264116251-35a269479413?w=1920&q=80"
          alt="Paragliding Bir Billing"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-brand-950/80" />
        <div className="relative z-10 mx-auto max-w-7xl px-4 text-center text-white sm:px-6">
          <Wind className="mx-auto mb-4 h-10 w-10 text-orange-400" />
          <h2 className="mb-3 font-heading text-2xl font-bold sm:text-3xl">
            Paragliding in Bir Billing &amp; Dharamshala
          </h2>
          <p className="mx-auto mb-6 max-w-xl text-blue-200">
            Soar over the Kangra Valley with experienced pilots. Tandem flights,
            courses &amp; adventure packages.
          </p>
          <Link
            href="/paragliding"
            className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-6 py-3 font-semibold text-white hover:bg-orange-600"
          >
            Explore Packages <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="relative overflow-hidden py-16">
        <Image
          src={UNSPLASH_IMAGES.taxi}
          alt="Mountain road"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-brand-950/80" />
        <div className="relative z-10 mx-auto max-w-7xl px-4 text-center text-white sm:px-6">
          <Car className="mx-auto mb-4 h-10 w-10 text-orange-400" />
          <h2 className="mb-3 font-heading text-2xl font-bold sm:text-3xl">
            Need a Taxi or Airport Transfer?
          </h2>
          <p className="mx-auto mb-6 max-w-xl text-blue-200">
            Reliable taxis from Gaggal Airport, Pathankot Station, and more.
            Transparent pricing.
          </p>
          <Link
            href="/taxi"
            className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-6 py-3 font-semibold text-white hover:bg-orange-600"
          >
            View Rates &amp; Book <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="bg-white py-14 lg:py-18">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeading
            title="Why Dharamshala Stay?"
            subtitle="We're not a faceless platform — we're a local team that lives and breathes these mountains."
          />
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              {
                t: "Local Knowledge",
                d: "Our team lives here. We know which room has the best view and which café makes the best momos.",
              },
              {
                t: "Best Available Rates",
                d: "We work directly with owners — no middleman markups. Often better than major booking sites.",
              },
              {
                t: "Personal Trip Planning",
                d: "Tell us your dates and we'll build a complete plan — hotels, treks, taxis, restaurants.",
              },
            ].map((i) => (
              <div
                key={i.t}
                className="rounded-xl border border-slate-100 bg-slate-50 p-6"
              >
                <h3 className="mb-2 font-heading font-semibold text-slate-900">
                  {i.t}
                </h3>
                <p className="text-sm text-slate-600">{i.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-blue-50 py-14 lg:py-18">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeading title="What Travellers Say" />
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {testimonials.map((t) => (
              <TestimonialCard key={t.id} t={t} />
            ))}
          </div>
        </div>
      </section>

      <section className="py-14 lg:py-18">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeading title="Travel Guides & Tips" />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featuredBlogs.map((p) => (
              <BlogCard key={p.id} post={p} />
            ))}
          </div>
        </div>
      </section>

      <section className="bg-brand-900 py-14 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <Building className="mx-auto mb-4 h-10 w-10 text-orange-400" />
          <h2 className="mb-3 font-heading text-2xl font-bold sm:text-3xl">
            Own a Hotel or Homestay in Dharamshala?
          </h2>
          <p className="mb-6 text-blue-200">
            List your property on Dharamshala Stay and reach thousands of
            travellers. Free to register.
          </p>
          <Link
            href="/partner/register"
            className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-6 py-3 font-semibold text-white hover:bg-orange-600"
          >
            List Your Property Free <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="bg-slate-50 py-14 lg:py-18">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <SectionHeading title="Frequently Asked Questions" />
          <FAQSection faqs={homepageFAQs} />
        </div>
      </section>

      <section className="bg-brand-600 py-14 text-white">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="mb-4 font-heading text-2xl font-bold sm:text-3xl">
            Ready to Plan Your Dharamshala Trip?
          </h2>
          <p className="mb-6 text-lg text-blue-100">
            Tell us your dates — our local team will handle the rest.
          </p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-6 py-3 font-semibold text-brand-700 hover:bg-blue-50"
            >
              Send an Inquiry
            </Link>
            <a
              href={getWhatsAppLink("Hi! Help me plan my Dharamshala trip.")}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-500 px-6 py-3 font-semibold text-white hover:bg-green-600"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </a>
          </div>
        </div>
      </section>
    </>
  );
}