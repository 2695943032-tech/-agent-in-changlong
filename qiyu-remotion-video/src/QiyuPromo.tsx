import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  OffthreadVideo,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

const C = {
  forest: '#07382d',
  forestDark: '#03271f',
  ink: '#13342c',
  cream: '#f6f1e6',
  warm: '#eadfc9',
  gold: '#dbad4c',
  mint: '#84d3ac',
  coral: '#e77b63',
  white: '#fffdf8',
};

const sans = '"PingFang SC", "Microsoft YaHei", system-ui, sans-serif';
const serif = '"Songti SC", "STSong", "Noto Serif SC", serif';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

const Fade: React.FC<{children: React.ReactNode; duration: number}> = ({children, duration}) => {
  const frame = useCurrentFrame();
  const opacity = Math.min(
    interpolate(frame, [0, 18], [0, 1], clamp),
    interpolate(frame, [duration - 18, duration], [1, 0], clamp),
  );
  return <AbsoluteFill style={{opacity}}>{children}</AbsoluteFill>;
};

const AmbientBackground: React.FC<{tone?: 'light' | 'dark'}> = ({tone = 'light'}) => {
  const frame = useCurrentFrame();
  const x = interpolate(frame, [0, 1800], [-120, 180], clamp);
  const dark = tone === 'dark';
  return (
    <AbsoluteFill
      style={{
        overflow: 'hidden',
        background: dark
          ? `radial-gradient(circle at 22% 20%, #155745 0%, ${C.forest} 42%, ${C.forestDark} 100%)`
          : `radial-gradient(circle at 78% 15%, #fffdf7 0%, ${C.cream} 46%, #e7e0d1 100%)`,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: -120,
          opacity: dark ? 0.085 : 0.08,
          transform: `translateX(${x}px)`,
          backgroundImage:
            'linear-gradient(90deg, currentColor 1px, transparent 1px), linear-gradient(currentColor 1px, transparent 1px)',
          backgroundSize: '72px 72px',
          color: dark ? C.white : C.forest,
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 580,
          height: 580,
          border: `1px solid ${dark ? '#ffffff25' : '#0a4a3920'}`,
          borderRadius: '50%',
          right: -160,
          top: -240,
        }}
      />
    </AbsoluteFill>
  );
};

const BrandMark: React.FC<{light?: boolean}> = ({light = false}) => (
  <div style={{display: 'flex', alignItems: 'center', gap: 13}}>
    <div
      style={{
        width: 38,
        height: 38,
        borderRadius: 13,
        background: light ? C.gold : C.forest,
        color: light ? C.forestDark : C.gold,
        display: 'grid',
        placeItems: 'center',
        font: `800 19px ${sans}`,
        transform: 'rotate(-6deg)',
      }}
    >
      奇
    </div>
    <div style={{color: light ? C.white : C.ink, font: `700 23px ${serif}`, letterSpacing: 4}}>奇遇长隆</div>
  </div>
);

const Phone: React.FC<{
  src: string;
  playbackRate?: number;
  startFrom?: number;
  side?: 'left' | 'right';
}> = ({src, playbackRate = 1, startFrom = 0, side = 'right'}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const entrance = spring({frame, fps, config: {damping: 18, mass: 0.8, stiffness: 110}});
  const drift = Math.sin(frame / 34) * 5;
  return (
    <div
      style={{
        position: 'absolute',
        top: 66 + drift,
        [side]: 170,
        width: 500,
        height: 888,
        borderRadius: 48,
        padding: 12,
        background: '#101c18',
        boxShadow: '0 35px 75px rgba(20,45,37,.26), 0 8px 25px rgba(20,45,37,.14)',
        transform: `translateY(${interpolate(entrance, [0, 1], [75, 0])}px) scale(${interpolate(entrance, [0, 1], [.96, 1])})`,
      }}
    >
      <div style={{position: 'absolute', top: 19, left: '50%', width: 95, height: 17, borderRadius: 20, background: '#101c18', transform: 'translateX(-50%)', zIndex: 4}} />
      <OffthreadVideo
        src={staticFile(src)}
        playbackRate={playbackRate}
        startFrom={startFrom}
        muted
        style={{width: '100%', height: '100%', objectFit: 'cover', borderRadius: 38, background: C.cream}}
      />
    </div>
  );
};

