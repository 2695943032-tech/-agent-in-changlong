<script setup lang="ts">
import type { CatalogResponse } from '../../../shared/types/pretrip'
import type { JourneyPhase } from './types'
import JourneyCompanionCarousel from './JourneyCompanionCarousel.vue'
import JourneyPhaseCard from './JourneyPhaseCard.vue'
import MagicGridField from '../ui/MagicGridField.vue'
import MagicShimmerLink from '../ui/MagicShimmerLink.vue'

const pretrip = usePretripJourney()
const park = useParkJourney()
const { data: catalog } = await useFetch<CatalogResponse>('/api/catalog', { key: 'journey-hub-catalog' })
const activePhaseId = shallowRef<JourneyPhase['id']>('inpark')

const phases = computed<JourneyPhase[]>(() => [
  {
    id: 'pretrip', index: '01', eyebrow: '出发以前', title: '奇遇启程', englishTitle: 'PLAN',
    description: '与一位动物伙伴聊聊，把期待、节奏和时间变成一条真正走得通的路线。',
    to: '/pretrip', accent: '#d9ae58', accentSoft: '#f0dcae', image: '/companions/panda-selection.png', animal: '熊猫团团',
    status: pretrip.state.value.plan ? '路线已准备好' : '开始规划',
  },
  {
    id: 'inpark', index: '02', eyebrow: '正在发生', title: '园中探险', englishTitle: 'LIVE',
    description: '地图感知每次抵达，六位伙伴、现场科普和实时改线随空间逐一苏醒。',
    to: '/pretrip', accent: '#6fc596', accentSoft: '#bde4ce', image: '/companions/elephant-selection.png', animal: '大象澜澜',
    status: park.state.value.started ? `${park.state.value.visitedZoneIds.length}/6 展区已探索` : '进入园区',
  },
  {
    id: 'posttrip', index: '03', eyebrow: '奇遇之后', title: '回忆星册', englishTitle: 'MEMORY',
    description: '让足迹、伙伴与徽章沉淀成一份专属记录，把一天的故事带回家。',
    to: '/posttrip', accent: '#a994d6', accentSoft: '#d7cbed', image: '/companions/gorilla-selection.png', animal: '猩猩阿悟',
    status: park.state.value.visitedZoneIds.length ? `${park.state.value.badgeZoneIds.length} 枚徽章已收藏` : '查看回忆',
  },
])

function activatePhase(phaseId: JourneyPhase['id']) {
  activePhaseId.value = phaseId
}
</script>

<template>
  <main class="brand-home">
    <a class="skip-link" href="#journey-main">跳到主要内容</a>
    <MagicGridField />

    <header class="brand-nav">
      <NuxtLink class="brand-lockup" to="/" aria-label="长隆奇遇伴侣首页">
        <span class="brand-monogram">Q</span>
        <span><strong>奇遇伴侣</strong><small>CHIMELONG · SPATIAL AGENT</small></span>
      </NuxtLink>
      <div class="nav-status"><i /> LIVE SYSTEM <span>全周期智能游园</span></div>
      <NuxtLink class="nav-entry" to="/pretrip">进入园区 <span>↗</span></NuxtLink>
    </header>

    <section id="journey-main" class="brand-hero">
      <div class="hero-copy">
        <div class="hero-index blur-reveal reveal-1"><span>FULL-CYCLE EXPERIENCE</span><b>2026 / 01</b></div>
        <h1 class="blur-reveal reveal-2">
          让每一次<br>
          <em>相遇</em>，都有<br>
          伙伴记得
        </h1>
        <p class="hero-lead blur-reveal reveal-3">从出发前的一句期待，到园中每一次空间唤醒，再到回家后的长久珍藏。动物 Agent 不只是导游，而是贯穿整段旅程的朋友。</p>
        <div class="hero-actions blur-reveal reveal-4">
          <MagicShimmerLink to="/pretrip" meta="START WITH A COMPANION" label="开始我的奇遇" />
          <NuxtLink class="quiet-link" to="/pretrip"><span>已经到园区</span><strong>打开 Agent 对话与地图</strong><i>→</i></NuxtLink>
        </div>
        <dl class="hero-metrics blur-reveal reveal-5">
          <div><dt>06</dt><dd>动物伙伴</dd></div>
          <div><dt>03</dt><dd>旅程阶段</dd></div>
          <div><dt>01</dt><dd>持续记忆</dd></div>
        </dl>
      </div>

      <JourneyCompanionCarousel
        v-if="catalog"
        class="blur-reveal reveal-3"
        :companions="catalog.companions"
      />
    </section>

    <section class="journey-section" aria-labelledby="journey-title">
      <header class="journey-heading">
        <div><span>THE JOURNEY</span><h2 id="journey-title">一场奇遇，三段旅程</h2></div>
        <p>选择现在所处的阶段。已完成的状态会保存在本机，下一次回来仍能从原处继续。</p>
      </header>

      <div class="journey-rail">
        <div class="golden-track" aria-hidden="true"><i /><span /><span /><span /></div>
        <JourneyPhaseCard
          v-for="phase in phases"
          :key="phase.id"
          :phase="phase"
          :active="activePhaseId === phase.id"
          @activate="activatePhase"
        />
      </div>
    </section>

    <footer class="brand-footer">
      <span>CHIMELONG QIYU COMPANION</span>
      <p>GIS GEOFENCE · 6 ANIMAL AGENTS · REAL-TIME ROUTING · AIGC MEMORY</p>
      <strong>让科技退后一步，让陪伴走近一点。</strong>
    </footer>
  </main>
