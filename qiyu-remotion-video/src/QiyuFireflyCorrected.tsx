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

const C = {
  forest: '#07382d',
  forestDark: '#03271f',
  gold: '#dbad4c',
  mint: '#84d3ac',
  white: '#fffdf8',
};

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const serif = '"Songti SC", "STSong", "Noto Serif SC", serif';
const sans = '"PingFang SC", "Microsoft YaHei", system-ui, sans-serif';

const fireflies = [
  [315, 350, 5, 2], [470, 740, 7, 13], [620, 245, 4, 24], [740, 820, 5, 8],
  [910, 260, 6, 19], [1145, 805, 4, 5], [1285, 275, 5, 16], [1440, 725, 7, 28],
  [1580, 390, 4, 10], [360, 585, 3, 21], [1510, 565, 5, 1], [1080, 190, 3, 12],
] as const;

// 圈选的“遇”字内部右下弯点，遮罩和最终补笔共用同一路径。
const correctedDotPath =
  'M 1218 561 C 1240 558 1262 575 1269 596 C 1275 614 1268 630 1251 638 C 1244 624 1238 611 1227 599 C 1219 588 1215 572 1218 561 Z';

export const QiyuFireflyCorrected: React.FC = () => {
  const frame = useCurrentFrame();
  const titleIn = spring({frame: frame - 8, fps: 30, config: {damping: 13, stiffness: 82, mass: .82}});
  const fly = interpolate(frame, [42, 124], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const dot = spring({frame: frame - 116, fps: 30, config: {damping: 9, stiffness: 130, mass: .5}});
  const fireflyOpacity = interpolate(frame, [38, 48, 116, 129], [0, 1, 1, 0], clamp);
  const fade = Math.min(
    interpolate(frame, [0, 18], [0, 1], clamp),
    interpolate(frame, [162, 179], [1, 0], clamp),
  );

  return (
    <AbsoluteFill style={{overflow: 'hidden', background: C.forestDark, opacity: fade}}>
      <Audio src={staticFile('audio/qiyu-title.wav')} volume={0.72} />
      <AbsoluteFill style={{background: `radial-gradient(circle at 50% 48%, #17624b 0%, ${C.forest} 34%, ${C.forestDark} 78%)`}} />
      <div style={{position: 'absolute', inset: -100, opacity: .055, color: C.white, backgroundImage: 'linear-gradient(90deg,currentColor 1px,transparent 1px),linear-gradient(currentColor 1px,transparent 1px)', backgroundSize: '74px 74px', transform: `translateX(${Math.sin(frame / 33) * 12}px)`}} />

      {fireflies.map(([x, y, size, phase], index) => (
        <div key={`${x}-${y}`} style={{position: 'absolute', left: x + Math.sin((frame + phase) / 18) * 20, top: y + Math.cos((frame + phase) / 15) * 16, width: size, height: size, borderRadius: '50%', background: index % 3 === 0 ? C.mint : C.gold, boxShadow: `0 0 ${size * 5}px ${index % 3 === 0 ? C.mint : C.gold}`, opacity: interpolate(frame, [14 + index * 2, 45 + index * 2], [0, .3 + .6 * Math.abs(Math.sin((frame + phase) / 9))], clamp)}} />
      ))}

      <svg viewBox="0 0 1920 1080" style={{position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: interpolate(titleIn, [0, 1], [0, 1]), transform: `translateY(${interpolate(titleIn, [0, 1], [44, 0])}px) scale(${interpolate(titleIn, [0, 1], [.9, 1])})`}}>
        <defs>
          <linearGradient id="correctedArtGold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fff8df" />
            <stop offset="52%" stopColor="#f0d28a" />
            <stop offset="100%" stopColor="#dcae48" />
          </linearGradient>
          <filter id="correctedArtGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <mask id="yuCorrectedMissingDot" maskUnits="userSpaceOnUse">
            <rect x="0" y="0" width="1920" height="1080" fill="white" />
            <path d={correctedDotPath} fill="black" />
          </mask>
        </defs>
        <path d="M 470 724 C 690 838, 838 777, 982 705 C 1180 607, 1375 675, 1510 472" fill="none" stroke="#e1b34f" strokeWidth="2.5" opacity=".42" />
        <text x="600" y="690" fontSize="420" fontFamily="STKaiti, KaiTi, serif" fontWeight="700" fill="url(#correctedArtGold)" filter="url(#correctedArtGlow)">奇</text>
        <text x="960" y="690" fontSize="420" fontFamily="STKaiti, KaiTi, serif" fontWeight="700" fill="url(#correctedArtGold)" filter="url(#correctedArtGlow)" mask="url(#yuCorrectedMissingDot)">遇</text>
        <path d={correctedDotPath} fill="#edc96f" filter="url(#correctedArtGlow)" opacity={interpolate(dot, [0, .25, 1], [0, 1, 1])} style={{transformOrigin: 'center', transformBox: 'fill-box', transform: `scale(${interpolate(dot, [0, 1], [.12, 1])})`}} />
      </svg>

      <div style={{position: 'absolute', width: 19, height: 19, borderRadius: '50%', background: '#fff6cf', boxShadow: '0 0 0 8px rgba(225,179,79,.14), 0 0 38px 12px #e1b34f', offsetPath: 'path("M 1580 835 C 1480 780, 1430 665, 1350 660 C 1300 655, 1270 625, 1247 602")', offsetDistance: `${fly * 100}%`, opacity: fireflyOpacity}} />

      <div style={{position: 'absolute', left: '50%', bottom: 155, transform: 'translateX(-50%)', textAlign: 'center', opacity: interpolate(frame, [130, 155], [0, 1], clamp)}}>
        <div style={{color: C.white, font: `600 28px ${serif}`, letterSpacing: 5}}>奇遇，不止在园区发生</div>
        <div style={{marginTop: 16, color: C.gold, font: `600 17px ${sans}`, letterSpacing: 8}}>QIYUCL.SITE</div>
      </div>
    </AbsoluteFill>
  );
};
