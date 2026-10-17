import Link from 'next/link';
import Image from 'next/image';
import { Eye, Heart, MapPin } from 'lucide-react';
import { FLAG_COLORS, excerptOf } from '@/lib/stories/rules';
import type { PublicStory } from '@/lib/stories/store';

const n = (x: number) => (x >= 1000 ? (x / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : String(x));

export function KindBadge({ kind, className = '' }: { kind: string; className?: string }) {
  return (
    <span className={'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ' + (kind === 'local' ? 'bg-emerald-100 text-emerald-800' : 'bg-sky-100 text-sky-800') + ' ' + className}>
      {kind === 'local' ? 'Local' : 'Traveller'}
    </span>
  );
}

export function FlagCount({ count }: { count: number }) {
  return (
    <span className="inline-flex items-center gap-1.5" title="Prayer flags tied">
      <span className="flex gap-[2px]" aria-hidden="true">{FLAG_COLORS.map((f) => <i key={f.key} className="block h-3 w-[4px] rounded-[1px]" style={{ background: f.hex, outline: f.key === 'white' ? '1px solid #ccc' : undefined }} />)}</span>
      {n(count)}<span className="sr-only">prayer flags</span>
    </span>
  );
}

export default function StoryCard({ s, priority = false }: { s: PublicStory; priority?: boolean }) {
  return (
    <Link href={`/stories/${s.slug}`} className="group flex h-full flex-col overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-1 hover:shadow-xl">
      <div className="relative aspect-[4/3] overflow-hidden bg-brand-100">
        {s.photos[0] && <Image src={s.photos[0]} alt={s.title} fill sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw" className="object-cover transition duration-700 group-hover:scale-105" priority={priority} />}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/55 to-transparent" />
        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-slate-800 backdrop-blur"><MapPin className="h-3.5 w-3.5 text-orange-500" />{s.place}</span>
        {s.featured_at && <span className="absolute right-3 top-3 rounded-full bg-[#e3b76a] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[#0c1726]">Featured</span>}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="st-display text-xl leading-snug text-slate-900 group-hover:text-brand-700">{s.title}</h3>
        <p className="mt-2 line-clamp-3 text-sm text-slate-600">{excerptOf(s.body, 160)}</p>
        <div className="mt-auto flex items-center gap-3 pt-4">
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-brand-900 text-sm font-semibold text-white">{s.author_name.slice(0, 1).toUpperCase()}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-800">{s.author_name}</p>
            <KindBadge kind={s.author_kind} />
          </div>
          <div className="flex flex-none items-center gap-3 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{n(s.views)}</span>
            <span className="inline-flex items-center gap-1"><Heart className="h-3.5 w-3.5" />{n(s.likes)}</span>
            <FlagCount count={s.flags} />
          </div>
        </div>
      </div>
    </Link>
  );
}
