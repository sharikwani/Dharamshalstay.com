/**
 * The one branded HTML design every email uses (transactional, marketing and admin).
 * Table-based with inline styles so it renders the same in Gmail, Outlook, Apple Mail and phones.
 * Content is passed as typed blocks, never raw HTML from users or the AI, and every string is escaped.
 */
import { siteConfig } from '@/lib/config';

export const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

/** Escapes, then allows **bold** and [label](https://link) so copy can carry light emphasis and links. */
export function inline(text: string): string {
  return esc(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#0f172a;">$1</strong>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+|\/[^)\s]*)\)/g, (_m, label, href) =>
      `<a href="${absUrl(href.replace(/&amp;/g, '&'))}" style="color:#1e3a5f;text-decoration:underline;">${label}</a>`);
}

export const SITE = () => siteConfig.url.replace(/\/$/, '');
export function absUrl(href: string): string {
  if (/^https?:\/\//i.test(href)) return esc(href);
  return esc(SITE() + (href.startsWith('/') ? href : '/' + href));
}

export type Tone = 'info' | 'success' | 'warning' | 'festive';
export type Photo = { src: string; alt: string; caption?: string; href?: string };
export type Block =
  | { type: 'p'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'details'; title?: string; rows: [string, string][] }
  | { type: 'list'; items: string[]; ordered?: boolean }
  | { type: 'checks'; items: string[] }
  | { type: 'callout'; tone?: Tone; title?: string; text: string }
  | { type: 'button'; label: string; href: string; secondary?: { label: string; href: string } }
  | { type: 'photos'; photos: Photo[] }
  | { type: 'feature'; photo: Photo; title: string; text: string; cta?: { label: string; href: string } }
  | { type: 'divider' }
  | { type: 'small'; text: string }
  /** Server-built HTML that is already escaped. Never pass user or AI text here. */
  | { type: 'raw'; html: string };

export type EmailDoc = {
  preheader?: string;
  kicker?: string;
  heading: string;
  hero?: Photo;
  blocks: Block[];
  /** marketing adds the unsubscribe line; transactional explains why they got it. */
  footer: { kind: 'transactional' | 'marketing' | 'admin'; unsubscribeUrl?: string };
  greeting?: string;
  signoff?: boolean;
};

const NAVY = '#1e3a5f';
const TONES: Record<Tone, { bg: string; border: string; title: string; text: string }> = {
  info: { bg: '#f8fafc', border: '#e2e8f0', title: NAVY, text: '#334155' },
  success: { bg: '#f0fdf4', border: '#bbf7d0', title: '#166534', text: '#14532d' },
  warning: { bg: '#fffbeb', border: '#fde68a', title: '#92400e', text: '#78350f' },
  festive: { bg: '#fff7ed', border: '#fed7aa', title: '#9a3412', text: '#431407' },
};

const P = 'margin:0 0 14px;font-size:15px;line-height:1.65;color:#334155;';

function img(p: Photo, h: number, radius = 10) {
  const tag = `<img src="${absUrl(p.src)}" alt="${esc(p.alt)}" width="100%" style="display:block;width:100%;height:${h}px;object-fit:cover;border:0;border-radius:${radius}px;background:#e2e8f0;">`;
  return p.href ? `<a href="${absUrl(p.href)}" style="text-decoration:none;">${tag}</a>` : tag;
}

function button(label: string, href: string, secondary = false) {
  const bg = secondary ? '#ffffff' : NAVY, color = secondary ? NAVY : '#ffffff', border = secondary ? `border:1.5px solid ${NAVY};` : '';
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="display:inline-table;margin:4px 6px;"><tr><td style="background:${bg};border-radius:8px;${border}"><a href="${absUrl(href)}" style="display:inline-block;padding:13px 26px;font-size:15px;font-weight:700;color:${color};text-decoration:none;">${esc(label)}</a></td></tr></table>`;
}

function renderBlock(b: Block): string {
  switch (b.type) {
    case 'raw': return `<div style="font-size:15px;line-height:1.65;color:#334155;">${b.html}</div>`;
    case 'p': return `<p style="${P}">${inline(b.text)}</p>`;
    case 'h2': return `<h2 style="margin:22px 0 10px;font-size:18px;line-height:1.35;color:#0f172a;">${esc(b.text)}</h2>`;
    case 'small': return `<p style="margin:0 0 12px;font-size:13px;line-height:1.6;color:#64748b;">${inline(b.text)}</p>`;
    case 'divider': return `<div style="border-top:1px solid #e2e8f0;margin:22px 0;"></div>`;
    case 'list': {
      const tag = b.ordered ? 'ol' : 'ul';
      return `<${tag} style="margin:0 0 14px;padding-left:22px;font-size:15px;line-height:1.75;color:#334155;">${b.items.map((i) => `<li>${inline(i)}</li>`).join('')}</${tag}>`;
    }
    case 'checks':
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#334155;">${b.items.map((i) => `<tr><td width="26" valign="top" style="color:#16a34a;font-weight:700;padding:3px 0;">&#10003;</td><td style="padding:3px 0;">${inline(i)}</td></tr>`).join('')}</table>`;
    case 'details':
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 18px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;">
        ${b.title ? `<tr><td colspan="2" style="padding:16px 20px 4px;font-size:12px;font-weight:700;color:${NAVY};text-transform:uppercase;letter-spacing:.6px;">${esc(b.title)}</td></tr>` : ''}
        ${b.rows.map(([k, v], i) => `<tr><td style="padding:9px 20px;font-size:14px;color:#64748b;width:38%;${i < b.rows.length - 1 ? 'border-bottom:1px solid #e2e8f0;' : ''}">${esc(k)}</td><td style="padding:9px 20px 9px 0;font-size:15px;font-weight:600;color:#0f172a;${i < b.rows.length - 1 ? 'border-bottom:1px solid #e2e8f0;' : ''}">${inline(v)}</td></tr>`).join('')}
      </table>`;
    case 'callout': {
      const t = TONES[b.tone || 'info'];
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 18px;background:${t.bg};border:1px solid ${t.border};border-radius:10px;"><tr><td style="padding:16px 20px;">
        ${b.title ? `<p style="margin:0 0 6px;font-size:14px;font-weight:700;color:${t.title};">${esc(b.title)}</p>` : ''}
        <p style="margin:0;font-size:14.5px;line-height:1.6;color:${t.text};">${inline(b.text)}</p></td></tr></table>`;
    }
    case 'button':
      return `<div style="text-align:center;margin:22px 0 18px;">${button(b.label, b.href)}${b.secondary ? button(b.secondary.label, b.secondary.href, true) : ''}</div>`;
    case 'photos': {
      const ps = b.photos.slice(0, 3);
      if (!ps.length) return '';
      const w = Math.floor(100 / ps.length);
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 18px;"><tr>${ps.map((p, i) => `<td width="${w}%" valign="top" style="padding:0 ${i < ps.length - 1 ? 6 : 0}px 0 ${i ? 6 : 0}px;">${img(p, ps.length === 1 ? 260 : 150)}${p.caption ? `<p style="margin:6px 0 0;font-size:12.5px;line-height:1.4;color:#64748b;text-align:center;">${esc(p.caption)}</p>` : ''}</td>`).join('')}</tr></table>`;
    }
    case 'feature':
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 20px;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;"><tr><td>${img(b.photo, 220, 0)}</td></tr><tr><td style="padding:16px 20px 18px;">
        <p style="margin:0 0 6px;font-size:17px;font-weight:700;color:#0f172a;">${esc(b.title)}</p>
        <p style="margin:0 0 ${b.cta ? 12 : 0}px;font-size:14.5px;line-height:1.6;color:#334155;">${inline(b.text)}</p>
        ${b.cta ? `<a href="${absUrl(b.cta.href)}" style="font-size:14.5px;font-weight:700;color:${NAVY};text-decoration:none;">${esc(b.cta.label)} &rarr;</a>` : ''}</td></tr></table>`;
  }
}

export function renderEmail(doc: EmailDoc): string {
  const site = SITE();
  const footerNote = doc.footer.kind === 'marketing'
    ? `You are receiving this because you asked for travel ideas and offers from Dharamshala Stay. <a href="${esc(doc.footer.unsubscribeUrl || site + '/email/unsubscribe')}" style="color:#64748b;text-decoration:underline;">Unsubscribe</a> at any time.`
    : doc.footer.kind === 'transactional'
      ? 'You are receiving this email about a booking, enquiry or listing with Dharamshala Stay.'
      : 'Internal notification from the Dharamshala Stay website.';

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(doc.heading)}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;">
${doc.preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#f1f5f9;">${esc(doc.preheader)}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>` : ''}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f1f5f9;"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
  <tr><td style="background:${NAVY};padding:22px 32px;">
    <a href="${esc(site)}" style="text-decoration:none;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="padding-right:12px;vertical-align:middle;"><img src="${esc(site)}/brand/email-mark.png" width="44" height="44" alt="" style="display:block;border:0;width:44px;height:44px;"></td>
      <td style="vertical-align:middle;"><span style="font-size:21px;font-weight:700;color:#ffffff;letter-spacing:.2px;">Dharamshala <span style="color:#f47e52;">Stay</span></span>
      <span style="display:block;margin-top:3px;font-size:12.5px;color:#c7d6ea;">Local travel and hotel guide for Dharamshala &amp; McLeod Ganj</span></td>
    </tr></table></a>
  </td></tr>
  ${doc.hero ? `<tr><td>${img(doc.hero, 260, 0)}</td></tr>` : ''}
  <tr><td style="padding:28px 32px 8px;">
    ${doc.kicker ? `<p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#b45309;">${esc(doc.kicker)}</p>` : ''}
    <h1 style="margin:0 0 18px;font-size:23px;line-height:1.3;color:#0f172a;">${esc(doc.heading)}</h1>
    ${doc.greeting ? `<p style="${P}">${esc(doc.greeting)}</p>` : ''}
    ${doc.blocks.map(renderBlock).join('\n')}
    ${doc.signoff === false ? '' : `<p style="${P}margin-top:6px;">Questions? Just reply to this email, or WhatsApp us on <a href="https://wa.me/${siteConfig.whatsapp}" style="color:${NAVY};">${esc(siteConfig.whatsappDisplay)}</a>.</p>
    <p style="${P}">Warm regards,<br><strong style="color:#0f172a;">Team Dharamshala Stay</strong></p>`}
  </td></tr>
  <tr><td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:18px 32px;font-size:12px;line-height:1.6;color:#64748b;">
    <strong style="color:#334155;">Dharamshala Stay</strong> &middot; VPO Khaniyara, Dharamshala, Kangra District, Himachal Pradesh 176215, India<br>
    <a href="${esc(site)}" style="color:${NAVY};">dharamshalastay.com</a> &middot; <a href="mailto:support@dharamshalastay.com" style="color:${NAVY};">support@dharamshalastay.com</a><br>
    <span style="display:block;margin-top:8px;">${footerNote}</span>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

