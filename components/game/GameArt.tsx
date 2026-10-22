import type { GameType } from '@/lib/game/party';

/** Big illustrated icons for the four party games, drawn in SVG so they stay sharp at any size. */
export default function GameArt({ game, className = '' }: { game: GameType; className?: string }) {
  const common = { viewBox: '0 0 200 200', className, 'aria-hidden': true, focusable: false } as const;
  if (game === 'tambola') {
    // A housie ticket with marked numbers, and a called number ball.
    const rows = [[4, 0, 23, 0, 41, 0, 67, 0, 85], [0, 12, 0, 38, 0, 56, 0, 72, 0], [9, 0, 27, 0, 49, 0, 0, 78, 90]];
    const marked = new Set([23, 56, 9, 72]);
    return (
      <svg {...common}>
        <g transform="rotate(-8 100 100)">
          <rect x="14" y="52" width="172" height="92" rx="10" fill="#fff" />
          <rect x="14" y="52" width="172" height="92" rx="10" fill="none" stroke="#2a0f3d" strokeWidth="4" />
          {rows.map((r, y) => r.map((n, x) => (
            <g key={x + '-' + y}>
              <rect x={20 + x * 18.2} y={58 + y * 27.5} width="16" height="24" rx="3" fill={n ? '#fff4d6' : '#f1e9f7'} />
              {n > 0 && marked.has(n) && <circle cx={28 + x * 18.2} cy={70 + y * 27.5} r="9" fill="#e83f8a" opacity="0.85" />}
              {n > 0 && <text x={28 + x * 18.2} y={75 + y * 27.5} textAnchor="middle" fontSize="12" fontWeight="800" fill={marked.has(n) ? '#fff' : '#2a0f3d'} fontFamily="system-ui, sans-serif">{n}</text>}
            </g>
          )))}
        </g>
        <circle cx="152" cy="46" r="32" fill="#ffb627" stroke="#2a0f3d" strokeWidth="4" />
        <circle cx="152" cy="46" r="19" fill="#fff" />
        <text x="152" y="54" textAnchor="middle" fontSize="22" fontWeight="800" fill="#2a0f3d" fontFamily="system-ui, sans-serif">90</text>
        <path d="M128 26a30 30 0 0 1 14-10" stroke="#fff" strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.7" />
      </svg>
    );
  }
  if (game === 'quiz') {
    // A quiz board: a question and four answer lozenges, one lit up as correct, with a timer.
    return (
      <svg {...common}>
        <rect x="18" y="30" width="164" height="44" rx="22" fill="#fff" stroke="#2a0f3d" strokeWidth="4" />
        <text x="100" y="62" textAnchor="middle" fontSize="30" fontWeight="800" fill="#2a0f3d" fontFamily="system-ui, sans-serif">?</text>
        {[['A', 18, 88, '#fff'], ['B', 104, 88, '#4cc26a'], ['C', 18, 130, '#fff'], ['D', 104, 130, '#fff']].map(([l, x, y, f]) => (
          <g key={l as string}>
            <rect x={x as number} y={y as number} width="78" height="32" rx="16" fill={f as string} stroke="#2a0f3d" strokeWidth="4" />
            <text x={(x as number) + 18} y={(y as number) + 22} fontSize="15" fontWeight="800" fill={f === '#fff' ? '#0fa3a3' : '#fff'} fontFamily="system-ui, sans-serif">{l}</text>
            <rect x={(x as number) + 32} y={(y as number) + 13} width="34" height="6" rx="3" fill={f === '#fff' ? '#d9eef0' : '#fff'} />
          </g>
        ))}
        <circle cx="166" cy="30" r="22" fill="#ffb627" stroke="#2a0f3d" strokeWidth="4" />
        <text x="166" y="37" textAnchor="middle" fontSize="18" fontWeight="800" fill="#2a0f3d" fontFamily="system-ui, sans-serif">20</text>
      </svg>
    );
  }
  if (game === 'lucky_draw') {
    // A gift box under a reel of player faces, the middle one picked.
    const faces = ['#ffb627', '#0fa3a3', '#fff', '#4cc26a', '#ffb627'];
    return (
      <svg {...common}>
        <rect x="10" y="22" width="180" height="60" rx="30" fill="#2a0f3d" opacity="0.18" />
        {faces.map((f, i) => {
          const cx = 30 + i * 35, big = i === 2;
          return (
            <g key={i}>
              <circle cx={cx} cy="52" r={big ? 26 : 16} fill={f} stroke="#2a0f3d" strokeWidth="4" />
              <circle cx={cx - (big ? 8 : 5)} cy={big ? 48 : 49} r={big ? 3.5 : 2.2} fill="#2a0f3d" />
              <circle cx={cx + (big ? 8 : 5)} cy={big ? 48 : 49} r={big ? 3.5 : 2.2} fill="#2a0f3d" />
              <path d={big ? `M${cx - 10} 58q10 10 20 0` : `M${cx - 6} 56q6 6 12 0`} stroke="#2a0f3d" strokeWidth="3" fill="none" strokeLinecap="round" />
            </g>
          );
        })}
        <path d="M100 82l-8 10h16z" fill="#2a0f3d" />
        <rect x="52" y="112" width="96" height="66" rx="8" fill="#fff" stroke="#2a0f3d" strokeWidth="4" />
        <rect x="44" y="98" width="112" height="22" rx="6" fill="#ffb627" stroke="#2a0f3d" strokeWidth="4" />
        <rect x="92" y="98" width="16" height="80" fill="#e83f8a" stroke="#2a0f3d" strokeWidth="4" />
        <path d="M100 98c-14-18-34-12-26-2 6 6 26 2 26 2zm0 0c14-18 34-12 26-2-6 6-26 2-26 2z" fill="#e83f8a" stroke="#2a0f3d" strokeWidth="4" strokeLinejoin="round" />
      </svg>
    );
  }
  // Who's most likely to: three guests, votes stacking on one, who wears a crown.
  return (
    <svg {...common}>
      {[[46, 120, '#ffb627', 0], [100, 106, '#fff', 3], [154, 120, '#0fa3a3', 1]].map(([x, y, f, votes]) => (
        <g key={x as number}>
          <circle cx={x as number} cy={y as number} r="26" fill={f as string} stroke="#2a0f3d" strokeWidth="4" />
          <circle cx={(x as number) - 8} cy={(y as number) - 4} r="3.5" fill="#2a0f3d" />
          <circle cx={(x as number) + 8} cy={(y as number) - 4} r="3.5" fill="#2a0f3d" />
          <path d={`M${(x as number) - 9} ${(y as number) + 8}q9 ${votes === 3 ? 10 : 4} 18 0`} stroke="#2a0f3d" strokeWidth="3" fill="none" strokeLinecap="round" />
          <rect x={(x as number) - 26} y={(y as number) + 34} width="52" height="16" rx="8" fill="#2a0f3d" opacity="0.18" />
          <text x={x as number} y={(y as number) + 46} textAnchor="middle" fontSize="12" fontWeight="800" fill="#2a0f3d" fontFamily="system-ui, sans-serif">{votes} {votes === 1 ? 'vote' : 'votes'}</text>
        </g>
      ))}
      <path d="M80 70l8-22 12 14 12-14 8 22z" fill="#ffb627" stroke="#2a0f3d" strokeWidth="4" strokeLinejoin="round" />
      {[[38, 40], [164, 44], [126, 26]].map(([x, y]) => (
        <path key={x} d={`M${x} ${y - 9}l2.5 6.5 6.5 2.5-6.5 2.5-2.5 6.5-2.5-6.5-6.5-2.5 6.5-2.5z`} fill="#fff" />
      ))}
    </svg>
  );
}
