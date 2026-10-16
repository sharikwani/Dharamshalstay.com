import './festive.css';

/** Seasonal looks for festival guides. Pure SVG/CSS, decorative only (aria-hidden). */
export const FESTIVE_POSTS: Record<string, 'diwali'> = {
  'diwali-in-dharamshala': 'diwali',
};

/** Marigold and mango-leaf toran hanging across the top of the header. */
export function Toran() {
  return (
    <svg className="fx-toran" aria-hidden="true" width="100%" height="64" preserveAspectRatio="none">
      <defs>
        <radialGradient id="fx-mari" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#ffd34d" />
          <stop offset="55%" stopColor="#ffa31a" />
          <stop offset="100%" stopColor="#e86a00" />
        </radialGradient>
        <pattern id="fx-toran-p" width="72" height="64" patternUnits="userSpaceOnUse">
          <path d="M0 6 Q36 30 72 6" fill="none" stroke="#7a3d12" strokeWidth="1.6" />
          <ellipse cx="18" cy="20" rx="5" ry="11" transform="rotate(-28 18 20)" fill="#2f7d32" />
          <ellipse cx="54" cy="20" rx="5" ry="11" transform="rotate(28 54 20)" fill="#3b9a3f" />
          <line x1="36" y1="18" x2="36" y2="40" stroke="#7a3d12" strokeWidth="1.2" />
          <circle cx="36" cy="22" r="7.5" fill="url(#fx-mari)" />
          <circle cx="36" cy="38" r="9" fill="url(#fx-mari)" />
          <circle cx="36" cy="38" r="3.2" fill="#c2410c" opacity=".55" />
          <circle cx="36" cy="52" r="4" fill="#e11d48" />
        </pattern>
      </defs>
      <rect width="100%" height="64" fill="url(#fx-toran-p)" />
    </svg>
  );
}

function Diya({ delay }: { delay: number }) {
  return (
    <svg className="fx-diya" viewBox="0 0 64 56" width="54" height="47" aria-hidden="true" style={{ animationDelay: delay + 's' }}>
      <defs>
        <radialGradient id="fx-flame" cx="50%" cy="70%" r="60%">
          <stop offset="0%" stopColor="#fff7cc" />
          <stop offset="45%" stopColor="#ffc93c" />
          <stop offset="100%" stopColor="#ff7a00" />
        </radialGradient>
        <linearGradient id="fx-clay" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#d9692b" />
          <stop offset="100%" stopColor="#8a3412" />
        </linearGradient>
      </defs>
      <circle className="fx-glow" cx="32" cy="22" r="18" fill="#ffb02e" opacity=".25" />
      <path className="fx-flame" d="M32 6 C38 16 38 24 32 30 C26 24 26 16 32 6 Z" fill="url(#fx-flame)" style={{ animationDelay: delay + 's' }} />
      <path d="M4 32 Q32 30 60 32 Q56 50 32 52 Q8 50 4 32 Z" fill="url(#fx-clay)" />
      <path d="M10 36 Q32 40 54 36" fill="none" stroke="#f6c26b" strokeWidth="1.5" strokeDasharray="2 3" />
    </svg>
  );
}

/** A row of flickering diyas, used as a divider. */
export function DiyaRow({ count = 7, className = '' }: { count?: number; className?: string }) {
  return (
    <div className={'fx-diyas ' + className} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => <Diya key={i} delay={(i * 0.37) % 1.4} />)}
    </div>
  );
}

/** Rangoli-style ornament for section breaks. */
export function Rangoli({ className = '' }: { className?: string }) {
  const petals = Array.from({ length: 8 }, (_, i) => i * 45);
  return (
    <svg className={'fx-rangoli ' + className} viewBox="0 0 120 120" width="72" height="72" aria-hidden="true">
      {petals.map((a) => <ellipse key={'o' + a} cx="60" cy="28" rx="10" ry="22" fill="#f97316" opacity=".85" transform={`rotate(${a} 60 60)`} />)}
      {petals.map((a) => <ellipse key={'i' + a} cx="60" cy="40" rx="6" ry="13" fill="#facc15" transform={`rotate(${a + 22.5} 60 60)`} />)}
      <circle cx="60" cy="60" r="14" fill="#be123c" />
      <circle cx="60" cy="60" r="6" fill="#fde68a" />
    </svg>
  );
}
