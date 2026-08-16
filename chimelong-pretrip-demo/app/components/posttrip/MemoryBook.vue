<script setup lang="ts">
import type { CatalogResponse } from '../../../shared/types/pretrip'
import type { JourneyRecord } from '../../../shared/types/journey'
import { buildJourneyTicket } from '../../utils/journeyRecord'
import JourneyMediaThumb from '../journey-ticket/JourneyMediaThumb.vue'
import JourneyTicketPreview from '../journey-ticket/JourneyTicketPreview.vue'
import ParkRasterMap from '../map/ParkRasterMap.vue'
import JourneyEventTimeline from './JourneyEventTimeline.vue'
import JourneyMemoryReel from './JourneyMemoryReel.vue'
import { zoneExperienceConfigs } from '#shared/data/zoneExperience'

type MemoryTab = 'route' | 'events' | 'recap' | 'badges' | 'photos' | 'reel' | 'ticket'

const props = defineProps<{ journey: JourneyRecord, catalog: CatalogResponse }>()
const emit = defineEmits<{ finish: [] }>()

const activeTab = shallowRef<MemoryTab>('route')
const reelOpen = shallowRef(false)
const memoryTabs = useTemplateRef<HTMLElement>('memoryTabs')
const route = useRoute()
const returnTo = computed(() => route.query.from === 'chat' ? '/pretrip?tab=chat' : '/me')

const tabs: Array<{ id: MemoryTab, index: string, label: string }> = [
  { id: 'route', index: '01', label: '路线故事' },
  { id: 'events', index: '02', label: '发生过的事' },
  { id: 'recap', index: '03', label: '伙伴总结' },
  { id: 'badges', index: '04', label: '观察证明' },
  { id: 'photos', index: '05', label: '现场光线' },
  { id: 'reel', index: '15s', label: '回忆短片' },
  { id: 'ticket', index: '06', label: '奇遇票根' },
]

const companion = computed(() => props.catalog.companions.find(item => item.id === props.journey.primaryCompanionId) ?? props.catalog.companions[0]!)
const ticket = computed(() => props.journey.ticket ?? buildJourneyTicket(props.journey))
const completed = computed(() => props.journey.status === 'completed')
const photos = computed(() => props.journey.media.filter(item => item.kind === 'photo'))
const recoveredFromPlan = computed(() => props.journey.events.some(event => event.data?.recoveredFromPlan === true))
const activeTabMeta = computed(() => tabs.find(tab => tab.id === activeTab.value) ?? tabs[0]!)

function scrollMemoryTabs(direction: -1 | 1) {
  memoryTabs.value?.scrollBy({ left: direction * 184, behavior: 'smooth' })
}

async function shareMemory() {
  const shareData = {
    title: '我的长隆奇遇票根',
    text: `${companion.value.name}陪我完成了今天的动物园奇遇。`,
  }
  if (navigator.share) await navigator.share(shareData)
  else await navigator.clipboard?.writeText(`${shareData.title}：${shareData.text}`)
}

async function selectMemoryTab(tabId: MemoryTab) {
  activeTab.value = tabId
  await nextTick()
  memoryTabs.value
    ?.querySelector<HTMLButtonElement>(`[data-tab-id="${tabId}"]`)
    ?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
}

const routeDifference = computed(() => {
  const planned = props.journey.planSnapshot.zoneIds
  const actual = props.journey.actualJourney.visitedZoneIds
  const skipped = planned.filter(id => !actual.includes(id)).length
  const added = actual.filter(id => !planned.includes(id)).length
  return { skipped, added }
})

const companionSummary = computed(() => {
  const state = props.journey.actualJourney
  return `${companion.value.name}陪你走过 ${state.visitedZoneIds.length} 个动物展区，完成 ${state.completedTaskIds.length} 次现场观察。${state.routeChanges.length ? '路线虽然临时改变过，但那些意外也成为了今天的一部分。' : '你们按自己的节奏走完了这段路。'}`
})
</script>

