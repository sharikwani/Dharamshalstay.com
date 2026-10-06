import { MessageCircle } from 'lucide-react';
import { getWhatsAppLink } from '@/lib/utils';
import { getDict } from '@/lib/i18n/dict';
import type { Lang } from '@/lib/i18n/core';

export default function WhatsAppButton({ lang }: { lang: Lang }) {
  const h = getDict(lang).home;
  return (
    <a href={getWhatsAppLink(h.ctaMsg)} target="_blank" rel="noopener noreferrer" aria-label={h.ctaWhatsApp}
      className="fixed bottom-5 right-5 z-50 flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white p-3.5 sm:pl-4 sm:pr-5 sm:py-3 rounded-full shadow-lg hover:shadow-xl transition-all">
      <MessageCircle className="h-5 w-5" aria-hidden="true" /><span className="text-sm font-medium hidden sm:inline">{h.ctaWhatsApp}</span>
    </a>
  );
}
