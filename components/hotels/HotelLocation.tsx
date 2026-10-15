import { MapPin, Navigation, ExternalLink, Phone } from 'lucide-react';
import { formatAddress, hasCoordinates, mapLinks, propertyMapUrl, type Located } from '@/lib/location';
import { serverT } from '@/lib/i18n/server';
import { fmt } from '@/lib/i18n/dict';
import type { Lang } from '@/lib/i18n/core';

/** Public location block for a hotel page: address, landmark, map and directions. Never the phone. */
export default function HotelLocation({ hotel, lang }: { hotel: Located & { name: string }; lang: Lang }) {
  const { t } = serverT(lang);
  const p = t.hotel;
  const pinned = hasCoordinates(hotel);
  const links = pinned ? mapLinks(hotel.latitude!, hotel.longitude!) : null;

  return (
    <section id="location" className="mb-10 scroll-mt-24">
      <h2 className="text-xl font-heading font-bold text-slate-900 mb-4">{p.location}</h2>
      <div className="rounded-2xl border border-slate-200 overflow-hidden">
        {links && (
          <iframe
            src={links.embed}
            title={fmt(p.mapTitle, { name: hotel.name })}
            className="w-full h-64 sm:h-80 border-0 block"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        )}
        <div className="p-5 space-y-3">
          <p className="flex items-start gap-2 text-slate-800">
            <MapPin className="h-5 w-5 text-brand-500 shrink-0 mt-0.5" />
            <span>{formatAddress(hotel)}</span>
          </p>
          {hotel.landmark && (
            <p className="text-sm text-slate-600 pl-7"><span className="font-medium">{p.landmark}:</span> {hotel.landmark}</p>
          )}
          <div className="flex flex-wrap gap-2 pl-7">
            {links && (
              <a href={links.directions} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-brand-700">
                <Navigation className="h-4 w-4" /> {p.directions}
              </a>
            )}
            <a href={propertyMapUrl(hotel)} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-50">
              {p.openMap} <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
          <p className="flex items-center gap-2 text-xs text-slate-500 pl-7">
            <Phone className="h-3.5 w-3.5" /> {p.phoneAfterBooking}
          </p>
        </div>
      </div>
    </section>
  );
}