<template>
  <main class="memory-book" :style="{ '--memory-accent': companion.accent }">
    <header class="memory-nav">
      <button type="button" aria-label="返回上一入口" @click="navigateTo(returnTo)">←</button>
      <div>
        <span>03 · JOURNEY MEMORY</span>
        <strong>回忆星册</strong>
      </div>
      <NuxtLink to="/posttrip/tickets">票根册</NuxtLink>
    </header>

    <section class="memory-hero">
      <div class="hero-index">
        <span>{{ journey.visitDate.replaceAll('-',' / ') }}</span>
        <i>NO. {{ journey.id.slice(-6).toUpperCase() }}</i>
      </div>
      <div class="hero-copy">
        <span>ONE DAY, MANY ENCOUNTERS</span>
        <h1>今天的奇遇 <em>已经有了名字</em></h1>
        <p>{{ companionSummary }}</p>
      </div>
      <img :src="companion.chatCharacterImage" :alt="`${companion.name}陪伴本次旅程`">
    </section>

    <div class="memory-tab-shell">
      <button class="tab-scroll-button" type="button" aria-label="向左查看更多栏目" @click="scrollMemoryTabs(-1)">‹</button>
      <nav ref="memoryTabs" class="memory-tabs" aria-label="回忆星册栏目">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          :data-tab-id="tab.id"
          :class="{ active: activeTab === tab.id }"
          @click="selectMemoryTab(tab.id)"
        >
          <small>{{ tab.index }}</small>
          <span>{{ tab.label }}</span>
        </button>
      </nav>
      <button class="tab-scroll-button" type="button" aria-label="向右查看更多栏目" @click="scrollMemoryTabs(1)">›</button>
    </div>

    <section class="memory-panel" :aria-label="activeTabMeta.label">
      <Transition name="memory-panel" mode="out-in">
        <div :key="activeTab" class="panel-content">
          <article v-if="activeTab === 'route'" class="route-story memory-card">
            <header>
              <span>01 · ROUTE STORY</span>
              <h2>计划是一条线，奇遇是走出来的路</h2>
            </header>
            <div class="route-map">
              <ParkRasterMap
                :animals="catalog.animals"
                :route-zone-ids="journey.planSnapshot.zoneIds"
                :actual-route-zone-ids="journey.actualJourney.visitedZoneIds"
                :completed-zone-ids="journey.actualJourney.visitedZoneIds"
                :initial-zoom="1.5"
                :min-zoom="1.5"
                :initial-pan-x-percent="2"
              />
            </div>
            <div class="route-legend">
              <span><i class="planned" />原计划</span>
              <span><i class="actual" />实际足迹</span>
              <strong>跳过 {{ routeDifference.skipped }} · 新增 {{ routeDifference.added }}</strong>
            </div>
            <p v-if="journey.actualJourney.routeChanges.length">{{ journey.actualJourney.routeChanges.at(-1)?.reason }}</p>
            <p v-else-if="recoveredFromPlan">旧版到访记录已按本次完成路线恢复；展区与里程来自路线快照。</p>
          </article>

          <article v-else-if="activeTab === 'events'" class="timeline-section memory-card">
            <header>
              <span>02 · ENCOUNTER LOG</span>
              <h2>今天发生过的事</h2>
            </header>
            <JourneyEventTimeline :events="journey.events" />
          </article>

          <article v-else-if="activeTab === 'recap'" class="companion-recap memory-card">
            <img :src="companion.chatCharacterImage" :alt="companion.name">
            <div>
              <span>03 · {{ companion.name }}的总结</span>
              <h2>“{{ companionSummary }}”</h2>
              <p>{{ ticket.message }}</p>
            </div>
          </article>

          <article v-else-if="activeTab === 'badges'" class="badge-grid memory-card">
            <header>
              <span>04 · FIELD REWARDS</span>
              <h2>认真观察过的证明</h2>
            </header>
            <div>
              <article v-for="zoneId in journey.actualJourney.badgeZoneIds" :key="zoneId">
                <i>✦</i>
                <strong>{{ zoneExperienceConfigs[zoneId].badgeName }}</strong>
                <span>{{ catalog.animals.find(item => item.id === zoneId)?.name }} · 已解锁</span>
              </article>
              <article v-if="!journey.actualJourney.badgeZoneIds.length" class="empty-badge">
                <i>◇</i>
                <strong>徽章仍在路上</strong>
                <span>完成园区任务后会出现在这里</span>
              </article>
            </div>
          </article>

          <article v-else-if="activeTab === 'photos'" class="photo-moments memory-card">
            <header>
              <span>05 · HIGHLIGHT MOMENTS</span>
              <h2>相册里的现场光线</h2>
            </header>
            <div v-if="photos.length" class="photo-grid">
              <JourneyMediaThumb v-for="photo in photos" :key="photo.id" :storage-key="photo.storageKey" :alt="photo.caption ?? '旅程照片'" />
            </div>
            <div v-else class="photo-empty">
              <span>还没有上传照片</span>
              <p>票根会使用动物伙伴插画作为完整封面，不会留下空白。</p>
            </div>
          </article>

          <article v-else-if="activeTab === 'reel'" class="memory-reel-entry memory-card">
            <div>
              <span>15—30 SEC · H5 MEMORY REEL</span>
              <h2>把一天，剪成一段会呼吸的回忆</h2>
              <p>路线、徽章、伙伴留言和票根会依次出现，最后由{{ companion.name }}盖下旅行印章。</p>
            </div>
            <button type="button" @click="reelOpen = true">播放回忆短片 <i>▶</i></button>
          </article>

          <article v-else class="ticket-entry memory-card">
            <header>
              <span>06 · MEMORY TICKET</span>
              <h2>领取今日奇遇票根</h2>
              <p>{{ companion.name }}已经帮你把今天的旅程装进一张票里</p>
            </header>
            <JourneyTicketPreview :ticket="ticket" :companion="companion" />
            <div class="ticket-actions">
              <NuxtLink to="/posttrip/ticket">{{ journey.ticket ? '保存 / 编辑票根' : '生成并保存票根' }}</NuxtLink>
              <button type="button" @click="shareMemory">分享回忆</button>
            </div>
          </article>
        </div>
      </Transition>
    </section>

    <JourneyMemoryReel v-if="reelOpen" :journey="journey" :companion="companion" @close="reelOpen = false" />
  </main>
