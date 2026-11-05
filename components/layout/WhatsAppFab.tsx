'use client';
import { usePathname } from 'next/navigation';
import { getWhatsAppLink } from '@/lib/utils';
import { topicForPath } from '@/lib/leads/topics';
import WhatsAppGreeting from './WhatsAppGreeting';

/**
 * The floating WhatsApp button. On English pages the greeting and the ready-made first message match
 * the page (a taxi guide asks for a fare, a trek guide for trail conditions); Hindi pages keep the
 * general Hindi text.
 */
export default function WhatsAppFab({ hindi, title, greeting, message, label, closeLabel, icon }: {
  hindi: boolean; title: string; greeting: string; message: string; label: string; closeLabel: string; icon: React.ReactNode;
}) {
  const path = usePathname() || '/';
  const topic = hindi ? null : topicForPath(path);
  return (
    <div className="wa-fab">
      <WhatsAppGreeting title={title} text={topic?.greet || greeting} closeLabel={closeLabel} />
      <a href={getWhatsAppLink(topic?.wa || message)} target="_blank" rel="noopener noreferrer" aria-label={label} className="wa-btn" data-lead={topic?.key || 'trip'}>
        {icon}
      </a>
    </div>
  );
}
