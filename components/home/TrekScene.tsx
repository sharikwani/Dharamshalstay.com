import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

type Beat = { alt: string; title: string; desc: string };

/**
 * "On the trail": a painted Triund hillside where five trekkers walk up to the
 * ridge camp. The section is tall and its stage sticks while you scroll;
 * HomeEffects zooms the camera in on the trekkers and back out, and lights up
 * one beat at a time. The text is plain server-rendered HTML.
 */
export default function TrekScene({ eyebrow, title, beats, cta, ctaHref }: { eyebrow: string; title: string; beats: Beat[]; cta: string; ctaHref: string }) {
  return (
    <section className="trek" id="trail" aria-labelledby="trek-title">
      <div className="trek-stage">
        <div className="trek-scene" id="trekscene">
          <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
            <defs>
              <linearGradient id="tsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2b4c7e" /><stop offset=".55" stopColor="#f2a97e" /><stop offset="1" stopColor="#fde3c2" /></linearGradient>
              <linearGradient id="tsnow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#c9d6e6" /></linearGradient>
              <radialGradient id="tsun"><stop offset="0" stopColor="#fff2d6" /><stop offset=".4" stopColor="#ffd9a0" stopOpacity=".8" /><stop offset="1" stopColor="#ffd9a0" stopOpacity="0" /></radialGradient>
              <symbol id="deodar" viewBox="-20 -80 40 80" overflow="visible"><path d="M0-80L-9-58h5L-13-40h6L-18-18h15V0h6v-18h15L7-40h6L4-58h5z" fill="#2c4a3a" /></symbol>
            </defs>
            <rect width="1600" height="900" fill="url(#tsky)" />
            <circle cx="1180" cy="330" r="220" fill="url(#tsun)" />
            <path d="M0 430L110 340L200 385L330 245L415 318L520 205L645 300L760 170L865 282L985 195L1105 300L1225 228L1335 318L1455 255L1600 345V640H0Z" fill="url(#tsnow)" />
            <path d="M330 245L380 300L350 330L415 318ZM760 170L800 230L770 270L865 282ZM985 195L1030 250L1010 290L1105 300ZM520 205L560 260L540 300L645 300Z" fill="#aebfd4" opacity=".7" />
            <path d="M0 520L120 470L230 505L360 440L470 495L600 430L720 480L850 420L980 470L1110 430L1240 480L1380 440L1600 490V640H0Z" fill="#8ea3bb" />
            <path d="M0 580C280 500 520 610 820 540S1320 470 1600 545V900H0Z" fill="#4e6d68" />
          <use href="#deodar" transform="translate(60 575) scale(0.7)" />
          <use href="#deodar" transform="translate(140 560) scale(0.8)" />
          <use href="#deodar" transform="translate(230 585) scale(0.65)" />
          <use href="#deodar" transform="translate(420 560) scale(0.75)" />
          <use href="#deodar" transform="translate(520 590) scale(0.7)" />
          <use href="#deodar" transform="translate(1180 520) scale(0.7)" />
          <use href="#deodar" transform="translate(1260 535) scale(0.8)" />
          <use href="#deodar" transform="translate(1520 545) scale(0.75)" />
            <path d="M0 720C320 650 700 770 1010 650S1400 420 1600 430V900H0Z" fill="#6f9a55" />
            <path id="trekpath" d="M60 870C360 830 520 800 700 765S980 700 1080 655S1260 560 1370 470" fill="none" stroke="#efe0bf" strokeWidth="7" strokeLinecap="round" strokeDasharray="2 14" opacity=".9" />
            <g transform="translate(1385 468)"><path d="M0 0L28-34L56 0Z" fill="#ee5a24" /><path d="M28-34L56 0H40Z" fill="#c2410c" /></g>
            <g transform="translate(1448 460)"><path d="M0 0L24-30L48 0Z" fill="#e8b923" /><path d="M24-30L48 0H35Z" fill="#b8901a" /></g>
            <circle cx="1430" cy="462" r="5" fill="#ffb38a" />
            <circle className="smoke" cx="1430" cy="450" r="8" fill="#f2f2f2" opacity=".5" />
            <circle className="smoke" cx="1430" cy="450" r="8" fill="#f2f2f2" opacity=".5" style={{ animationDelay: '-3s' }} />
          <use href="#deodar" transform="translate(80 760) scale(1.3)" />
          <use href="#deodar" transform="translate(180 735) scale(1.5)" />
          <use href="#deodar" transform="translate(300 760) scale(1.2)" />
          <use href="#deodar" transform="translate(560 735) scale(1.4)" />
          <use href="#deodar" transform="translate(640 760) scale(1.6)" />
          <use href="#deodar" transform="translate(1180 600) scale(1.2)" />
          <use href="#deodar" transform="translate(1270 560) scale(1.1)" />
          <use href="#deodar" transform="translate(1500 470) scale(1.2)" />
          <use href="#deodar" transform="translate(1560 480) scale(1.4)" />
          <g>
            <animateMotion dur="70s" repeatCount="indefinite" begin="-8.0s" rotate="0"><mpath href="#trekpath" /></animateMotion>
            <g className="trekker" transform="scale(1.25)">
              <line className="leg-b" x1="0" y1="-26" x2="0" y2="0" stroke="#1d2b3d" strokeWidth="5" strokeLinecap="round" />
              <line className="leg-a" x1="0" y1="-26" x2="0" y2="0" stroke="#33465e" strokeWidth="5" strokeLinecap="round" />
              <rect x="-14" y="-50" width="11" height="23" rx="3" fill="#5b3a29" />
              <rect x="-15.5" y="-56" width="13" height="6.5" rx="3.2" fill="#c8372d" />
              <rect x="-5" y="-48" width="11" height="24" rx="4" fill="#ee5a24" />
              <circle cx="1.5" cy="-54" r="5.5" fill="#c68b5e" />
              <path d="M-4 -55a5.5 5.5 0 0 1 11 0z" fill="#e8b923" />
              <g className="pole"><line x1="3" y1="-43" x2="11" y2="-24" stroke="#ee5a24" strokeWidth="4" strokeLinecap="round" /><line x1="11" y1="-25" x2="15" y2="0" stroke="#dfe5ec" strokeWidth="1.8" /></g>
            </g>
          </g>
          <g>
            <animateMotion dur="70s" repeatCount="indefinite" begin="-11.2s" rotate="0"><mpath href="#trekpath" /></animateMotion>
            <g className="trekker" transform="scale(1.25)">
              <line className="leg-b" x1="0" y1="-26" x2="0" y2="0" stroke="#1d2b3d" strokeWidth="5" strokeLinecap="round" />
              <line className="leg-a" x1="0" y1="-26" x2="0" y2="0" stroke="#33465e" strokeWidth="5" strokeLinecap="round" />
              <rect x="-14" y="-50" width="11" height="23" rx="3" fill="#5b3a29" />
              <rect x="-15.5" y="-56" width="13" height="6.5" rx="3.2" fill="#2f8f5b" />
              <rect x="-5" y="-48" width="11" height="24" rx="4" fill="#2f6fb5" />
              <circle cx="1.5" cy="-54" r="5.5" fill="#c68b5e" />
              <path d="M-4 -55a5.5 5.5 0 0 1 11 0z" fill="#c8372d" />
              <g className="pole"><line x1="3" y1="-43" x2="11" y2="-24" stroke="#2f6fb5" strokeWidth="4" strokeLinecap="round" /><line x1="11" y1="-25" x2="15" y2="0" stroke="#dfe5ec" strokeWidth="1.8" /></g>
            </g>
          </g>
          <g>
            <animateMotion dur="70s" repeatCount="indefinite" begin="-14.4s" rotate="0"><mpath href="#trekpath" /></animateMotion>
            <g className="trekker" transform="scale(1.25)">
              <line className="leg-b" x1="0" y1="-26" x2="0" y2="0" stroke="#1d2b3d" strokeWidth="5" strokeLinecap="round" />
              <line className="leg-a" x1="0" y1="-26" x2="0" y2="0" stroke="#33465e" strokeWidth="5" strokeLinecap="round" />
              <rect x="-14" y="-50" width="11" height="23" rx="3" fill="#5b3a29" />
              <rect x="-15.5" y="-56" width="13" height="6.5" rx="3.2" fill="#e8b923" />
              <rect x="-5" y="-48" width="11" height="24" rx="4" fill="#c8372d" />
              <circle cx="1.5" cy="-54" r="5.5" fill="#c68b5e" />
              <path d="M-4 -55a5.5 5.5 0 0 1 11 0z" fill="#2f6fb5" />
              <g className="pole"><line x1="3" y1="-43" x2="11" y2="-24" stroke="#c8372d" strokeWidth="4" strokeLinecap="round" /><line x1="11" y1="-25" x2="15" y2="0" stroke="#dfe5ec" strokeWidth="1.8" /></g>
            </g>
          </g>
          <g>
            <animateMotion dur="70s" repeatCount="indefinite" begin="-17.6s" rotate="0"><mpath href="#trekpath" /></animateMotion>
            <g className="trekker" transform="scale(1.25)">
              <line className="leg-b" x1="0" y1="-26" x2="0" y2="0" stroke="#1d2b3d" strokeWidth="5" strokeLinecap="round" />
              <line className="leg-a" x1="0" y1="-26" x2="0" y2="0" stroke="#33465e" strokeWidth="5" strokeLinecap="round" />
              <rect x="-14" y="-50" width="11" height="23" rx="3" fill="#5b3a29" />
              <rect x="-15.5" y="-56" width="13" height="6.5" rx="3.2" fill="#ee5a24" />
              <rect x="-5" y="-48" width="11" height="24" rx="4" fill="#2f8f5b" />
              <circle cx="1.5" cy="-54" r="5.5" fill="#c68b5e" />
              <path d="M-4 -55a5.5 5.5 0 0 1 11 0z" fill="#e8b923" />
              <g className="pole"><line x1="3" y1="-43" x2="11" y2="-24" stroke="#2f8f5b" strokeWidth="4" strokeLinecap="round" /><line x1="11" y1="-25" x2="15" y2="0" stroke="#dfe5ec" strokeWidth="1.8" /></g>
            </g>
          </g>
          <g>
            <animateMotion dur="70s" repeatCount="indefinite" begin="-20.8s" rotate="0"><mpath href="#trekpath" /></animateMotion>
            <g className="trekker" transform="scale(1.25)">
              <line className="leg-b" x1="0" y1="-26" x2="0" y2="0" stroke="#1d2b3d" strokeWidth="5" strokeLinecap="round" />
              <line className="leg-a" x1="0" y1="-26" x2="0" y2="0" stroke="#33465e" strokeWidth="5" strokeLinecap="round" />
              <rect x="-14" y="-50" width="11" height="23" rx="3" fill="#5b3a29" />
              <rect x="-15.5" y="-56" width="13" height="6.5" rx="3.2" fill="#2f6fb5" />
              <rect x="-5" y="-48" width="11" height="24" rx="4" fill="#e8b923" />
              <circle cx="1.5" cy="-54" r="5.5" fill="#c68b5e" />
              <path d="M-4 -55a5.5 5.5 0 0 1 11 0z" fill="#c8372d" />
              <g className="pole"><line x1="3" y1="-43" x2="11" y2="-24" stroke="#e8b923" strokeWidth="4" strokeLinecap="round" /><line x1="11" y1="-25" x2="15" y2="0" stroke="#dfe5ec" strokeWidth="1.8" /></g>
            </g>
          </g>
            <path d="M0 830C420 790 820 900 1600 800V900H0Z" fill="#3c6338" />
          </svg>
        </div>
        <div className="trek-copy">
          <div className="wrap">
            <span className="eyebrow">{eyebrow}</span>
            <h2 id="trek-title">{title}</h2>
            <Link href={ctaHref} className="btn btn-ghost" style={{ marginTop: 18 }}>{cta} <ArrowRight className="ico" aria-hidden="true" /></Link>
          </div>
        </div>
        <div className="beats">
          <div className="wrap">
            <ol id="beats">
              {beats.map((b, i) => (
                <li key={b.title} className={i === 0 ? 'on' : ''}><span className="alt">{b.alt}</span><b>{b.title}</b><span>{b.desc}</span></li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
