import Link from 'next/link';
import { Fragment, type ReactNode } from 'react';
import { localizePath, type Lang } from '@/lib/i18n/core';
import { OWN_PHOTO, photoCredits } from '@/data/photo-credits';
import { SERVICE_CARDS, SERVICE_CARD_LINE, phoneDisplay } from '@/data/service-cards';

/**
 * Renders the small markdown subset our guides are written in:
 * ## / ### headings, paragraphs, - bullet lists, 1. numbered lists,
 * pipe tables, and inline **bold**, [internal](/path) and [external](https://) links.
 * A line of its own like ![Caption](/images/places/<key>.jpg) is a photo with its caption and credit.
 * Legacy posts may still contain raw <a href> tags; those are converted too.
 */

const INLINE = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)\s]+\)|<a\s[^>]*href="[^"]+"[^>]*>[^<]*<\/a>)/g;

/**
 * Heading id for in-page anchors and the table of contents.
 *
 * Keeps Devanagari (ऀ-ॿ) as well as ASCII: stripping it left every
 * Hindi heading with an empty id, so every entry in a translated guide's table
 * of contents rendered as href="#" and navigated nowhere. Non-ASCII ids are
 * valid HTML and browsers percent-encode them in the fragment.
 *
 * The fallback keeps a heading addressable when it survives as nothing at all
 * (punctuation or emoji only). It hashes the text rather than counting
 * headings, so the id is identical whether it comes from here or from
 * extractHeadings, which walk the content separately.
 */
export function slugifyHeading(text: string): string {
  const slug = text
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[^a-z0-9ऀ-ॿ\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80);
  if (slug.replace(/-/g, '')) return slug;
  let hash = 0;
  for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) | 0;
  return 'section-' + Math.abs(hash).toString(36);
}

function renderLink(label: ReactNode, href: string, key: string, lang: Lang, rel?: string) {
  const cls = 'text-brand-600 font-medium hover:text-brand-700 underline underline-offset-2';
  if (href.startsWith('/') || href.startsWith('#')) {
    // Internal links stay in the reader's language when a translated page exists.
    return <Link key={key} href={href.startsWith('/') ? localizePath(href, lang) : href} className={cls}>{label}</Link>;
  }
  return (
    <a key={key} href={href} className={cls} target="_blank" rel={rel || 'noopener noreferrer'}>{label}</a>
  );
}

function inline(text: string, keyPrefix: string, lang: Lang): ReactNode[] {
  return text.split(INLINE).filter(Boolean).map((part, i) => {
    const key = keyPrefix + '-' + i;
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={key} className="text-slate-800 font-semibold">{inline(part.slice(2, -2), key, lang)}</strong>;
    }
    const md = part.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
    if (md) return renderLink(inline(md[1], key, lang), md[2], key, lang);
    const html = part.match(/^<a\s[^>]*href="([^"]+)"[^>]*>([^<]*)<\/a>$/);
    if (html) {
      const relMatch = part.match(/rel="([^"]+)"/);
      // "dofollow" is not a real rel value; drop it but keep noopener for target=_blank.
      const rel = relMatch && relMatch[1] !== 'dofollow' ? relMatch[1] + ' noopener' : 'noopener';
      return renderLink(html[2], html[1], key, lang, rel);
    }
    return <Fragment key={key}>{part}</Fragment>;
  });
}

function splitRow(line: string): string[] {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
}