const SectionLabel: React.FC<{number: string; label: string; dark?: boolean}> = ({number, label, dark = false}) => (
  <div style={{display: 'flex', alignItems: 'center', gap: 16, marginBottom: 31}}>
    <div style={{font: `700 17px ${sans}`, letterSpacing: 3, color: dark ? C.gold : C.forest}}>{number}</div>
    <div style={{height: 1, width: 55, background: dark ? C.gold : C.forest}} />
    <div style={{font: `600 18px ${sans}`, letterSpacing: 5, color: dark ? C.white : C.ink}}>{label}</div>
  </div>
);

const FeaturePill: React.FC<{children: React.ReactNode; index: number; dark?: boolean}> = ({children, index, dark = false}) => {
  const frame = useCurrentFrame();
  const y = interpolate(frame, [22 + index * 8, 44 + index * 8], [24, 0], clamp);
  const opacity = interpolate(frame, [22 + index * 8, 43 + index * 8], [0, 1], clamp);
  return (
    <div
      style={{
        opacity,
        transform: `translateY(${y}px)`,
        padding: '13px 19px',
        borderRadius: 999,
        border: `1px solid ${dark ? '#ffffff30' : '#0a44352b'}`,
        background: dark ? '#ffffff0c' : '#fffdf891',
        color: dark ? C.white : C.ink,
        font: `500 18px ${sans}`,
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{color: C.gold, marginRight: 8}}>●</span>{children}
    </div>
  );
};

const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const pop = spring({frame, fps, config: {damping: 15, stiffness: 92}});
  return (
    <AbsoluteFill>
      <AmbientBackground tone="dark" />
      <div style={{position: 'absolute', inset: 0, display: 'grid', placeItems: 'center'}}>
        <Img
          src={staticFile('images/tuantuan.png')}
          style={{position: 'absolute', width: 550, height: 550, objectFit: 'contain', right: 65, bottom: -70, opacity: interpolate(frame, [10, 45], [0, .92], clamp), transform: `translateX(${interpolate(pop, [0, 1], [90, 0])}px)`}}
        />
        <div style={{width: 1280, transform: `scale(${interpolate(pop, [0, 1], [.92, 1])})`, opacity: interpolate(frame, [0, 20], [0, 1], clamp)}}>
          <div style={{font: `600 20px ${sans}`, letterSpacing: 9, color: C.gold, marginBottom: 28}}>AI × 动物科普 × 旅行记忆</div>
          <div style={{font: `700 100px/1.05 ${serif}`, color: C.white, letterSpacing: 3}}>让每一次出发<br />都成为一场奇遇</div>
          <div style={{marginTop: 35, font: `400 27px ${sans}`, color: '#d8e6de'}}>从行程构建，到在地探索，再到可珍藏的旅行故事</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const agents = [
  {
    name: '团团',
    animal: '熊猫 Agent',
    role: '温柔耐心的亲子科普官',
    image: 'images/tuantuan.png',
    accent: C.gold,
  },
  {
    name: '凯凯',
    animal: '白虎 Agent',
    role: '行动果断的路线探险队长',
    image: 'images/kaikai.png',
    accent: C.coral,
  },
  {
    name: '悠米',
    animal: '考拉 Agent',
    role: '松弛细心的休闲路线管家',
    image: 'images/youmi.png',
    accent: C.mint,
  },
];

const AgentMatrix: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <AmbientBackground tone="dark" />
      <div style={{position: 'absolute', left: 125, top: 68, width: 930}}>
        <BrandMark light />
        <div style={{marginTop: 54, font: `600 17px ${sans}`, color: C.gold, letterSpacing: 6}}>MULTI-AGENT COMPANION SYSTEM</div>
        <h1 style={{margin: '18px 0 14px', color: C.white, font: `700 61px/1.12 ${serif}`}}>不止一个 AI<br />选择懂你的动物伙伴</h1>
        <p style={{margin: '0 0 23px', color: '#c9dad2', font: `400 21px/1.6 ${sans}`}}>同一套园区知识，不同的性格、语气与路线策略。</p>
        <div style={{display: 'flex', gap: 14}}>
          {agents.map((agent, index) => {
            const enter = interpolate(frame, [20 + index * 9, 45 + index * 9], [0, 1], clamp);
            return (
              <div
                key={agent.name}
                style={{
                  width: 246,
                  height: 250,
                  position: 'relative',
                  overflow: 'hidden',
                  padding: '17px 18px',
                  borderRadius: 25,
                  border: '1px solid #ffffff24',
                  background: '#ffffff0d',
                  opacity: enter,
                  transform: `translateY(${interpolate(enter, [0, 1], [26, 0])}px)`,
                }}
              >
                <div style={{font: `700 27px ${serif}`, color: C.white}}>{agent.name}</div>
                <div style={{marginTop: 3, font: `600 13px ${sans}`, color: agent.accent, letterSpacing: 2}}>{agent.animal}</div>
                <div style={{marginTop: 10, width: 133, font: `500 16px/1.45 ${sans}`, color: '#d8e4de'}}>{agent.role}</div>
                <Img src={staticFile(agent.image)} style={{position: 'absolute', width: 150, height: 150, objectFit: 'contain', right: -25, bottom: -15}} />
              </div>
            );
          })}
        </div>
        <div style={{marginTop: 17, display: 'flex', alignItems: 'center', gap: 13, opacity: interpolate(frame, [64, 91], [0, 1], clamp)}}>
          <div style={{width: 9, height: 9, borderRadius: '50%', background: C.mint, boxShadow: `0 0 17px ${C.mint}`}} />
          <div style={{font: `500 17px ${sans}`, color: '#c9dad2'}}>多 Agent 共用实时园区知识库，提供差异化陪伴体验</div>
        </div>
      </div>
      <Phone src="recordings/pretrip.webm" playbackRate={0.75} />
    </AbsoluteFill>
  );
};

