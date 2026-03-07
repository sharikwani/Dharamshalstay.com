import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Mountain } from 'lucide-react';
import { HotelCard, Breadcrumb, FAQSection, SectionHeading } from '@/components/ui/Cards';
import JsonLd from '@/components/seo/JsonLd';
import { getDestinationBySlug, getAllDestinationSlugs, destinations } from '@/data/destinations';
import { getHotelsByDestination } from '@/data/hotels';
import { generateSEO, breadcrumbSchema, faqSchema } from '@/lib/seo';
interface Props { params: { slug: string } }
export function generateStaticParams() { return getAllDestinationSlugs().map(slug => ({ slug })); }
export function generateMetadata({ params }: Props): Metadata { const d = getDestinationBySlug(params.slug); if (!d) return {}; return generateSEO({ title: d.meta_title, description: d.meta_description, path: `/destinations/${d.slug}` }); }
export default function DestPage({ params }: Props) {
  const dest = getDestinationBySlug(params.slug);
  if (!dest) notFound();
  const hotels = getHotelsByDestination(dest.slug);
  const others = destinations.filter(d => d.slug !== dest.slug);
  return (<><JsonLd data={[breadcrumbSchema([{ name: 'Home', href: '/' }, { name: dest.name, href: `/destinations/${dest.slug}` }]), faqSchema(dest.faqs)]} /><section className="relative h-[300px]"><Image src={dest.image} alt={dest.image_alt} fill className="object-cover" priority /><div className="absolute inset-0 bg-brand-950/60" /><div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 h-full flex flex-col justify-end pb-8 text-white"><Breadcrumb items={[{ label: 'Home', href: '/' }, { label: dest.name }]} /><h1 className="text-3xl sm:text-4xl font-heading font-bold">{dest.name}</h1><p className="text-blue-200 italic">{dest.tagline}</p><p className="text-sm text-slate-300 mt-1">Altitude: {dest.altitude} · Best: {dest.best_time} · {dest.hotel_count}+ stays</p></div></section><div className="max-w-7xl mx-auto px-4 sm:px-6 py-10"><div className="max-w-3xl mb-10"><h2 className="text-2xl font-heading font-bold mb-3">About {dest.name}</h2><p className="text-slate-600 whitespace-pre-line">{dest.long_description}</p></div><div className="max-w-3xl mb-10"><h2 className="text-2xl font-heading font-bold mb-3">Things to Do</h2><div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{dest.things_to_do.map(t => <div key={t} className="flex items-center gap-2 text-sm text-slate-700 bg-slate-50 px-3 py-2.5 rounded-lg"><Mountain className="h-4 w-4 text-brand-500 shrink-0" />{t}</div>)}</div></div>{hotels.length > 0 && <><SectionHeading title={`Hotels in ${dest.name}`} align="left" /><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">{hotels.map(h => <HotelCard key={h.id} hotel={h} />)}</div></>}{dest.faqs.length > 0 && <div className="max-w-3xl mb-10"><h2 className="text-2xl font-heading font-bold mb-3">FAQs</h2><FAQSection faqs={dest.faqs} /></div>}<div><h2 className="text-xl font-heading font-bold mb-3">Explore Other Destinations</h2><div className="flex flex-wrap gap-2">{others.map(d => <Link key={d.slug} href={`/destinations/${d.slug}`} className="px-4 py-2 bg-slate-100 rounded-full text-sm font-medium hover:bg-blue-50">{d.name}</Link>)}</div></div></div></>);
}
