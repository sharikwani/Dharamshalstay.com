import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Clock, Mountain, IndianRupee } from 'lucide-react';
import { triundPhotos } from '@/data/triund-photos';

type Beat = { alt: string; title: string; desc: string };
type Stat = { icon: 'time' | 'top' | 'price'; label: string; value: string };
type Labels = { eyebrow: string; title: string; intro: string; book: string; all: string; photos: string[]; photoBy: string };

// The trail's height profile, Dharamkot (left) to the Triund ridge (right). Drawn to look right, not to scale.
const PROFILE = 'M20 172C160 165 230 140 330 122S520 100 640 84S820 56 870 42S945 28 980 26';
const STOPS = [[20, 172], [330, 122], [640, 84], [980, 26]];
const STRIP = ['triund-trekkers-meadow', 'triund-camp-dhauladhar-golden-hour', 'triund-campsite-night'];
const ICONS = { time: Clock, top: Mountain, price: IndianRupee };

const photo = (file: string) => triundPhotos.find((p) => p.file === file)!;

function Credit({ file }: { file: string }) {
  const p = photo(file);
  return (
    <small className="tr-cr">
      <a href={p.source} target="_blank" rel="noopener noreferrer">{p.author}</a>, <a href={p.license_url} target="_blank" rel="noopener noreferrer license">{p.license}</a>
    </small>
  );
}

/**
 * "On the trail": the real Triund ridge under the Dhauladhar, the trail's climb drawn as a line that a walker
 * keeps climbing, and three moments from the walk. Photos are freely licensed (data/triund-photos.ts).
 */
export default function TrailSection({ beats, stats, labels, bookHref, allHref }: { beats: Beat[]; stats: Stat[]; labels: Labels; bookHref: string; allHref: string }) {
  const hero = triundPhotos[0];
  return (
    <section className="trail" id="trail" aria-labelledby="trail-title">
      <div className="trail-bg"><Image src={`/images/triund/${hero.file}.jpg`} alt={hero.alt} fill sizes="100vw" /></div>
      <div className="wrap trail-in">
        <div className="trail-copy rv">
          <span className="eyebrow">{labels.eyebrow}</span>
          <h2 id="trail-title">{labels.title}</h2>
          <p>{labels.intro}</p>
          {stats.length > 0 && (
            <ul className="trail-stats">
              {stats.map((s) => { const Icon = ICONS[s.icon]; return <li key={s.label}><Icon className="ico" aria-hidden="true" /><span>{s.label}</span><b>{s.value}</b></li>; })}
            </ul>
          )}
          <div className="trail-cta">
            <Link className="btn btn-sf" href={bookHref}>{labels.book} <ArrowRight className="ico" aria-hidden="true" /></Link>
            <Link className="btn btn-ghost" href={allHref}>{labels.all}</Link>
          </div>
        </div>

        <div className="trail-profile rv">
          <svg viewBox="0 0 1000 200" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id="trail-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffd28a" stopOpacity=".45" /><stop offset="1" stopColor="#ffd28a" stopOpacity="0" /></linearGradient>
            </defs>
            <path className="area" d={PROFILE + 'L980 200L20 200Z'} fill="url(#trail-fill)" />
            <path className="line" d={PROFILE} pathLength={1} />
            {STOPS.map(([x, y], i) => <circle key={i} className="stop" cx={x} cy={y} r="6" />)}
            <g className="walker">
              <circle r="16" className="halo" /><circle r="7" />
              <animateMotion dur="16s" repeatCount="indefinite" path={PROFILE} calcMode="spline" keyTimes="0;1" keySplines=".4 0 .6 1" />
            </g>
          </svg>
          <ol className="trail-beats">
            {beats.map((b) => (
              <li key={b.title}><span className="alt">{b.alt}</span><b>{b.title}</b><span>{b.desc}</span></li>
            ))}
          </ol>
        </div>

        <div className="trail-strip">
          {STRIP.map((f, i) => {
            const p = photo(f);
            return (
              <figure key={f} className="rv" style={{ ['--r' as string]: ['-2.5deg', '1.5deg', '-1deg'][i] }}>
                <div className="ph"><Image src={`/images/triund/${f}.jpg`} alt={p.alt} fill sizes="(max-width:960px) 80vw, 340px" /></div>
                <figcaption>{labels.photos[i]}<Credit file={f} /></figcaption>
              </figure>
            );
          })}
        </div>
      </div>
      <p className="trail-credit">{labels.photoBy} <Credit file={hero.file} /></p>
    </section>
  );
}
