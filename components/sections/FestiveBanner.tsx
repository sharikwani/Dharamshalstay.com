import Link from 'next/link';
import { Sparkles, MessageCircle, ArrowRight } from 'lucide-react';
import { activeCampaign } from '@/data/festive';
import { getWhatsAppLink } from '@/lib/utils';
import type { Lang } from '@/lib/i18n/core';

/** Slim seasonal strip (Diwali, then Christmas / New Year). Renders nothing outside a campaign window. */
export default function FestiveBanner({ lang = 'en', className = '' }: { lang?: Lang; className?: string }) {
  const c = activeCampaign();
  if (!c) return null;
  return (
    <aside aria-label={c.guide.label[lang]} className={'bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white ' + className}>
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-2.5 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
        <p className="flex items-start gap-2 text-sm font-medium flex-1 min-w-0">
          <Sparkles className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{c.text[lang]}</span>
        </p>
        <div className="flex gap-2 shrink-0">
          <Link href={c.guide.href} className="inline-flex items-center gap-1 rounded-full bg-white !text-orange-700 px-3.5 py-1.5 text-sm font-semibold hover:bg-orange-50">
            {c.guide.label[lang]} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <a href={getWhatsAppLink(c.whatsapp[lang])} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full border border-white/70 !text-white px-3.5 py-1.5 text-sm font-semibold hover:bg-white/10">
            <MessageCircle className="h-3.5 w-3.5" /> {lang === 'hi' ? 'WhatsApp' : 'Ask on WhatsApp'}
          </a>
        </div>
      </div>
    </aside>
  );
}
