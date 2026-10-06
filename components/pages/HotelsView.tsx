import { Breadcrumb } from '@/components/ui/Cards';
import HotelFilters from '@/components/hotels/HotelFilters';
import { getPublishedProperties, getDestinations } from '@/lib/db';
import { serverT } from '@/lib/i18n/server';
import { localizeDestination, localizeHotel } from '@/lib/i18n/content';
import type { Lang } from '@/lib/i18n/core';

export default async function HotelsView({ lang }: { lang: Lang }) {
  const { t } = serverT(lang);
  const [hotels, destinations] = await Promise.all([getPublishedProperties(), getDestinations()]);
  return (
    <>
      <section className="bg-brand-900 text-white py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <Breadcrumb lang={lang} items={[{ label: t.common.home, href: '/' }, { label: t.common.hotels }]} />
          <h1 className="text-3xl font-heading font-bold mt-2 mb-2">{t.hotels.h1}</h1>
          <p className="text-brand-200 max-w-2xl mb-6">{t.hotels.intro}</p>
        </div>
      </section>
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <HotelFilters hotels={hotels.map((h) => localizeHotel(h, lang))} destinations={destinations.map((d: any) => localizeDestination(d, lang))} />
        </div>
      </section>
    </>
  );
}
