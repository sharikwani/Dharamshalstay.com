// Between homepage sections: a hairline that rises into a small Dhauladhar ridge with a string of prayer flags.
// The side lines are CSS (they stretch to any width); the ridge keeps its shape. It draws itself in when it
// scrolls into view (HomeEffects reveals every .rv).
const FLAGS = [
  { x: 86.7, y: 26.9, c: 'var(--flag-blue)' },
  { x: 113.3, y: 29.8, c: 'var(--flag-white)' },
  { x: 140, y: 30.5, c: 'var(--flag-red)' },
  { x: 166.7, y: 29.1, c: 'var(--flag-green)' },
  { x: 193.3, y: 25.6, c: 'var(--flag-yellow)' },
];

export default function Divider() {
  return (
    <div className="wrap">
      <div className="divider rv" role="separator">
        <svg viewBox="0 0 280 56" width="280" height="56" aria-hidden="true" focusable="false">
          <circle className="sun" cx="204" cy="10" r="3.5" />
          <path className="ridge-ln" pathLength={1} d="M8 46l52-24 28 12 52-26 52 24 28-12 52 24" />
          <path className="str" pathLength={1} d="M60 22Q140 40 220 20" />
          {FLAGS.map((f, i) => (
            <g key={i} transform={`translate(${f.x} ${f.y})`}>
              <rect className="flag" x="-4.5" y="0" width="9" height="11" rx="1" style={{ fill: f.c, animationDelay: `${i * -0.4}s` }} />
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
