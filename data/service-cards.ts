/**
 * Verified local businesses that guides can show as a highlighted card: a line of its own like
 *   ::service-card makkar-luggage-storage-kandi
 * renders as a card in the guide (components/blog/MarkdownContent.tsx) and as a plain table in the
 * Markdown copies for AI assistants (lib/llms.ts).
 */
export type ServiceCard = {
  name: string; kind: string; area: string; price: string; features: string[];
  owner: string; phone: string; profile: string; verified: boolean;
};

export const SERVICE_CARDS: Record<string, ServiceCard> = {
  'makkar-luggage-storage-kandi': {
    name: 'Makkar Luggage Storage and Luggage Holding Services',
    kind: 'Luggage storage',
    area: 'Kandi, Dharamshala (lower Dharamshala)',
    price: 'About Rs 80 to 100 per bag per day',
    features: ['All types of luggage accepted', 'Pick-up and drop within 5 km (charged extra)', 'Hourly and day storage'],
    owner: 'Viren Makkar',
    phone: '917833000062',
    profile: '/luggage-storage/makkar-luggage-storage-kandi',
    verified: true,
  },
};

export const SERVICE_CARD_LINE = /^::service-card\s+([a-z0-9-]+)\s*$/;

export const phoneDisplay = (p: string) => '+' + p.replace(/^91(\d{5})(\d{5})$/, '91 $1 $2');

/** The same facts as a Markdown table, for the plain-text copies of a guide. */
export function serviceCardMarkdown(slug: string): string {
  const c = SERVICE_CARDS[slug];
  if (!c) return '';
  return [
    `**${c.name}**${c.verified ? ' (verified by Dharamshala Stay)' : ''}`, '',
    '| Detail | Information |', '|---|---|',
    `| Location | ${c.area} |`, `| Price | ${c.price} |`,
    ...c.features.map((f) => `| Service | ${f} |`),
    `| Contact | ${c.owner}: ${phoneDisplay(c.phone)} |`,
    `| Profile | [${c.name}](${c.profile}) |`,
  ].join('\n');
}
