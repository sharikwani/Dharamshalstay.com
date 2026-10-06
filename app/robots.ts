import { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/config';

const PRIVATE = ['/api/', '/admin/', '/partner/', '/account', '/auth/', '/booking/'];

/**
 * AI crawlers and assistants named explicitly so there's no doubt they're
 * welcome: being quoted by ChatGPT, Claude, Perplexity and Gemini is how many
 * travellers now find hotels. They also get /llms.txt and /llms-full.txt.
 * To opt out of AI training only, move GPTBot / ClaudeBot / Google-Extended /
 * CCBot / Applebot-Extended / Meta-ExternalAgent to a `disallow: '/'` rule.
 */
const AI_BOTS = [
  'GPTBot', 'OAI-SearchBot', 'ChatGPT-User',
  'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'anthropic-ai',
  'PerplexityBot', 'Perplexity-User',
  'Google-Extended', 'GoogleOther',
  'Applebot', 'Applebot-Extended',
  'Bingbot', 'DuckAssistBot', 'MistralAI-User',
  'Meta-ExternalAgent', 'Meta-ExternalFetcher', 'FacebookBot',
  'Amazonbot', 'cohere-ai', 'YouBot', 'CCBot',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: PRIVATE },
      { userAgent: AI_BOTS, allow: ['/', '/llms.txt', '/llms-full.txt'], disallow: PRIVATE },
    ],
    sitemap: siteConfig.url + '/sitemap.xml',
    host: siteConfig.url,
  };
}
