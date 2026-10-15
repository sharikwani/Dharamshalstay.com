import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Check, Zap, Building2, Users } from 'lucide-react';
import { normalizeImages } from '@/lib/images';
import { formatPrice } from '@/lib/utils';

export type ListLabels = {
  perNight: string; taxes: string; forNights: string; viewRooms: string; checkAvail: string; ratesOnRequest: string;
  weCheck: string; instant: string; map: string; more: string; band: Record<string, string>; goodFor: string;
};

const BAND_SIGNS: Record<string, string> = { budget: '₹', 'mid-range': '₹₹', upscale: '₹₹₹' };

/** One hotel in the results list, laid out like the big booking sites: photos, details, then the price panel. */
export default function HotelListCard({ hotel: h, href, typeLabel, areaLabel, nights, labels: l }: {
  hotel: any; href: string; typeLabel: string; areaLabel: string; nights: number; labels: ListLabels;
}) {
  const photos = normalizeImages(h.images);
  const cover = photos.find((p) => p.is_primary) || photos[0];
  const thumbs = photos.filter((p) => p !== cover).slice(0, 3);
  const live = h.listing_type !== 'directory' && h.price_min > 0;
  const amenities: string[] = Array.from(new Set<string>((h.amenities || []).map((a: string) => a.trim()))).slice(0, 4);
  const extra = Math.max(0, (h.amenities || []).length - amenities.length);
  const highlights: string[] = (h.highlights || []).slice(0, 2);
  const goodFor: string[] = (h.good_for || []).slice(0, 2);
  const where = h.locality || h.address_line1 || areaLabel;
  const map = h.latitude && h.longitude ? `https://www.google.com/maps/search/?api=1&query=${h.latitude},${h.longitude}` : null;

  return (
    <article className="group relative bg-white rounded-2xl border border-slate-200 hover:border-brand-300 hover:shadow-[0_18px_40px_-24px_rgba(15,33,56,.45)] transition-all overflow-hidden grid md:grid-cols-[minmax(0,230px)_minmax(0,1fr)_170px] xl:grid-cols-[minmax(0,290px)_minmax(0,1fr)_200px]">
      {/* photos */}
      <div className="p-3 md:pr-0 flex flex-col gap-2">
        <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-slate-100">
          {cover ? (
            <Image src={cover.url} alt={cover.alt || h.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="(max-width:768px) 100vw, 300px" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200" role="img" aria-label={h.name}>
              <Building2 className="h-10 w-10 text-slate-400" aria-hidden="true" />
            </div>
          )}
          <span className="absolute top-2 left-2 bg-white/95 text-slate-800 text-xs font-semibold px-2 py-1 rounded-md">{typeLabel}</span>
          {live && <span className="absolute top-2 right-2 bg-emerald-600 text-white text-[11px] font-semibold px-2 py-1 rounded-md inline-flex items-center gap-1"><Zap className="h-3 w-3" />{l.instant}</span>}
        </div>
        {thumbs.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {thumbs.map((p, i) => (
              <div key={p.url + i} className="relative aspect-[4/3] rounded-lg overflow-hidden bg-slate-100">
                <Image src={p.url} alt={p.alt || h.name} fill className="object-cover" sizes="90px" />
                {i === 2 && photos.length > 4 && <span className="absolute inset-0 bg-black/45 text-white text-xs font-semibold flex items-center justify-center">+{photos.length - 4}</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* details */}
      <div className="p-4 md:p-5 flex flex-col gap-2.5 min-w-0">
        <div>
          <h3 className="text-lg font-heading font-bold text-slate-900 leading-snug">
            <Link href={href} className="after:absolute after:inset-0 hover:text-brand-700">{h.name}</Link>
          </h3>
          <p className="text-sm text-slate-600 mt-1 flex items-start gap-1.5">
            <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-slate-400" />
            <span className="min-w-0"><b className="font-medium text-slate-800">{areaLabel}</b>{where && where !== areaLabel ? <> · {where}</> : null}
              {map && <> · <a href={map} target="_blank" rel="noopener noreferrer" className="relative z-10 text-brand-600 hover:underline">{l.map}</a></>}
            </span>
          </p>
        </div>
        {highlights.length > 0 && (
          <ul className="space-y-1">
            {highlights.map((x) => <li key={x} className="text-sm text-emerald-800 flex gap-1.5"><Check className="h-4 w-4 mt-0.5 shrink-0 text-emerald-600" />{x}</li>)}
          </ul>
        )}
        {amenities.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {amenities.map((a) => <li key={a} className="text-xs text-slate-700 bg-slate-100 rounded-md px-2 py-1">{a}</li>)}
            {extra > 0 && <li className="text-xs text-slate-500 px-1 py-1">{l.more.replace('{n}', String(extra))}</li>}
          </ul>
        )}
        {goodFor.length > 0 && (
          <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-auto"><Users className="h-3.5 w-3.5" />{l.goodFor}: {goodFor.join(', ')}</p>
        )}
      </div>

      {/* price panel */}
      <div className="p-4 md:p-5 border-t md:border-t-0 md:border-l border-slate-200 bg-slate-50/60 flex md:flex-col items-center md:items-end justify-between md:justify-end gap-3 text-right">
        {live ? (
          <div>
            <p className="text-2xl font-bold text-slate-900">{formatPrice(h.price_min)}</p>
            <p className="text-xs text-slate-500">{l.perNight} {h.tax_included ? '' : l.taxes}</p>
            {nights > 1 && <p className="text-xs text-slate-700 font-medium mt-1">{formatPrice(h.price_min * nights)} {l.forNights.replace('{n}', String(nights))}</p>}
          </div>
        ) : (
          <div>
            {h.price_band && (
              <p className="text-sm text-slate-700"><b className="text-slate-900 tracking-wider">{BAND_SIGNS[h.price_band] || ''}</b> <span className="text-slate-500">{l.band[h.price_band] || h.price_band}</span></p>
            )}
            <p className="text-base font-semibold text-slate-900 mt-0.5">{l.ratesOnRequest}</p>
            <p className="text-xs text-slate-500 max-w-[16ch] md:ml-auto">{l.weCheck}</p>
          </div>
        )}
        <span className={'relative z-0 shrink-0 inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors '
          + (live ? 'bg-orange-600 text-white group-hover:bg-orange-700' : 'bg-white text-brand-700 ring-1 ring-brand-300 group-hover:bg-brand-50')}>
          {live ? l.viewRooms : l.checkAvail}
        </span>
      </div>
    </article>
  );
}
