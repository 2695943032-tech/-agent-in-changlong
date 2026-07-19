import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Easing,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
} from 'remotion';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const serif = 'FangSong, STFangsong, KaiTi, serif';
const sans = '"PingFang SC", "Microsoft YaHei", system-ui, sans-serif';

const motes = [
  [330, 330, 4, 7], [470, 740, 6, 15], [620, 245, 3, 26], [770, 820, 5, 4],
  [930, 250, 5, 17], [1115, 810, 3, 9], [1290, 270, 4, 22], [1455, 735, 6, 30],
  [1580, 410, 4, 12], [390, 585, 3, 23], [1510, 570, 4, 2], [1085, 190, 3, 14],
] as const;

const correctedThinDotPath =
  'M 1232 532 L 1227 537 L 1252 598 L 1267 579 Z';

const QiyuText: React.FC<{
  fill: string;
  filter?: string;
  clipPath?: string;
}> = ({fill, filter, clipPath}) => (
  <g clipPath={clipPath}>
    <text x="600" y="690" fontSize="420" fontFamily={serif} fontWeight="400" fill={fill} filter={filter}>奇</text>
    <text x="960" y="690" fontSize="420" fontFamily={serif} fontWeight="400" fill={fill} filter={filter} mask="url(#thinYuMissingDot)">遇</text>
  </g>
);

export const QiyuThinMetallic: React.FC = () => {
  const frame = useCurrentFrame();
  const titleIn = spring({frame: frame - 7, fps: 30, config: {damping: 15, stiffness: 78, mass: .8}});
  const lineProgress = interpolate(frame, [18, 94], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const lineShineX = interpolate(frame, [18, 94], [390, 1540], clamp);
  const fly = interpolate(frame, [68, 124], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const fireflyOpacity = interpolate(frame, [62, 70, 116, 132], [0, 1, 1, 0], clamp);
  const dot = spring({frame: frame - 118, fps: 30, config: {damping: 10, stiffness: 145, mass: .48}});
  const fade = Math.min(
    interpolate(frame, [0, 16], [0, 1], clamp),
    interpolate(frame, [164, 179], [1, 0], clamp),
  );

  return (
    <AbsoluteFill style={{overflow: 'hidden', background: '#03271f', opacity: fade}}>
      <Audio src={staticFile('audio/qiyu-firefly-v3.wav')} volume={0.94} />
      <AbsoluteFill style={{background: 'radial-gradient(circle at 50% 48%, #165b48 0%, #0a4637 34%, #03271f 79%)'}} />
      <div style={{position: 'absolute', inset: -100, opacity: .052, color: '#fffdf8', backgroundImage: 'linear-gradient(90deg,currentColor 1px,transparent 1px),linear-gradient(currentColor 1px,transparent 1px)', backgroundSize: '74px 74px', transform: `translateX(${Math.sin(frame / 33) * 12}px)`}} />

      {motes.map(([x, y, size, phase], index) => (
        <div key={`${x}-${y}`} style={{position: 'absolute', left: x + Math.sin((frame + phase) / 18) * 18, top: y + Math.cos((frame + phase) / 15) * 14, width: size, height: size, borderRadius: '50%', background: index % 3 === 0 ? '#84d3ac' : '#dbad4c', boxShadow: `0 0 ${size * 5}px ${index % 3 === 0 ? '#84d3ac' : '#dbad4c'}`, opacity: interpolate(frame, [12 + index * 2, 43 + index * 2], [0, .28 + .6 * Math.abs(Math.sin((frame + phase) / 9))], clamp)}} />
      ))}

      <svg viewBox="0 0 1920 1080" style={{position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: interpolate(titleIn, [0, 1], [0, 1]), transform: `translateY(${interpolate(titleIn, [0, 1], [36, 0])}px) scale(${interpolate(titleIn, [0, 1], [.94, 1])})`}}>
        <defs>
          <linearGradient id="thinBaseGold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f8e8b7" />
            <stop offset="48%" stopColor="#e5bd67" />
            <stop offset="100%" stopColor="#c99235" />
          </linearGradient>
          <linearGradient id="thinMetal" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#bc8525" />
            <stop offset="38%" stopColor="#ffeec0" />
            <stop offset="52%" stopColor="#ffffff" />
            <stop offset="67%" stopColor="#f2cf79" />
            <stop offset="100%" stopColor="#b97f20" />
          </linearGradient>
          <filter id="thinSoftGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3.8" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="thinBrightGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <mask id="thinYuMissingDot" maskUnits="userSpaceOnUse">
            <rect x="0" y="0" width="1920" height="1080" fill="white" />
            <path d={correctedThinDotPath} fill="black" />
          </mask>
          <clipPath id="lineMetalSlice" clipPathUnits="userSpaceOnUse">
            <rect x={lineShineX - 62} y="250" width="124" height="530" />
          </clipPath>
        </defs>

        <QiyuText fill="url(#thinBaseGold)" filter="url(#thinSoftGlow)" />
        <QiyuText fill="url(#thinMetal)" filter="url(#thinBrightGlow)" clipPath="url(#lineMetalSlice)" />

        <path
          d="M 390 714 C 605 824, 825 790, 985 704 C 1150 616, 1355 665, 1540 474"
          fill="none"
          stroke="#d8aa49"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeDasharray="1500"
          strokeDashoffset={1500 * (1 - lineProgress)}
          opacity=".58"
        />
        <path
          d="M 390 714 C 605 824, 825 790, 985 704 C 1150 616, 1355 665, 1540 474"
          fill="none"
          stroke="#fff1c1"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray="72 1428"
          strokeDashoffset={1500 * (1 - lineProgress)}
          opacity=".18"
          filter="url(#thinBrightGlow)"
        />

        <path d={correctedThinDotPath} fill="#e4bb64" filter="url(#thinBrightGlow)" opacity={interpolate(dot, [0, .3, 1], [0, 1, 1])} style={{transformOrigin: 'center', transformBox: 'fill-box', transform: `scale(${interpolate(dot, [0, 1], [.12, 1])})`}} />

      </svg>

      <div style={{position: 'absolute', width: 18, height: 18, borderRadius: '50%', background: '#fff7d5', boxShadow: '0 0 0 7px rgba(225,179,79,.15), 0 0 36px 11px #e1b34f', offsetPath: 'path("M 1575 835 C 1480 770, 1430 665, 1350 658 C 1305 650, 1275 605, 1247 565")', offsetAnchor: '50% 50%', offsetDistance: `${fly * 100}%`, opacity: fireflyOpacity}} />

      <div style={{position: 'absolute', left: '50%', bottom: 154, transform: 'translateX(-50%)', textAlign: 'center', opacity: interpolate(frame, [142, 160], [0, 1], clamp)}}>
        <div style={{color: '#f4ecda', font: `400 27px ${serif}`, letterSpacing: 7}}>奇遇，不止在园区发生</div>
        <div style={{marginTop: 16, color: '#dbad4c', font: `500 16px ${sans}`, letterSpacing: 9}}>QIYUCL.SITE</div>
      </div>
    </AbsoluteFill>
  );
};