</template>

<style scoped>
.memory-book { display: flex; width: min(100%,480px); height: 100dvh; margin: 0 auto; overflow: hidden; flex-direction: column; background: #eee9df; color: #24372f; }
.memory-nav { display: grid; flex: 0 0 auto; grid-template-columns: 42px 1fr auto; align-items: center; padding: max(12px,env(safe-area-inset-top)) 14px 11px; gap: 10px; background: #102b23; color: #fff; }
.memory-nav button { display: grid; width: 40px; height: 40px; place-items: center; border: 1px solid rgba(255,255,255,.17); border-radius: 14px 5px 14px 5px; background: rgba(255,255,255,.06); color: #fff; }
.memory-nav div { display: grid; gap: 1px; }
.memory-nav span { color: #dfb85f; font-size: 8px; font-weight: 900; letter-spacing: .1em; }
.memory-nav strong { font-family: var(--font-display); font-size: 15px; }
.memory-nav a { color: #dfb85f; font-size: 9px; font-weight: 900; text-decoration: none; }
.memory-hero { position: relative; flex: 0 0 clamp(145px,21dvh,172px); padding: 16px 18px 14px; overflow: hidden; background: radial-gradient(circle at 78% 22%,color-mix(in srgb,var(--memory-accent) 23%,transparent),transparent 28%),linear-gradient(155deg,#102b23,#1d4135); color: #fff; }
.hero-index { display: flex; justify-content: space-between; color: rgba(255,255,255,.42); font: 700 8px ui-monospace,monospace; }
.hero-copy { position: relative; z-index: 2; width: 72%; margin-top: 18px; }
.hero-copy > span { color: #dfb85f; font-size: 7px; font-weight: 900; letter-spacing: .13em; }
.hero-copy h1 { margin: 8px 0; font-family: var(--font-display); font-size: clamp(25px,8.2vw,34px); line-height: 1.12; letter-spacing: 0; }
.hero-copy em { display: block; color: #dfb85f; font-style: normal; }
.hero-copy p { display: -webkit-box; margin: 0; overflow: hidden; color: rgba(255,255,255,.68); font-size: 9px; line-height: 1.65; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.memory-hero > img { position: absolute; right: -34px; bottom: -56px; width: 190px; height: 220px; object-fit: contain; opacity: .58; filter: drop-shadow(0 24px 22px rgba(0,0,0,.24)); }
.memory-tab-shell { display: grid; flex: 0 0 auto; grid-template-columns: 30px minmax(0,1fr) 30px; align-items: center; padding: 12px 8px 8px; gap: 4px; }
.tab-scroll-button { display: grid; width: 28px; height: 42px; place-items: center; border: 1px solid rgba(37,54,46,.12); border-radius: 12px 4px 12px 4px; background: rgba(255,255,255,.72); color: #34463e; font-size: 20px; font-weight: 900; box-shadow: 0 8px 18px rgba(37,54,46,.06); cursor: pointer; }
.tab-scroll-button:hover { border-color: color-mix(in srgb,var(--memory-accent) 50%,transparent); background: #fff8eb; color: var(--memory-accent); }
.memory-tabs { display: flex; min-width: 0; padding: 0 1px 5px; gap: 6px; overflow-x: auto; overscroll-behavior-x: contain; scroll-behavior: smooth; scrollbar-color: color-mix(in srgb,var(--memory-accent) 52%,transparent) rgba(37,54,46,.08); scrollbar-width: thin; }
.memory-tabs::-webkit-scrollbar { height: 5px; }
.memory-tabs::-webkit-scrollbar-track { border-radius: 999px; background: rgba(37,54,46,.08); }
.memory-tabs::-webkit-scrollbar-thumb { border-radius: 999px; background: color-mix(in srgb,var(--memory-accent) 56%,#d9d0c2); }
.memory-tabs button { display: grid; flex: 0 0 auto; min-width: 82px; min-height: 43px; align-content: center; padding: 7px 9px; border: 1px solid rgba(37,54,46,.1); border-radius: 12px 4px 12px 4px; background: rgba(255,255,255,.58); color: #58635d; text-align: left; box-shadow: 0 8px 18px rgba(37,54,46,.05); }
.memory-tabs button.active { border-color: color-mix(in srgb,var(--memory-accent) 70%,transparent); background: #fff8eb; color: #253b32; }
.memory-tabs small { color: var(--memory-accent); font: 900 7px/1 ui-monospace,monospace; }
.memory-tabs span { margin-top: 3px; font-size: 9px; font-weight: 900; white-space: nowrap; }
.memory-panel { min-height: 0; flex: 1 1 auto; padding: 0 10px 10px; overflow: hidden; }
.panel-content { height: 100%; min-height: 0; overflow: hidden; }
.memory-card { height: 100%; min-height: 0; padding: 14px; overflow: hidden; border: 1px solid rgba(51,54,47,.12); border-radius: 18px 7px 18px 7px; background: rgba(255,255,255,.78); }
.memory-card > header > span,.companion-recap span,.memory-reel-entry span { color: #a85c43; font-size: 8px; font-weight: 900; letter-spacing: .11em; }
.memory-card > header h2,.companion-recap h2,.memory-reel-entry h2 { margin: 5px 0 0; font-family: var(--font-display); font-size: 20px; line-height: 1.25; letter-spacing: 0; }
.route-story { display: grid; grid-template-rows: auto minmax(0,1fr) auto auto; gap: 8px; }
.route-map { min-height: 0; overflow: hidden; border: 1px solid rgba(45,55,48,.12); border-radius: 17px 6px 17px 6px; }
.route-legend { display: flex; align-items: center; gap: 9px; color: #68726b; font-size: 8px; }
.route-legend span { display: flex; align-items: center; gap: 4px; }
.route-legend i { width: 18px; height: 4px; border-radius: 99px; }
.route-legend .planned { background: #b88a45; }
.route-legend .actual { background: #2e7d68; }
.route-legend strong { margin-left: auto; color: #34463e; }
.route-story > p { margin: 0; padding: 9px 10px; border-left: 3px solid #a85c43; background: rgba(255,250,240,.74); color: #626d66; font-size: 8px; line-height: 1.55; }
.timeline-section { overflow: auto; scrollbar-width: none; }
.timeline-section::-webkit-scrollbar { display: none; }
.timeline-section :deep(.timeline) { margin-top: 14px; }
.timeline-section :deep(.timeline article) { min-height: 58px; }
.companion-recap { display: grid; grid-template-columns: 112px 1fr; align-items: center; gap: 12px; background: #243d33; color: #fff; }
.companion-recap img { width: 128px; height: 210px; margin-left: -28px; object-fit: contain; object-position: bottom; filter: drop-shadow(0 12px 12px rgba(0,0,0,.25)); }
.companion-recap h2 { font-size: 17px; }
.companion-recap p { margin: 10px 0 0; color: #dfb85f; font-size: 9px; line-height: 1.6; }
.badge-grid { display: grid; grid-template-rows: auto minmax(0,1fr); gap: 12px; }
.badge-grid > div { display: grid; grid-template-columns: repeat(2,1fr); min-height: 0; overflow-y: auto; gap: 8px; scrollbar-width: none; }.badge-grid > div::-webkit-scrollbar { display: none; }
.badge-grid article { display: grid; min-height: 0; padding: 12px; align-content: end; border-radius: 15px 5px 15px 5px; background: #f9f4e9; }
.badge-grid article:nth-child(even) { background: #e2ebdf; }
.badge-grid i { display: grid; width: 32px; height: 32px; margin-bottom: 10px; place-items: center; border: 1px solid #a85c43; border-radius: 50%; color: #a85c43; font-style: normal; }
.badge-grid strong { font-family: var(--font-display); font-size: 15px; }
.badge-grid span { color: #777c76; font-size: 8px; }
.badge-grid .empty-badge { grid-column: 1/-1; }
.photo-moments { display: grid; grid-template-rows: auto minmax(0,1fr); gap: 12px; }
.photo-grid { display: grid; grid-template-columns: repeat(3,1fr); min-height: 0; gap: 7px; }
.photo-grid :deep(.media-thumb) { width: 100%; height: auto; aspect-ratio: 1/1.15; }
.photo-empty { display: grid; min-height: 0; place-content: center; place-items: center; border: 1px dashed rgba(45,55,48,.2); border-radius: 16px 6px 16px 6px; text-align: center; }
.photo-empty span { font-family: var(--font-display); font-size: 18px; }
.photo-empty p { max-width: 250px; margin: 6px 0 0; color: #757b75; font-size: 9px; }
.memory-reel-entry { display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 12px; background: linear-gradient(155deg,#102b23,#243d33); color: #fff; }
.memory-reel-entry h2 { max-width: 250px; color: #fff; font-size: 26px; }
.memory-reel-entry p { margin: 10px 0 0; color: rgba(255,255,255,.68); font-size: 10px; line-height: 1.7; }
.memory-reel-entry button { display: grid; width: 90px; height: 118px; place-content: center; gap: 8px; border: 0; border-radius: 20px 7px 20px 7px; background: #a85c43; color: #fff; font-size: 9px; font-weight: 900; }
.memory-reel-entry i { font-size: 20px; font-style: normal; }
.ticket-entry { display: grid; grid-template-rows: auto auto auto; align-content: start; gap: 12px; }
.ticket-entry header p { margin: 6px 0 0; color: #6f7770; font-size: 9px; }
.ticket-entry :deep(.ticket) { align-self: start; }
.ticket-actions { display: grid; grid-template-columns: 1.25fr .75fr; gap: 7px; }
.ticket-actions a,.ticket-actions button { display: grid; min-height: 42px; padding: 8px; place-items: center; border: 0; border-radius: 12px 4px 12px 4px; background: #253b32; color: #fff; font-size: 9px; font-weight: 900; text-align: center; text-decoration: none; }
.ticket-actions button { border: 1px solid rgba(45,55,48,.13); background: transparent; color: #34463e; }
.memory-panel-enter-active,.memory-panel-leave-active { transition: none; }

@media (max-height: 720px) {
  .memory-hero { flex-basis: 168px; padding-top: 14px; }
  .hero-copy { margin-top: 16px; }
  .memory-tabs button { min-height: 38px; }
  .memory-card { padding: 12px; }
}
</style>
