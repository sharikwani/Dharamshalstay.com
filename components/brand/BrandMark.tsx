/**
 * The Dharamshala Stay logo mark: a house (shala) with Tibetan prayer flags along the roof and the
 * Dharma Wheel (dharam) at its heart. Roof and walls take the text colour (white on the navy header,
 * navy on light backgrounds); flags and wheel keep their colours. Masters: public/brand/*.svg.
 */
const MARK = `<path d="M6 30 L32 8 L58 30" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M10.00 26.30 H15.00 V32.50 Q13.75 31.50 12.50 32.50 Q11.25 33.50 10.00 32.50 Z" fill="#1d4ed8"/><path d="M19.62 18.16 H24.62 V24.36 Q23.37 23.36 22.12 24.36 Q20.87 25.36 19.62 24.36 Z" fill="#ffffff"/><path d="M29.50 12.00 H34.50 V18.20 Q33.25 17.20 32.00 18.20 Q30.75 19.20 29.50 18.20 Z" fill="#dc2626"/><path d="M39.38 18.16 H44.38 V24.36 Q43.13 23.36 41.88 24.36 Q40.63 25.36 39.38 24.36 Z" fill="#16a34a"/><path d="M49.00 26.30 H54.00 V32.50 Q52.75 31.50 51.50 32.50 Q50.25 33.50 49.00 32.50 Z" fill="#facc15"/><rect x="12" y="33.5" width="40" height="23.5" rx="2" fill="currentColor"/><circle cx="32" cy="45.2" r="7.60" fill="none" stroke="#ee5a24" stroke-width="1.90"/><circle cx="32" cy="45.2" r="5.22" fill="none" stroke="#ee5a24" stroke-width="0.76"/><circle cx="32" cy="45.2" r="2.28" fill="none" stroke="#ee5a24" stroke-width="1.52"/><circle cx="32" cy="45.2" r="0.80" fill="#ee5a24"/><line x1="34.28" y1="45.20" x2="39.60" y2="45.20" stroke="#ee5a24" stroke-width="1.42" stroke-linecap="round"/><line x1="33.61" y1="46.81" x2="37.37" y2="50.57" stroke="#ee5a24" stroke-width="1.42" stroke-linecap="round"/><line x1="32.00" y1="47.48" x2="32.00" y2="52.80" stroke="#ee5a24" stroke-width="1.42" stroke-linecap="round"/><line x1="30.39" y1="46.81" x2="26.63" y2="50.57" stroke="#ee5a24" stroke-width="1.42" stroke-linecap="round"/><line x1="29.72" y1="45.20" x2="24.40" y2="45.20" stroke="#ee5a24" stroke-width="1.42" stroke-linecap="round"/><line x1="30.39" y1="43.59" x2="26.63" y2="39.83" stroke="#ee5a24" stroke-width="1.42" stroke-linecap="round"/><line x1="32.00" y1="42.92" x2="32.00" y2="37.60" stroke="#ee5a24" stroke-width="1.42" stroke-linecap="round"/><line x1="33.61" y1="43.59" x2="37.37" y2="39.83" stroke="#ee5a24" stroke-width="1.42" stroke-linecap="round"/>`;

export default function BrandMark({ className = 'h-8 w-8', title }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}
      dangerouslySetInnerHTML={{ __html: MARK }} />
  );
}