const PreTrip: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <AmbientBackground />
      <div style={{position: 'absolute', left: 145, top: 92, width: 810}}>
        <BrandMark />
        <div style={{marginTop: 105}}>
          <SectionLabel number="01" label="游前 · 智能共创" />
          <h1 style={{margin: 0, color: C.ink, font: `700 67px/1.16 ${serif}`, letterSpacing: 1}}>不只是推荐路线<br />而是读懂每一个人</h1>
          <p style={{margin: '28px 0 34px', color: '#52665e', font: `400 24px/1.7 ${sans}`, width: 710}}>AI 伙伴通过自然对话理解家庭结构、节奏偏好、动物兴趣与特殊需求，实时生成专属行程。</p>
          <div style={{display: 'flex', flexWrap: 'wrap', gap: 12, width: 720}}>
            <FeaturePill index={0}>同行伙伴</FeaturePill>
            <FeaturePill index={1}>游览节奏</FeaturePill>
            <FeaturePill index={2}>动物偏好</FeaturePill>
            <FeaturePill index={3}>饮食需求</FeaturePill>
          </div>
          <div style={{marginTop: 43, display: 'flex', alignItems: 'center', gap: 17, opacity: interpolate(frame, [115, 145], [0, 1], clamp)}}>
            <div style={{width: 52, height: 52, borderRadius: 18, background: C.gold, display: 'grid', placeItems: 'center', color: C.forest, font: `800 24px ${sans}`}}>AI</div>
            <div><div style={{color: C.ink, font: `700 22px ${sans}`}}>秒级构建专属行程</div><div style={{color: '#6c7b75', font: `400 17px ${sans}`, marginTop: 4}}>地图、站点与时间线同步生成</div></div>
          </div>
        </div>
      </div>
      <Phone src="recordings/pretrip.webm" playbackRate={1.9} startFrom={135} />
    </AbsoluteFill>
  );
};