export default function MarkdownContent({ content, lang = 'en' }: { content: string; lang?: Lang }) {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const out: ReactNode[] = [];
  let i = 0;
  let n = 0;

  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) { i++; continue; }
    const key = 'b' + n++;

    if (line.startsWith('### ')) {
      const t = line.slice(4).trim();
      out.push(<h3 key={key} id={slugifyHeading(t)} className="text-lg font-heading font-semibold text-slate-900 mt-7 mb-2 scroll-mt-24">{inline(t, key, lang)}</h3>);
      i++; continue;
    }
    if (line.startsWith('## ')) {
      const t = line.slice(3).trim();
      out.push(<h2 key={key} id={slugifyHeading(t)} className="text-2xl font-heading font-bold text-slate-900 mt-10 mb-3 scroll-mt-24">{inline(t, key, lang)}</h2>);
      i++; continue;
    }

    // A verified local business as a highlighted card (data/service-cards.ts).
    const svc = line.match(SERVICE_CARD_LINE);
    if (svc && SERVICE_CARDS[svc[1]]) {
      const c = SERVICE_CARDS[svc[1]];
      const wa = `https://wa.me/${c.phone}?text=${encodeURIComponent('Hi, I found you on Dharamshala Stay. I would like to store my luggage.')}`;
      out.push(
        <div key={key} className="not-prose my-8 overflow-hidden rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-[#0c1726] to-[#13243b] text-white shadow-xl">
          <div className="p-6 sm:p-7">
            {c.verified && <p className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 px-3 py-1 text-xs font-bold tracking-wider text-amber-300">✔ VERIFIED BY DHARAMSHALA STAY</p>}
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-white/60">{c.kind}</p>
            <p className="mt-1 font-heading text-2xl font-bold leading-tight">{c.name}</p>
            <p className="mt-1 text-white/80">{c.area}</p>
            <p className="mt-4 text-xl font-bold text-amber-300">{c.price}</p>
            <ul className="mt-3 space-y-1.5">{c.features.map((f) => <li key={f} className="flex gap-2 text-white/90"><span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-amber-300" />{f}</li>)}</ul>
            <p className="mt-4 text-white/80">Run by <strong className="text-white">{c.owner}</strong>: {phoneDisplay(c.phone)}</p>
          </div>
          <div className="flex flex-wrap gap-2 border-t border-white/10 bg-white/5 px-6 py-4 sm:px-7">
            <a href={'tel:+' + c.phone} className="rounded-xl bg-amber-300 px-5 py-2.5 font-semibold text-[#0c1726] no-underline hover:bg-amber-200">Call {c.owner.split(' ')[0]}</a>
            <a href={wa} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-green-600 px-5 py-2.5 font-semibold text-white no-underline hover:bg-green-700">WhatsApp</a>
            <Link href={localizePath(c.profile, lang)} className="rounded-xl border border-white/40 px-5 py-2.5 font-semibold text-white no-underline hover:bg-white/10">View profile</Link>
          </div>
        </div>
      );
      i++; continue;
    }

    // Photo: one of our self-hosted, credited place photos (data/photo-credits.ts).
    const img = line.match(/^!\[([^\]]*)\]\((\/images\/places\/([a-z0-9-]+)\.jpg)\)$/);
    if (img) {
      const credit = photoCredits[img[3]];
      out.push(
        <figure key={key} className="my-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img[2]} alt={credit?.alt || img[1]} loading="lazy" decoding="async" className="w-full rounded-2xl object-cover max-h-[520px] bg-slate-100" />
          <figcaption className="mt-2 text-sm text-slate-500">
            {img[1]}
            {credit && credit.license === OWN_PHOTO && <span className="block text-xs text-slate-400">Photo: {credit.author}{credit.instagram && <> (<a href={'https://www.instagram.com/' + credit.instagram + '/'} target="_blank" rel="noopener noreferrer" className="underline">@{credit.instagram}</a>)</>}</span>}
            {credit && credit.license !== OWN_PHOTO && <span className="block text-xs text-slate-400">Photo: {credit.author}, <a href={credit.source} target="_blank" rel="noopener noreferrer" className="underline">{credit.license}</a></span>}
          </figcaption>
        </figure>
      );
      i++; continue;
    }

    // Table: header row followed by a |---| separator row
    if (line.startsWith('|') && i + 1 < lines.length && /^\|?\s*:?-{2,}/.test(lines[i + 1].trim())) {
      const head = splitRow(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) { rows.push(splitRow(lines[i])); i++; }
      out.push(
        <div key={key} className="overflow-x-auto my-6 rounded-xl border border-slate-200">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-800">
              <tr>{head.map((h, hi) => <th key={hi} className="px-4 py-3 font-semibold whitespace-nowrap">{inline(h, key + 'h' + hi, lang)}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              {rows.map((r, ri) => (
                <tr key={ri}>{r.map((c, ci) => <td key={ci} className="px-4 py-3 align-top">{inline(c, key + 'r' + ri + 'c' + ci, lang)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    if (/^[-*] /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*] /.test(lines[i].trim())) { items.push(lines[i].trim().slice(2)); i++; }
      out.push(
        <ul key={key} className="list-disc pl-6 space-y-1.5 mb-5 text-slate-600 leading-relaxed marker:text-brand-500">
          {items.map((it, ii) => <li key={ii}>{inline(it, key + 'l' + ii, lang)}</li>)}
        </ul>
      );
      continue;
    }

    if (/^\d+\. /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\. /.test(lines[i].trim())) { items.push(lines[i].trim().replace(/^\d+\. /, '')); i++; }
      out.push(
        <ol key={key} className="list-decimal pl-6 space-y-1.5 mb-5 text-slate-600 leading-relaxed marker:font-semibold marker:text-slate-500">
          {items.map((it, ii) => <li key={ii}>{inline(it, key + 'l' + ii, lang)}</li>)}
        </ol>
      );
      continue;
    }

    // Paragraph: gather until blank line or a block-level start
    const para: string[] = [];
    while (i < lines.length) {
      const l = lines[i].trim();
      if (!l || l.startsWith('#') || l.startsWith('|') || l.startsWith('![') || /^[-*] /.test(l) || /^\d+\. /.test(l)) break;
      para.push(l); i++;
    }
    out.push(<p key={key} className="text-slate-600 leading-relaxed mb-4">{inline(para.join(' '), key, lang)}</p>);
  }

  return <>{out}</>;
}

/** H2 headings, for an on-page table of contents. */
export function extractHeadings(content: string): { id: string; text: string }[] {
  return content.split('\n')
    .filter((l) => l.trim().startsWith('## '))
    .map((l) => {
      const text = l.trim().slice(3).replace(/\*\*/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim();
      return { id: slugifyHeading(text), text };
    });
}
