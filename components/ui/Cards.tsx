import Link from 'next/link';
import Image from 'next/image';
import { Star, MapPin, ChevronRight, Wifi, Car, Coffee } from 'lucide-react';
import { Property, Trek, Destination, BlogPost, FAQ } from '@/types';
import { formatPrice, cn } from '@/lib/utils';
import { getPrimaryImageUrl } from '@/lib/images';

export function HotelCard({ hotel }: { hotel: Property }) {
  // Use normalizer -- handles string[], {url}[], null, mixed shapes
  const img = getPrimaryImageUrl(hotel.images);
  const alt = hotel.images?.[0]?.alt || hotel.name || 'Hotel';
  return (
    <Link href={`/hotels/${hotel.slug}`} className="group block">
      <div className="bg-white rounded-xl overflow-hidden border border-slate-200 hover:shadow-lg transition-all">
        <div className="relative aspect-[4/3] overflow-hidden">
          <Image src={img} alt={alt} fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="(max-width:768px) 100vw, 33vw" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          {hotel.featured && <span className="absolute top-3 left-3 bg-orange-500 text-white text-xs font-bold px-2.5 py-1 rounded">FEATURED</span>}
          <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-white/90 backdrop-blur-sm text-slate-800 text-xs font-medium px-2 py-1 rounded">
            <MapPin className="h-3 w-3" />{hotel.destination_slug?.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
          </div>
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-heading font-semibold text-slate-900 group-hover:text-brand-600 line-clamp-1">{hotel.name}</h3>
            {hotel.rating > 0 && (
              <span className="shrink-0 flex items-center gap-0.5 bg-green-600 text-white text-xs font-bold px-1.5 py-0.5 rounded">
                <Star className="h-3 w-3 fill-white" />{hotel.rating}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 capitalize mb-2">{hotel.type}{hotel.review_count ? ` · ${hotel.review_count} reviews` : ''}</p>
          {hotel.short_description && <p className="text-sm text-slate-600 line-clamp-2 mb-3">{hotel.short_description}</p>}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <div>
              {hotel.price_min > 0 ? (
                <div>
                  <span className="text-xs text-slate-400 line-through mr-1">{formatPrice(hotel.price_min)}</span>
                  <span className="text-lg font-bold text-slate-900">{formatPrice(Math.max(hotel.price_min - 500, hotel.price_min))}</span>
                  <span className="text-xs text-slate-500 ml-1">/ night</span>
                </div>
              ) : (
                <span className="text-sm text-slate-500">Price on request</span>
              )}
            </div>
            <span className="text-sm text-brand-600 font-semibold flex items-center gap-0.5">View <ChevronRight className="h-4 w-4" /></span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export function DestinationCard({ destination }: { destination: Destination }) {
  return (
    <Link href={`/destinations/${destination.slug}`} className="group block">
      <div className="relative aspect-[3/4] sm:aspect-[4/5] rounded-xl overflow-hidden">
        <Image src={destination.image} alt={destination.image_alt || destination.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="(max-width:768px) 50vw, 20vw" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="text-lg font-heading font-bold text-white mb-0.5">{destination.name}</h3>
          <p className="text-xs text-white/70">{destination.hotel_count}+ stays</p>
        </div>
      </div>
    </Link>
  );
}

export function TrekCard({ trek }: { trek: Trek }) {
  const colors: Record<string, string> = { easy: 'bg-green-100 text-green-700', moderate: 'bg-amber-100 text-amber-700', hard: 'bg-red-100 text-red-700', expert: 'bg-purple-100 text-purple-700' };
  // Null-safe: trek.images could be null/undefined from DB
  const trekImg = trek.images?.[0] || 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=600&q=80';
  // Handle both string and object shapes
  const imgSrc = typeof trekImg === 'string' ? trekImg : (trekImg?.url || 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=600&q=80');
  return (
    <Link href={`/treks/${trek.slug}`} className="group block">
      <div className="bg-white rounded-xl overflow-hidden border border-slate-200 hover:shadow-lg transition-all">
        <div className="relative aspect-[16/9]">
          <Image src={imgSrc} alt={trek.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="(max-width:768px) 100vw, 33vw" />
          {trek.featured && <span className="absolute top-3 left-3 bg-orange-500 text-white text-xs font-bold px-2.5 py-1 rounded">POPULAR</span>}
        </div>
        <div className="p-4">
          <h3 className="font-heading font-semibold text-slate-900 mb-2">{trek.name}</h3>
          <div className="flex flex-wrap gap-2 mb-3">
            {trek.difficulty && <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', colors[trek.difficulty] || 'bg-slate-100 text-slate-600')}>{trek.difficulty}</span>}
            {trek.duration && <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{trek.duration}</span>}
            {trek.max_altitude && <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{trek.max_altitude}</span>}
          </div>
          {trek.short_description && <p className="text-sm text-slate-600 line-clamp-2 mb-3">{trek.short_description}</p>}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            {trek.price_per_person > 0 ? (
              <span className="text-lg font-bold text-slate-900">{formatPrice(trek.price_per_person)}<span className="text-xs text-slate-500 font-normal ml-1">/ person</span></span>
            ) : (
              <span className="text-sm text-slate-500">Price on request</span>
            )}
            <span className="text-sm text-brand-600 font-semibold">Details -></span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export function BlogCard({ post }: { post: BlogPost }) {
  return (
    <Link href={`/blog/${post.slug}`} className="group block">
      <div className="bg-white rounded-xl overflow-hidden border border-slate-200 hover:shadow-lg transition-all">
        <div className="relative aspect-[16/9]">
          <Image src={post.image} alt={post.image_alt || post.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="(max-width:768px) 100vw, 33vw" />
        </div>
        <div className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-medium text-brand-600 bg-blue-50 px-2 py-0.5 rounded-full">{post.category}</span>
            <span className="text-xs text-slate-400">{post.read_time} min</span>
          </div>
          <h3 className="font-heading font-semibold text-slate-900 group-hover:text-brand-600 line-clamp-2 mb-2">{post.title}</h3>
          <p className="text-sm text-slate-600 line-clamp-2">{post.excerpt}</p>
        </div>
      </div>
    </Link>
  );
}

export function SectionHeading({ title, subtitle, align = 'center' }: { title: string; subtitle?: string; className?: string; align?: 'center' | 'left' }) {
  return (
    <div className={cn(align === 'center' ? 'text-center' : 'text-left', 'mb-8 lg:mb-10')}>
      <h2 className="text-2xl sm:text-3xl font-heading font-bold text-slate-900 mb-2">{title}</h2>
      {subtitle && <p className="text-slate-600 text-base sm:text-lg max-w-2xl mx-auto">{subtitle}</p>}
    </div>
  );
}

export function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-slate-500 mb-4">
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
            {item.href ? <Link href={item.href} className="hover:text-brand-600">{item.label}</Link> : <span className="text-slate-700 font-medium">{item.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function FAQSection({ faqs }: { faqs: FAQ[] }) {
  return (
    <div className="space-y-3">
      {faqs.map((faq, i) => (
        <details key={i} className="group bg-white border border-slate-200 rounded-xl">
          <summary className="flex items-center justify-between cursor-pointer px-5 py-4 font-medium text-slate-800 hover:text-brand-600">
            {faq.question}
            <ChevronRight className="h-4 w-4 text-slate-400 group-open:rotate-90 transition-transform shrink-0 ml-2" />
          </summary>
          <div className="px-5 pb-4 text-sm text-slate-600 leading-relaxed">{faq.answer}</div>
        </details>
      ))}
    </div>
  );
}

export function TestimonialCard({ t }: { t: { name: string; location: string; rating: number; text: string } }) {
  return (
    <div className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm">
      <div className="flex items-center gap-1 mb-3">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={cn('h-4 w-4', i < t.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200')} />)}</div>
      <p className="text-slate-700 text-sm leading-relaxed mb-4">{t.text}</p>
      <p className="text-sm font-semibold text-slate-800">{t.name}</p>
      <p className="text-xs text-slate-500">{t.location}</p>
    </div>
  );
}
