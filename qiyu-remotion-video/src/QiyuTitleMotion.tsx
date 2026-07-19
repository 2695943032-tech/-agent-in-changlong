import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Easing,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const serif = '"Songti SC", "STSong", "Noto Serif SC", serif';
const sans = '"PingFang SC", "Microsoft YaHei", system-ui, sans-serif';

const particles = [
  [370, 310, 7, 0], [520, 720, 5, 13], [690, 250, 4, 6], [810, 790, 6, 17],
  [1040, 220, 5, 11], [1190, 770, 7, 3], [1375, 330, 4, 19], [1510, 645, 6, 9],
  [455, 530, 3, 22], [625, 410, 5, 15], [1280, 475, 3, 5], [1450, 805, 4, 25],
] as const;

const Character: React.FC<{
  children: string;
  delay: number;
  fromY: number;
  rotate: number;
  gold?: boolean;
}> = ({children, delay, fromY, rotate, gold = false}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const enter = spring({
    frame: frame - delay,
    fps,
    config: {damping: 10.5, mass: 0.7, stiffness: 105},
  });
  const blur = interpolate(frame, [delay, delay + 15], [18, 0], clamp);
  const opacity = interpolate(frame, [delay, delay + 8], [0, 1], clamp);
  const settle = 1 + Math.sin((frame - delay) / 12) * 0.004 * interpolate(frame, [55, 82], [1, 0], clamp);
  return (
    <span
      style={{
        display: 'inline-block',
        font: `700 310px/1 ${serif}`,
        letterSpacing: -22,
        color: gold ? '#e1b34f' : '#fff9e9',
        textShadow: gold
          ? '0 16px 55px rgba(222,174,72,.27)'
          : '0 16px 55px rgba(244,236,214,.16)',
        opacity,
        filter: `blur(${blur}px)`,
        transform: `translateY(${interpolate(enter, [0, 1], [fromY, 0])}px) rotate(${interpolate(enter, [0, 1], [rotate, 0])}deg) scale(${interpolate(enter, [0, 1], [.68, 1]) * settle})`,
        transformOrigin: '50% 72%',
      }}
    >
      {children}
    </span>
  );
};

export const QiyuTitleMotion: React.FC = () => {
  const frame = useCurrentFrame();
  const route = interpolate(frame, [3, 61], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const orbit = interpolate(frame, [0, 78], [-26, 12], clamp);
  const shimmer = interpolate(frame, [47, 73], [-520, 520], clamp);
  const lockup = interpolate(frame, [0, 15, 82, 89], [0, 1, 1, 0], clamp);
  const subtitle = interpolate(frame, [49, 64], [0, 1], clamp);

  return (
    <AbsoluteFill style={{overflow: 'hidden', background: '#032b22', fontFamily: sans}}>
      <Audio src={staticFile('audio/qiyu-title.wav')} volume={0.9} />

      <AbsoluteFill
        style={{
          background:
            'radial-gradient(circle at 50% 47%, #17624b 0%, #0b4939 29%, #052f27 59%, #021f19 100%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: -80,
          opacity: 0.075,
          color: '#d8eadf',
          transform: `translate(${orbit}px, ${-orbit * .35}px)`,
          backgroundImage:
            'linear-gradient(90deg, currentColor 1px, transparent 1px), linear-gradient(currentColor 1px, transparent 1px)',
          backgroundSize: '72px 72px',
        }}
      />

      <svg viewBox="0 0 1920 1080" style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}}>
        <path
          d="M 185 720 C 420 500, 570 850, 810 655 C 1030 478, 1195 675, 1430 420 C 1535 305, 1680 330, 1760 250"
          fill="none"
          stroke="#e1b34f"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="1700"
          strokeDashoffset={1700 * (1 - route)}
          opacity={0.7}
        />
        <path
          d="M 185 720 C 420 500, 570 850, 810 655 C 1030 478, 1195 675, 1430 420 C 1535 305, 1680 330, 1760 250"
          fill="none"
          stroke="#fff4ce"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray="95 1605"
          strokeDashoffset={1700 * (1 - route)}
          opacity={0.16}
          style={{filter: 'blur(8px)'}}
        />
      </svg>

      <div
        style={{
          position: 'absolute',
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: '#fff5ce',
          boxShadow: '0 0 0 8px rgba(225,179,79,.16), 0 0 35px #e1b34f',
          offsetPath: 'path("M 185 720 C 420 500, 570 850, 810 655 C 1030 478, 1195 675, 1430 420 C 1535 305, 1680 330, 1760 250")',
          offsetDistance: `${route * 100}%`,
          opacity: interpolate(frame, [2, 9, 61, 71], [0, 1, 1, 0], clamp),
        }}
      />

      {particles.map(([x, y, size, phase], index) => {
        const appear = interpolate(frame, [18 + index, 36 + index], [0, 1], clamp);
        const twinkle = .3 + .7 * Math.abs(Math.sin((frame + phase) / 9));
        return (
          <div
            key={`${x}-${y}`}
            style={{
              position: 'absolute',
              left: x,
              top: y + Math.sin((frame + phase) / 13) * 12,
              width: size,
              height: size,
              borderRadius: '50%',
              background: index % 3 === 0 ? '#8de0b8' : '#e7ba56',
              boxShadow: `0 0 ${size * 4}px currentColor`,
              opacity: appear * twinkle,
            }}
          />
        );
      })}

      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: lockup,
          transform: `translateY(${interpolate(frame, [0, 30], [18, 0], clamp)}px)`,
        }}
      >
        <div style={{position: 'relative', display: 'flex', alignItems: 'center', gap: 35}}>
          <div style={{position: 'absolute', width: 135, height: 135, borderRadius: '50%', border: '1px solid rgba(225,179,79,.38)', left: -35, top: 45, transform: `rotate(${frame * .7}deg) scale(${interpolate(frame, [16, 41], [.6, 1], clamp)})`}} />
          <Character delay={10} fromY={125} rotate={-13}>奇</Character>
          <Character delay={19} fromY={-105} rotate={11} gold>遇</Character>
          <div
            style={{
              position: 'absolute',
              top: 6,
              bottom: 10,
              left: '40%',
              width: 95,
              transform: `translateX(${shimmer}px) skewX(-18deg)`,
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.5), transparent)',
              filter: 'blur(7px)',
              mixBlendMode: 'screen',
              opacity: interpolate(frame, [45, 52, 69, 75], [0, .8, .8, 0], clamp),
            }}
          />
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          left: '50%',
          bottom: 185,
          transform: 'translateX(-50%)',
          color: '#d5e5dc',
          font: `500 18px ${sans}`,
          letterSpacing: 8,
          whiteSpace: 'nowrap',
          opacity: subtitle * lockup,
        }}
      >
        QIYU · INTELLIGENT JOURNEY
      </div>
    </AbsoluteFill>
  );
};