</template>

<style scoped>
.brand-home {
  --home-ivory: #f2eddf;
  --home-gold: #d9ae58;
  --home-green: #6fc596;
  position: relative;
  width: min(100%, 1440px);
  min-height: 100dvh;
  margin: 0 auto;
  overflow: hidden;
  background: #071b15;
  color: var(--home-ivory);
  isolation: isolate;
}

.skip-link { position: fixed; z-index: 100; top: 10px; left: 10px; padding: 10px 14px; background: var(--home-gold); color: #071b15; font-size: 12px; font-weight: 800; text-decoration: none; transform: translateY(-160%); transition: transform 180ms ease; }
.skip-link:focus { transform: translateY(0); }

.brand-nav {
  position: relative;
  z-index: 5;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  min-height: 88px;
  align-items: center;
  margin: 0 4.2%;
  border-bottom: 1px solid rgba(229, 213, 173, .16);
}

.brand-lockup { display: inline-flex; width: fit-content; align-items: center; gap: 12px; color: inherit; text-decoration: none; }
.brand-monogram { display: grid; width: 38px; height: 38px; place-items: center; border: 1px solid rgba(229,213,173,.35); color: var(--home-gold); font-family: Georgia, serif; font-size: 19px; }
.brand-lockup > span:last-child { display: grid; gap: 3px; }
.brand-lockup strong { font-family: var(--font-display); font-size: 14px; letter-spacing: .16em; }
.brand-lockup small { color: rgba(242,237,223,.42); font-size: 7px; letter-spacing: .17em; }
.nav-status { display: inline-flex; align-items: center; gap: 8px; color: rgba(242,237,223,.48); font-family: ui-monospace, Consolas, monospace; font-size: 8px; letter-spacing: .12em; }
.nav-status i { width: 5px; height: 5px; border-radius: 50%; background: #73d29d; box-shadow: 0 0 0 5px rgba(115,210,157,.1); animation: live-pulse 2.2s ease-in-out infinite; }
.nav-status span { color: rgba(242,237,223,.7); font-family: inherit; }
.nav-entry { justify-self: end; color: rgba(242,237,223,.76); font-size: 10px; font-weight: 700; letter-spacing: .08em; text-decoration: none; }
.nav-entry span { display: inline-grid; width: 28px; height: 28px; margin-left: 8px; place-items: center; border: 1px solid rgba(242,237,223,.19); border-radius: 50%; transition: background 240ms ease, transform 320ms cubic-bezier(.16,1,.3,1); }
.nav-entry:hover span { background: var(--home-gold); color: #071b15; transform: rotate(45deg); }

.brand-hero { position: relative; z-index: 2; display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(360px, .9fr); min-height: 690px; padding: 74px 7.2% 88px; gap: 7%; }
.hero-copy { align-self: center; }
.hero-index { display: flex; max-width: 540px; align-items: center; justify-content: space-between; color: rgba(242,237,223,.44); font-family: ui-monospace, Consolas, monospace; font-size: 8px; letter-spacing: .18em; }
.hero-index span::before { display: inline-block; width: 32px; height: 1px; margin-right: 10px; background: var(--home-gold); content: ''; vertical-align: middle; }
.hero-index b { font-weight: 500; }
.hero-copy h1 { margin: 31px 0 24px; font-family: var(--font-display); font-size: clamp(58px, 6.2vw, 92px); font-weight: 700; line-height: .99; letter-spacing: .055em; }
.hero-copy h1 em { position: relative; color: var(--home-gold); font-style: normal; }
.hero-copy h1 em::after { position: absolute; right: -14px; bottom: 6px; left: -3px; height: 7px; background: rgba(217,174,88,.12); content: ''; transform: skewX(-18deg); }
.hero-lead { max-width: 540px; margin: 0; color: rgba(242,237,223,.57); font-size: 12px; line-height: 2; }
.hero-actions { display: flex; align-items: stretch; margin-top: 37px; gap: 14px; }
.quiet-link { display: grid; grid-template-columns: 1fr 22px; min-width: 190px; align-content: center; padding: 8px 17px; gap: 2px 12px; border: 1px solid rgba(242,237,223,.14); color: inherit; text-decoration: none; transition: border-color 300ms ease, background 300ms ease; }
.quiet-link span { color: rgba(242,237,223,.42); font-size: 8px; }
.quiet-link strong { font-size: 10px; }
.quiet-link i { grid-column: 2; grid-row: 1 / span 2; align-self: center; color: var(--home-gold); font-style: normal; transition: transform 320ms cubic-bezier(.16,1,.3,1); }
.quiet-link:hover { border-color: rgba(217,174,88,.42); background: rgba(255,255,255,.025); }
.quiet-link:hover i { transform: translateX(4px); }
.hero-metrics { display: flex; margin: 44px 0 0; gap: 0; }
.hero-metrics div { display: grid; min-width: 108px; padding: 0 24px; gap: 3px; border-left: 1px solid rgba(242,237,223,.13); }
.hero-metrics div:first-child { padding-left: 0; border-left: 0; }
.hero-metrics dt { font-family: Georgia, serif; font-size: 25px; }
.hero-metrics dd { margin: 0; color: rgba(242,237,223,.4); font-size: 8px; letter-spacing: .12em; }

.hero-preview { position: relative; width: min(100%, 450px); align-self: center; justify-self: center; }
.preview-coordinate { display: flex; justify-content: space-between; margin-bottom: 9px; color: rgba(242,237,223,.33); font-family: ui-monospace, Consolas, monospace; font-size: 7px; letter-spacing: .12em; }
.preview-frame { position: relative; aspect-ratio: .89; padding: 18px; border: 1px solid rgba(242,237,223,.14); background: rgba(255,255,255,.022); box-shadow: 0 34px 80px rgba(0,0,0,.28); }
.phase-portrait { position: relative; height: 100%; margin: 0; overflow: hidden; background: #eee9dc; }
.phase-portrait::after { position: absolute; inset: 0; background: linear-gradient(180deg, transparent 56%, rgba(7,27,21,.72)); content: ''; }
.phase-portrait img { width: 100%; height: 100%; object-fit: cover; transition: transform 1.2s cubic-bezier(.16,1,.3,1); }
.hero-preview:hover .phase-portrait img { transform: scale(1.035); }
.phase-portrait figcaption { position: absolute; z-index: 2; right: 22px; bottom: 20px; left: 22px; display: flex; align-items: end; justify-content: space-between; color: #fff; }
.phase-portrait figcaption small { color: color-mix(in srgb, var(--active-accent) 76%, #fff); font-size: 8px; font-weight: 900; letter-spacing: .16em; }
.phase-portrait figcaption strong { font-family: var(--font-display); font-size: 20px; letter-spacing: .08em; }
.frame-corner { position: absolute; width: 22px; height: 22px; border-color: var(--active-accent); transition: border-color 500ms ease; }
.corner-a { top: 8px; left: 8px; border-top: 1px solid; border-left: 1px solid; }
.corner-b { right: 8px; bottom: 8px; border-right: 1px solid; border-bottom: 1px solid; }
.preview-orbit { position: absolute; z-index: -1; inset: -36px -58px; border: 1px solid rgba(242,237,223,.09); border-radius: 50%; transform: rotate(-12deg); }
.preview-orbit i { position: absolute; width: 8px; height: 8px; border: 1px solid var(--active-accent); border-radius: 50%; background: #071b15; transition: border-color 500ms ease; }
.preview-orbit i:nth-child(1) { top: 18%; right: 2%; }
.preview-orbit i:nth-child(2) { bottom: 8%; left: 20%; }
.preview-orbit i:nth-child(3) { top: 2%; left: 29%; }
.preview-note { position: absolute; right: -22px; bottom: -28px; display: grid; min-width: 240px; padding: 15px 18px; gap: 4px; border-left: 2px solid var(--active-accent); background: #102a21; box-shadow: 0 18px 45px rgba(0,0,0,.25); transition: border-color 500ms ease; }
.preview-note span { color: var(--active-accent); font-family: ui-monospace, Consolas, monospace; font-size: 7px; letter-spacing: .14em; }
.preview-note strong { font-family: var(--font-display); font-size: 12px; letter-spacing: .04em; }

.preview-swap-enter-active,
.preview-swap-leave-active { transition: opacity 420ms ease, transform 620ms cubic-bezier(.16,1,.3,1), filter 420ms ease; }
.preview-swap-enter-from { opacity: 0; filter: blur(8px); transform: translateY(18px) scale(.985); }
.preview-swap-leave-to { opacity: 0; filter: blur(6px); transform: translateY(-10px) scale(1.01); }

.journey-section { position: relative; z-index: 2; padding: 82px 7.2% 105px; border-top: 1px solid rgba(229,213,173,.13); background: linear-gradient(180deg, rgba(13,43,34,.58), rgba(5,20,16,.78)); }
.journey-heading { display: grid; grid-template-columns: 1fr 330px; align-items: end; margin-bottom: 45px; gap: 40px; }
.journey-heading span { color: var(--home-gold); font-family: ui-monospace, Consolas, monospace; font-size: 8px; letter-spacing: .18em; }
.journey-heading h2 { margin: 9px 0 0; font-family: var(--font-display); font-size: clamp(34px, 4.1vw, 56px); letter-spacing: .055em; }
.journey-heading p { margin: 0; color: rgba(242,237,223,.47); font-size: 10px; line-height: 1.9; }
.journey-rail { position: relative; max-width: 1100px; margin-left: auto; }
.golden-track { position: absolute; top: 0; bottom: 0; left: -34px; width: 1px; background: linear-gradient(180deg, transparent, rgba(217,174,88,.55) 18%, rgba(217,174,88,.16) 85%, transparent); }
.golden-track i { position: absolute; top: 0; left: -2px; width: 5px; height: 5px; border-radius: 50%; background: var(--home-gold); box-shadow: 0 0 0 6px rgba(217,174,88,.08); animation: track-travel 6.5s ease-in-out infinite; }
.golden-track span { position: absolute; left: -3px; width: 7px; height: 7px; border: 1px solid rgba(217,174,88,.58); border-radius: 50%; background: #0b241c; }
.golden-track span:nth-of-type(1) { top: 16%; }
.golden-track span:nth-of-type(2) { top: 50%; }
.golden-track span:nth-of-type(3) { top: 84%; }

.brand-footer { position: relative; z-index: 2; display: grid; grid-template-columns: 1fr 1.5fr 1fr; min-height: 122px; align-items: center; padding: 24px 4.2%; gap: 30px; border-top: 1px solid rgba(229,213,173,.13); background: #04130f; }
.brand-footer span { color: var(--home-gold); font-family: ui-monospace, Consolas, monospace; font-size: 8px; letter-spacing: .16em; }
.brand-footer p { margin: 0; color: rgba(242,237,223,.27); font-size: 7px; letter-spacing: .12em; text-align: center; }
.brand-footer strong { justify-self: end; font-family: var(--font-display); font-size: 11px; font-weight: 500; letter-spacing: .06em; }

.blur-reveal { animation: blur-rise 900ms cubic-bezier(.16,1,.3,1) both; }
.reveal-1 { animation-delay: 80ms; }
.reveal-2 { animation-delay: 150ms; }
.reveal-3 { animation-delay: 240ms; }
.reveal-4 { animation-delay: 330ms; }
.reveal-5 { animation-delay: 420ms; }

@keyframes blur-rise { from { opacity: 0; filter: blur(7px); transform: translateY(18px); } to { opacity: 1; filter: blur(0); transform: translateY(0); } }
@keyframes live-pulse { 50% { opacity: .55; box-shadow: 0 0 0 8px rgba(115,210,157,.04); } }
@keyframes track-travel { 0% { top: 0; opacity: 0; } 12% { opacity: 1; } 88% { opacity: 1; } 100% { top: 100%; opacity: 0; } }

@media (max-width: 980px) {
  .brand-hero { grid-template-columns: minmax(0,1fr) minmax(300px,.82fr); padding-right: 5%; padding-left: 5%; gap: 5%; }
  .hero-copy h1 { font-size: clamp(52px, 7vw, 70px); }
  .brand-nav { margin: 0 3%; }
}

/* 小程序目标：所有屏幕统一使用竖向手机画布，桌面访问时居中展示。 */
@media screen {
  .brand-home { width: min(100%, 480px); box-shadow: 0 0 70px rgba(2,15,11,.26); }
  .brand-nav { grid-template-columns: 1fr auto; min-height: calc(70px + env(safe-area-inset-top)); margin: 0 17px; padding-top: env(safe-area-inset-top); }
  .brand-monogram { width: 33px; height: 33px; font-size: 17px; }
  .brand-lockup strong { font-size: 12px; }
  .brand-lockup small { font-size: 5px; }
  .nav-status { display: none; }
  .nav-entry { font-size: 8px; }
  .nav-entry span { width: 25px; height: 25px; }
  .brand-hero { display: flex; min-height: auto; padding: 48px 20px 78px; flex-direction: column; gap: 58px; }
  .hero-index { font-size: 7px; }
  .hero-copy h1 { margin: 24px 0 20px; font-size: clamp(48px, 15vw, 66px); line-height: 1.03; }
  .hero-lead { font-size: 10px; line-height: 1.85; }
  .hero-actions { display: grid; margin-top: 28px; }
  .quiet-link { min-height: 56px; }
  .hero-metrics { margin-top: 34px; }
  .hero-metrics div { min-width: 0; flex: 1; padding: 0 15px; }
  .hero-metrics dt { font-size: 21px; }
  .hero-metrics dd { font-size: 7px; }
  .hero-preview { width: calc(100% - 22px); }
  .preview-frame { padding: 12px; }
  .preview-note { right: -11px; bottom: -22px; min-width: 210px; padding: 12px 14px; }
  .preview-orbit { inset: -25px -30px; }
  .journey-section { padding: 65px 18px 75px; }
  .journey-heading { grid-template-columns: 1fr; margin-bottom: 28px; gap: 14px; }
  .journey-heading h2 { font-size: 34px; }
  .journey-heading p { font-size: 9px; }
  .journey-rail { padding-left: 11px; }
  .golden-track { left: -1px; }
  .brand-footer { grid-template-columns: 1fr; min-height: 160px; padding: 25px 20px max(25px, env(safe-area-inset-bottom)); gap: 10px; }
  .brand-footer p { text-align: left; line-height: 1.7; }
  .brand-footer strong { justify-self: start; }
}

@media (prefers-reduced-motion: reduce) {
  .blur-reveal,
  .nav-status i,
  .golden-track i { animation: none; }
  .preview-swap-enter-active,
  .preview-swap-leave-active { transition-duration: .01ms; }
}
</style>