const htmlToText = (h: string) => h
  .replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|tr|h\d|li|div)>/gi, '\n').replace(/<[^>]+>/g, '')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/\n{3,}/g, '\n\n').trim();

/** Plain-text version (better deliverability, and what some watches/clients show). */
export function renderText(doc: EmailDoc): string {
  const strip = (s: string) => s.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, l, h) => `${l} (${/^https?:/.test(h) ? h : SITE() + h})`);
  const lines: string[] = [doc.heading, ''];
  if (doc.greeting) lines.push(doc.greeting, '');
  for (const b of doc.blocks) {
    if (b.type === 'p' || b.type === 'small') lines.push(strip(b.text), '');
    else if (b.type === 'raw') lines.push(htmlToText(b.html), '');
    else if (b.type === 'h2') lines.push(b.text.toUpperCase(), '');
    else if (b.type === 'details') { if (b.title) lines.push(b.title); b.rows.forEach(([k, v]) => lines.push(`${k}: ${strip(v)}`)); lines.push(''); }
    else if (b.type === 'list' || b.type === 'checks') { b.items.forEach((i, n) => lines.push(`${b.type === 'list' && b.ordered ? n + 1 + '.' : '-'} ${strip(i)}`)); lines.push(''); }
    else if (b.type === 'callout') lines.push((b.title ? b.title + ': ' : '') + strip(b.text), '');
    else if (b.type === 'button') { lines.push(`${b.label}: ${/^https?:/.test(b.href) ? b.href : SITE() + b.href}`); if (b.secondary) lines.push(`${b.secondary.label}: ${/^https?:/.test(b.secondary.href) ? b.secondary.href : SITE() + b.secondary.href}`); lines.push(''); }
    else if (b.type === 'feature') lines.push(b.title, strip(b.text), b.cta ? `${b.cta.label}: ${/^https?:/.test(b.cta.href) ? b.cta.href : SITE() + b.cta.href}` : '', '');
  }
  if (doc.signoff !== false) lines.push(`Questions? Reply to this email or WhatsApp us on ${siteConfig.whatsappDisplay}.`, '', 'Team Dharamshala Stay');
  lines.push('', 'Dharamshala Stay, VPO Khaniyara, Dharamshala, Himachal Pradesh 176215, India');
  if (doc.footer.kind === 'marketing') lines.push(`Unsubscribe: ${doc.footer.unsubscribeUrl || SITE() + '/email/unsubscribe'}`);
  return lines.join('\n');
}
