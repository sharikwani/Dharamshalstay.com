import Image from 'next/image';
import { Metadata } from 'next';
import { Breadcrumb } from '@/components/ui/Cards';
import { photoCredits } from '@/data/photo-credits';
import { generateSEO } from '@/lib/seo';

export const metadata: Metadata = generateSEO({
  title: 'Photo Credits',
  description: 'Credits and licences for the photographs of Dharamshala, McLeod Ganj and the Kangra Valley used on Dharamshala Stay.',
  path: '/photo-credits',
});

export default function PhotoCreditsPage() {
  const entries = Object.entries(photoCredits).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Photo Credits' }]} />
      <h1 className="text-3xl font-heading font-bold mb-3">Photo Credits</h1>
      <p className="text-slate-600 mb-8 max-w-3xl">
        Every place photo on this site is a real photograph of that place, taken by the photographers below and shared on
        Wikimedia Commons under free licences. We are grateful to them. Hotel photos are supplied by the properties themselves.
      </p>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {entries.map(([key, c]) => (
          <li key={key} className="flex gap-4 bg-white border border-slate-200 rounded-xl p-3">
            <div className="relative w-28 h-20 shrink-0 rounded-lg overflow-hidden bg-slate-100">
              <Image src={'/images/places/' + key + '.jpg'} alt={c.alt} fill className="object-cover" sizes="112px" />
            </div>
            <div className="text-sm min-w-0">
              <p className="font-medium text-slate-900">{c.alt}</p>
              <p className="text-slate-600">
                Photo by {c.author} &middot;{' '}
                {c.license_url ? <a href={c.license_url} target="_blank" rel="noopener noreferrer license" className="underline">{c.license}</a> : c.license}
              </p>
              <a href={c.source} target="_blank" rel="noopener noreferrer" className="text-brand-600 underline break-all">Source on Wikimedia Commons</a>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
