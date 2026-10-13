/**
 * Makes text read well in WhatsApp: markdown bold/headings/bullets/links become WhatsApp style,
 * blank lines are collapsed to one. Idempotent, and never touches URLs (payment links contain _ and *).
 */
const URL_SPLIT = /(https?:\/\/\S+)/;

function fixLine(line: string): string {
  let s = line.replace(/\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)/g, '$1: $2');
  s = s.replace(/^\s*#{1,6}\s+(.*)$/, (_m, t: string) => {
    const text = t.split(URL_SPLIT).map((x, i) => (i % 2 ? x : x.replace(/\*\*(.+?)\*\*/g, '$1'))).join('').trim();
    return URL_SPLIT.test(text) ? text : `*${text}*`;
  });
  const parts = s.split(URL_SPLIT);
  s = parts.map((p, i) => (i % 2 === 1 ? p : p.replace(/\*\*(.+?)\*\*/g, '*$1*').replace(/^(\s*)[-*•]\s+/, i === 0 ? '$1• ' : '$&'))).join('');
  return s.replace(/^\s*•\s+/, '• ').trimEnd();
}

export function tidyWhatsApp(text: string): string {
  return text.replace(/\r\n?/g, '\n').split('\n').map(fixLine).join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