const InPark: React.FC = () => {
  const frame = useCurrentFrame();
  const pulse = 1 + Math.sin(frame / 8) * .07;
  return (
    <AbsoluteFill>
      <AmbientBackground tone="dark" />
      <Phone src="recordings/inpark.webm" playbackRate={0.93} side="left" />
      <div style={{position: 'absolute', left: 850, top: 105, width: 850}}>
        <BrandMark light />
        <div style={{marginTop: 98}}>
          <SectionLabel number="02" label="游中 · 在地探索" dark />
          <h1 style={{margin: 0, color: C.white, font: `700 68px/1.16 ${serif}`}}>抵达的那一刻<br />知识主动发生</h1>
          <p style={{margin: '29px 0 34px', color: '#c6d8cf', font: `400 24px/1.65 ${sans}`, width: 760}}>电子围栏感知真实位置，解锁展区任务；AI 科普伙伴把动物观察变成有趣的问答体验。</p>
          <div style={{display: 'flex', gap: 13, flexWrap: 'wrap', width: 750}}>
            <FeaturePill index={0} dark>电子围栏自动抵达</FeaturePill>
            <FeaturePill index={1} dark>AI 科普讲解</FeaturePill>
            <FeaturePill index={2} dark>排队智能改道</FeaturePill>
          </div>
          <div style={{marginTop: 45, display: 'flex', alignItems: 'center', gap: 21, opacity: interpolate(frame, [105, 135], [0, 1], clamp)}}>
            <div style={{position: 'relative', width: 58, height: 58}}>
              <div style={{position: 'absolute', inset: 0, transform: `scale(${pulse})`, borderRadius: '50%', border: `2px solid ${C.gold}`, opacity: .45}} />
              <div style={{position: 'absolute', inset: 15, borderRadius: '50%', background: C.gold}} />
            </div>
            <div style={{font: `600 21px/1.5 ${sans}`, color: C.white}}>位置不是一个坐标<br /><span style={{color: C.mint}}>而是探索故事的入口</span></div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const PostTrip: React.FC<{ticket?: boolean}> = ({ticket = false}) => (
  <AbsoluteFill>
    <AmbientBackground />
    <div style={{position: 'absolute', left: 145, top: 92, width: 800}}>
      <BrandMark />
      <div style={{marginTop: 105}}>
        <SectionLabel number="03" label="游后 · 记忆再生" />
        <h1 style={{margin: 0, color: C.ink, font: `700 67px/1.16 ${serif}`}}>{ticket ? <>把一天的奇遇<br />装进一张票根</> : <>每一步探索<br />都有回响</>}</h1>
        <p style={{margin: '28px 0 34px', color: '#52665e', font: `400 24px/1.7 ${sans}`, width: 720}}>{ticket ? '路线、勋章与回忆自动汇聚，生成属于这次旅程的个性票根。' : '足迹沉淀为成就，观察转化为勋章，AI 把零散瞬间编织成完整旅行故事。'}</p>
        <div style={{display: 'flex', flexWrap: 'wrap', gap: 12, width: 720}}>
          <FeaturePill index={0}>{ticket ? '三种票根风格' : '足迹与行程回顾'}</FeaturePill>
          <FeaturePill index={1}>{ticket ? '专属旅行纪念' : '成就勋章系统'}</FeaturePill>
          <FeaturePill index={2}>{ticket ? '一键生成分享' : 'AIGC 回忆动画'}</FeaturePill>
        </div>
      </div>
    </div>
    <Phone src="recordings/posttrip.webm" playbackRate={ticket ? 1 : 1.35} startFrom={ticket ? 210 : 0} />
  </AbsoluteFill>
);

const AigcCompare: React.FC = () => {
  const frame = useCurrentFrame();
  const split = interpolate(frame, [26, 135, 205], [18, 73, 53], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const reveal = spring({frame, fps: 30, config: {damping: 18, stiffness: 90}});
  return (
    <AbsoluteFill style={{background: C.forestDark, color: C.white}}>
      <div style={{position: 'absolute', left: 95, right: 95, top: 55, display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 5}}>
        <BrandMark light />
        <div style={{font: `600 17px ${sans}`, color: C.gold, letterSpacing: 5}}>AIGC MEMORY ENGINE</div>
      </div>
      <div style={{position: 'absolute', left: 95, right: 95, top: 130, bottom: 70, borderRadius: 35, overflow: 'hidden', background: '#132d25', boxShadow: '0 34px 90px #00000055', transform: `scale(${interpolate(reveal, [0, 1], [.96, 1])})`, opacity: reveal}}>
        <Img src={staticFile('images/panda-pixel.png')} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 50%'}} />
        <div style={{position: 'absolute', inset: 0, clipPath: `inset(0 ${100 - split}% 0 0)`}}>
          <Img src={staticFile('images/panda-original.png')} style={{width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 44%'}} />
        </div>
        <div style={{position: 'absolute', top: 0, bottom: 0, left: `${split}%`, width: 3, background: C.white, boxShadow: '0 0 0 1px #173a31, 0 0 28px #ffffffaa'}}>
          <div style={{position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 62, height: 62, borderRadius: '50%', border: '2px solid white', background: '#062f27d9', display: 'grid', placeItems: 'center', font: `700 19px ${sans}`}}>↔</div>
        </div>
        <div style={{position: 'absolute', left: 28, top: 26, padding: '10px 15px', borderRadius: 999, background: '#071f19b8', backdropFilter: 'blur(12px)', font: `600 16px ${sans}`, letterSpacing: 2}}>原始照片 · ORIGINAL</div>
        <div style={{position: 'absolute', right: 28, top: 26, padding: '10px 15px', borderRadius: 999, background: '#071f19b8', backdropFilter: 'blur(12px)', font: `600 16px ${sans}`, letterSpacing: 2}}>AIGC · BIT ART</div>
        <div style={{position: 'absolute', left: 36, bottom: 30, font: `700 34px ${serif}`, textShadow: '0 3px 18px #000'}}>把真实瞬间，重新讲成一段会动的记忆</div>
      </div>
    </AbsoluteFill>
  );
};

const MemoryReelScene: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <AmbientBackground tone="dark" />
      <Phone src="recordings/memory-reel.webm" playbackRate={2.08} />
      <div style={{position: 'absolute', left: 145, top: 92, width: 870}}>
        <BrandMark light />
        <div style={{marginTop: 100}}>
          <SectionLabel number="03.2" label="游后 · 回忆短片" dark />
          <h1 style={{margin: 0, color: C.white, font: `700 68px/1.16 ${serif}`}}>不止记录结果<br />让一天重新播放</h1>
          <p style={{margin: '29px 0 34px', color: '#c6d8cf', font: `400 24px/1.7 ${sans}`, width: 780}}>AI 将路线、徽章、伙伴留言与票根，自动剪成一段会呼吸的旅行回忆。</p>
          <div style={{display: 'flex', gap: 12, flexWrap: 'wrap'}}>
            <FeaturePill index={0} dark>路线足迹</FeaturePill>
            <FeaturePill index={1} dark>成就徽章</FeaturePill>
            <FeaturePill index={2} dark>伙伴寄语</FeaturePill>
          </div>
          <div style={{marginTop: 47, display: 'flex', alignItems: 'center', gap: 18, opacity: interpolate(frame, [112, 142], [0, 1], clamp)}}>
            <div style={{width: 58, height: 58, borderRadius: 20, border: `1px solid ${C.gold}`, display: 'grid', placeItems: 'center', color: C.gold, font: `700 21px ${sans}`}}>H5</div>
            <div style={{font: `600 21px/1.5 ${sans}`, color: C.white}}>一键生成 · 自动叙事<br /><span style={{color: C.mint}}>让旅程拥有第二次生命</span></div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const ticketData = [
  {src: 'images/tickets/ticket-tuantuan.png', name: '团团', rotate: -10, x: -250, y: 42, delay: 12},
  {src: 'images/tickets/ticket-awu.png', name: '阿悟', rotate: 0, x: 0, y: -12, delay: 24},
  {src: 'images/tickets/ticket-youmi.png', name: '悠米', rotate: 10, x: 250, y: 42, delay: 36},
];

const TicketFanScene: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return (
    <AbsoluteFill>
      <AmbientBackground />
      <div style={{position: 'absolute', left: 115, top: 80, width: 650, zIndex: 5}}>
        <BrandMark />
        <div style={{marginTop: 105}}>
          <SectionLabel number="03.3" label="游后 · 专属票根" />
          <h1 style={{margin: 0, color: C.ink, font: `700 62px/1.15 ${serif}`}}>把一天的奇遇<br />留成一张会说<br />故事的票根</h1>
          <p style={{margin: '27px 0 29px', color: '#52665e', font: `400 22px/1.7 ${sans}`, width: 610}}>旅程伙伴、展区足迹、徽章与里程，被压缩成一张独一无二的纪念。</p>
          <div style={{display: 'flex', flexWrap: 'wrap', gap: 10, width: 620}}>
            <FeaturePill index={0}>真实行程数据</FeaturePill>
            <FeaturePill index={1}>伙伴专属设计</FeaturePill>
            <FeaturePill index={2}>可保存 · 可分享</FeaturePill>
          </div>
        </div>
      </div>
      <div style={{position: 'absolute', left: 760, right: 45, top: 150, bottom: 95}}>
        {ticketData.map((ticket, index) => {
          const open = spring({frame: frame - ticket.delay, fps, config: {damping: 13, mass: .78, stiffness: 90}});
          const float = Math.sin((frame + index * 13) / 26) * 5;
          return (
            <div
              key={ticket.name}
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: 820,
                height: 348,
                borderRadius: 26,
                overflow: 'hidden',
                background: C.cream,
                boxShadow: '0 28px 65px rgba(27,54,44,.22), 0 6px 18px rgba(27,54,44,.12)',
                zIndex: index === 1 ? 3 : 2,
                opacity: interpolate(open, [0, .16, 1], [0, 1, 1]),
                transformOrigin: '50% 118%',
                transform: `translate(-50%, -50%) translate(${interpolate(open, [0, 1], [0, ticket.x])}px, ${interpolate(open, [0, 1], [150, ticket.y + float])}px) rotate(${interpolate(open, [0, 1], [0, ticket.rotate])}deg) scale(${interpolate(open, [0, 1], [.72, 1])})`,
              }}
            >
              <Img src={staticFile(ticket.src)} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
              <div style={{position: 'absolute', left: 22, top: 20, padding: '8px 13px', borderRadius: 999, background: '#062b24d9', color: C.white, font: `600 15px ${sans}`, letterSpacing: 2}}>{ticket.name} · MEMORY TICKET</div>
            </div>
          );
        })}
        <div style={{position: 'absolute', left: '50%', bottom: -2, transform: 'translateX(-50%)', color: C.ink, font: `600 20px ${serif}`, letterSpacing: 2, opacity: interpolate(frame, [108, 143], [0, 1], clamp)}}>每一张票根，都是下一次出发的邀请。</div>
      </div>
    </AbsoluteFill>
  );
};

const endFireflies = [
  [315, 350, 5, 2], [470, 740, 7, 13], [620, 245, 4, 24], [740, 820, 5, 8],
  [910, 260, 6, 19], [1145, 805, 4, 5], [1285, 275, 5, 16], [1440, 725, 7, 28],
  [1580, 390, 4, 10], [360, 585, 3, 21], [1510, 565, 5, 1], [1080, 190, 3, 12],
] as const;

const ArtisticQiyuEnd: React.FC = () => {
  const frame = useCurrentFrame();
  const titleIn = spring({frame: frame - 8, fps: 30, config: {damping: 13, stiffness: 82, mass: .82}});
  const fly = interpolate(frame, [42, 124], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const dot = spring({frame: frame - 116, fps: 30, config: {damping: 9, stiffness: 130, mass: .5}});
  const fireflyOpacity = interpolate(frame, [38, 48, 116, 129], [0, 1, 1, 0], clamp);
  return (
    <AbsoluteFill style={{overflow: 'hidden', background: C.forestDark}}>
      <Audio src={staticFile('audio/qiyu-title.wav')} volume={0.72} />
      <AbsoluteFill style={{background: `radial-gradient(circle at 50% 48%, #17624b 0%, ${C.forest} 34%, ${C.forestDark} 78%)`}} />
      <div style={{position: 'absolute', inset: -100, opacity: .055, color: C.white, backgroundImage: 'linear-gradient(90deg,currentColor 1px,transparent 1px),linear-gradient(currentColor 1px,transparent 1px)', backgroundSize: '74px 74px', transform: `translateX(${Math.sin(frame / 33) * 12}px)`}} />

      {endFireflies.map(([x, y, size, phase], index) => (
        <div key={`${x}-${y}`} style={{position: 'absolute', left: x + Math.sin((frame + phase) / 18) * 20, top: y + Math.cos((frame + phase) / 15) * 16, width: size, height: size, borderRadius: '50%', background: index % 3 === 0 ? C.mint : C.gold, boxShadow: `0 0 ${size * 5}px ${index % 3 === 0 ? C.mint : C.gold}`, opacity: interpolate(frame, [14 + index * 2, 45 + index * 2], [0, .3 + .6 * Math.abs(Math.sin((frame + phase) / 9))], clamp)}} />
      ))}

      <svg viewBox="0 0 1920 1080" style={{position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: interpolate(titleIn, [0, 1], [0, 1]), transform: `translateY(${interpolate(titleIn, [0, 1], [44, 0])}px) scale(${interpolate(titleIn, [0, 1], [.9, 1])})`}}>
        <defs>
          <linearGradient id="artGold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fff8df" />
            <stop offset="52%" stopColor="#f0d28a" />
            <stop offset="100%" stopColor="#dcae48" />
          </linearGradient>
          <filter id="artGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <mask id="yuWithoutDot" maskUnits="userSpaceOnUse">
            <rect x="0" y="0" width="1920" height="1080" fill="white" />
            <ellipse cx="1036" cy="398" rx="42" ry="49" fill="black" transform="rotate(-24 1036 398)" />
          </mask>
        </defs>
        <path d="M 470 724 C 690 838, 838 777, 982 705 C 1180 607, 1375 675, 1510 472" fill="none" stroke="#e1b34f" strokeWidth="2.5" opacity=".42" />
        <text x="600" y="690" fontSize="420" fontFamily="STKaiti, KaiTi, serif" fontWeight="700" fill="url(#artGold)" filter="url(#artGlow)">奇</text>
        <text x="960" y="690" fontSize="420" fontFamily="STKaiti, KaiTi, serif" fontWeight="700" fill="url(#artGold)" filter="url(#artGlow)" mask="url(#yuWithoutDot)">遇</text>
        <path d="M 1012 420 Q 1036 373 1060 410 Q 1053 443 1023 449 Z" fill="url(#artGold)" filter="url(#artGlow)" opacity={interpolate(dot, [0, .25, 1], [0, 1, 1])} transform={`translate(${interpolate(dot, [0, 1], [0, 0])} 0) scale(${interpolate(dot, [0, 1], [.15, 1])})`} style={{transformOrigin: '1036px 414px'}} />
      </svg>

      <div style={{position: 'absolute', width: 19, height: 19, borderRadius: '50%', background: '#fff6cf', boxShadow: '0 0 0 8px rgba(225,179,79,.14), 0 0 38px 12px #e1b34f', offsetPath: 'path("M 1580 835 C 1450 760, 1375 560, 1215 575 C 1110 585, 1010 510, 1036 408")', offsetDistance: `${fly * 100}%`, opacity: fireflyOpacity}} />

      <div style={{position: 'absolute', left: '50%', bottom: 155, transform: 'translateX(-50%)', textAlign: 'center', opacity: interpolate(frame, [130, 155], [0, 1], clamp)}}>
        <div style={{color: C.white, font: `600 28px ${serif}`, letterSpacing: 5}}>奇遇，不止在园区发生</div>
        <div style={{marginTop: 16, color: C.gold, font: `600 17px ${sans}`, letterSpacing: 8}}>QIYUCL.SITE</div>
      </div>
    </AbsoluteFill>
  );
};

const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const scale = spring({frame, fps, config: {damping: 16, stiffness: 100}});
  return (
    <AbsoluteFill style={{background: C.forestDark, display: 'grid', placeItems: 'center'}}>
      <div style={{textAlign: 'center', transform: `scale(${interpolate(scale, [0, 1], [.9, 1])})`, opacity: interpolate(frame, [0, 16], [0, 1], clamp)}}>
        <div style={{display: 'flex', justifyContent: 'center'}}><BrandMark light /></div>
        <h1 style={{margin: '35px 0 20px', color: C.white, font: `700 75px ${serif}`}}>奇遇，不止在园区发生</h1>
        <div style={{color: C.gold, font: `600 22px ${sans}`, letterSpacing: 7}}>QIYUCL.SITE</div>
      </div>
    </AbsoluteFill>
  );
};

export const QiyuPromo: React.FC = () => {
  return (
    <AbsoluteFill style={{fontFamily: sans, background: C.cream}}>
      <Audio src={staticFile('audio/qiyu-ambient.wav')} volume={0.72} />
      <Sequence from={0} durationInFrames={110}><Fade duration={110}><Intro /></Fade></Sequence>
      <Sequence from={90} durationInFrames={220}><Fade duration={220}><AgentMatrix /></Fade></Sequence>
      <Sequence from={290} durationInFrames={380}><Fade duration={380}><PreTrip /></Fade></Sequence>
      <Sequence from={650} durationInFrames={540}><Fade duration={540}><InPark /></Fade></Sequence>
      <Sequence from={1170} durationInFrames={215}><Fade duration={215}><PostTrip /></Fade></Sequence>
      <Sequence from={1365} durationInFrames={255}><Fade duration={255}><AigcCompare /></Fade></Sequence>
      <Sequence from={1595} durationInFrames={305}><Fade duration={305}><MemoryReelScene /></Fade></Sequence>
      <Sequence from={1880} durationInFrames={240}><Fade duration={240}><TicketFanScene /></Fade></Sequence>
      <Sequence from={2100} durationInFrames={180}><Fade duration={180}><ArtisticQiyuEnd /></Fade></Sequence>
    </AbsoluteFill>
  );
};
