<script setup lang="ts">
import type { AnimalId, CatalogResponse, Companion } from '../../../../shared/types/pretrip'
import type { ParkChatMessage, ParkChatResponse } from '../../../../shared/types/park'
import { zoneExperienceConfigs } from '#shared/data/zoneExperience'
import { shuffleTaskChoices } from '../../../utils/parkTask'
import ZoneChatComposer from './ZoneChatComposer.vue'
import ZoneGuideRail from './ZoneGuideRail.vue'
import ZoneKnowledgeDeck from './ZoneKnowledgeDeck.vue'
import ZoneMediaCapture from './ZoneMediaCapture.vue'

const props = defineProps<{ zoneId: string }>()
const route = useRoute()
const { data: catalog, status, error } = await useFetch<CatalogResponse>('/api/catalog', { key: 'zone-experience-catalog-v1' })
const park = useParkJourney()
const pretrip = usePretripJourney()
const journeys = useJourneyRecords()
const navigation = useParkNavigation()
const zone = computed(() => zoneExperienceConfigs[props.zoneId as AnimalId] ?? null)
const tripState = computed(() => park.state.value)
const currentJourney = journeys.activeRecord
const unlockVisible = shallowRef(route.query.new === '1')
const taskFeedback = shallowRef('')
const chatMessages = ref<ParkChatMessage[]>([])
const chatLoading = shallowRef(false)
const chatError = shallowRef('')
const routeConfirmVisible = shallowRef(false)
const sessionId = useState('park-chat-session-v1', () => `park-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`)
const taskChoiceSeed = useState<number>('park-task-choice-seed-v1', () => Date.now())

const primaryCompanion = computed<Companion | null>(() => {
  const id = tripState.value.starterCompanionId ?? pretrip.state.value.companionId
  return catalog.value?.companions.find(item => item.id === id) ?? null
})
const zoneCompanion = computed<Companion | null>(() => catalog.value?.companions.find(item => item.id === zone.value?.companionId) ?? null)
const zoneAnimal = computed(() => catalog.value?.animals.find(item => item.id === zone.value?.id) ?? null)
const taskCompleted = computed(() => zone.value ? tripState.value.completedTaskIds.includes(zone.value.task.id) : false)
const taskChoices = computed(() => zone.value ? shuffleTaskChoices(zone.value.task, taskChoiceSeed.value) : [])
const photoCount = computed(() => currentJourney.value?.media.filter(item => item.kind === 'photo').length ?? 0)
const pageStyle = computed(() => zone.value ? {
  '--zone-accent': zone.value.theme.accent,
  '--zone-soft': zone.value.theme.accentSoft,
  '--zone-ink': zone.value.theme.ink,
} : {})

function syncJourneyRecord() {
  const companionId = tripState.value.starterCompanionId ?? pretrip.state.value.companionId ?? 'panda'
  journeys.reconcileParkState(tripState.value, {
    companionId,
    plan: pretrip.state.value.plan,
    visitorProfile: pretrip.state.value.profile,
  })
}

onMounted(() => {
  if (!tripState.value.started) navigateTo('/inpark')
  else syncJourneyRecord()
})

watch(() => park.state.value, syncJourneyRecord, { deep: true })

watch(
  () => Boolean(navigation.route.value),
  (ready) => {
    if (ready) routeConfirmVisible.value = true
  },
  { immediate: true },
)

function confirmRouteJump() {
  routeConfirmVisible.value = false
  navigateTo('/inpark')
}

function dismissRouteJump() {
  routeConfirmVisible.value = false
}

function answerTask(choice: string) {
  const current = zone.value
  if (!current || taskCompleted.value) return
  if (choice !== current.task.correctChoice) {
    taskFeedback.value = '再观察一下现场线索，换一个答案试试。'
    return
  }
  park.completeTask(current.id, current.task.id)
  journeys.completeTask(current.id, current.task.id, current.badgeName)
  taskFeedback.value = current.task.successMessage
}

async function sendChat(question: string) {
  const current = zone.value
  const companion = zoneCompanion.value
  if (!current || !companion || chatLoading.value) return
  chatLoading.value = true
  chatError.value = ''
  chatMessages.value.push({ id: `${Date.now()}-u`, role: 'user', text: question })
  try {
    const response = await $fetch<ParkChatResponse>('/api/inpark/chat', {
      method: 'POST',
      body: {
        sessionId: sessionId.value,
        companionId: companion.id,
        currentZoneId: current.id,
        currentPosition: tripState.value.currentPosition,
        routeZoneIds: [...tripState.value.routeZoneIds],
        completedZoneIds: [...tripState.value.routeCompletedIds],
        question,
      },
    })
    chatMessages.value.push({ id: `${Date.now()}-a`, role: 'assistant', text: response.reply, mode: response.mode })
    journeys.recordConversation(question, response.reply, current.id)
    const before = [...tripState.value.routeZoneIds]
    park.applyAdjustment(response.action)
    if (response.action !== 'none') journeys.recordRouteChange(question, before, [...park.state.value.routeZoneIds])
    if (response.navigationTarget) navigation.start(response.navigationTarget, tripState.value.currentPosition, pretrip.state.value.profile.pace ?? 'balanced')
  }
  catch (cause) {
    chatError.value = cause instanceof Error ? cause.message : '伙伴暂时没有听清，请稍后再试。'
  }
  finally {
    chatLoading.value = false
  }
}
</script>

<template>
  <main class="zone-page" :class="zone?.theme.pattern" :style="pageStyle">
    <div v-if="status === 'pending'" class="zone-state">正在打开园区档案…</div>
    <div v-else-if="error || !catalog || !zone || !primaryCompanion || !zoneCompanion" class="zone-state error"><strong>这个园区暂时没有打开</strong><NuxtLink to="/inpark">返回实时地图</NuxtLink></div>
    <template v-else>
      <header class="zone-nav">
        <button type="button" aria-label="返回实时地图" @click="navigateTo('/inpark')">←</button>
        <div><span>ZONE {{ String(catalog.animals.findIndex(item => item.id === zone.id) + 1).padStart(2,'0') }}</span><strong>{{ zoneAnimal?.name }}</strong></div>
        <small>{{ tripState.visitedZoneIds.length }}/6</small>
      </header>

      <section class="zone-hero">
        <div class="hero-copy"><span>{{ zone.kicker }}</span><h1>{{ zoneAnimal?.name }}<br><em>现场奇遇站</em></h1><p>{{ zone.welcome }}</p></div>
        <img :src="zoneCompanion.chatCharacterImage" :alt="`${zoneCompanion.name}在${zoneAnimal?.name}担任向导`">
        <i class="orbit one" /><i class="orbit two" />
      </section>

      <div class="zone-content">
        <ZoneGuideRail :primary="primaryCompanion" :zone-guide="zoneCompanion" />

        <section class="fact-strip"><span>现场小知识</span><p>{{ zone.fact }}</p></section>

        <ZoneKnowledgeDeck :zone="zone" />

        <section class="task-card" :class="{ completed: taskCompleted }">
          <header><span>{{ taskCompleted ? 'BADGE COLLECTED' : 'OBSERVATION TASK' }}</span><strong>{{ taskCompleted ? zone.badgeName : zone.task.title }}</strong></header>
          <p>{{ taskCompleted ? zone.task.successMessage : zone.task.prompt }}</p>
          <div v-if="!taskCompleted"><button v-for="choice in taskChoices" :key="choice" type="button" @click="answerTask(choice)">{{ choice }}</button></div>
          <small v-if="taskFeedback" aria-live="polite">{{ taskFeedback }}</small>
        </section>

        <ZoneMediaCapture
          :journey-id="currentJourney?.id ?? null"
          :zone-id="zone.id"
          :photo-count="photoCount"
          @saved="journeys.addMedia"
        />

        <ZoneChatComposer
          :companion="zoneCompanion"
          :messages="chatMessages"
          :quick-questions="zone.quickQuestions"
          :loading="chatLoading"
          :error="chatError"
          @send="sendChat"
        />
      </div>

      <Transition name="route-confirm">
        <div v-if="routeConfirmVisible && navigation.route.value" class="route-confirm-overlay" @click.self="dismissRouteJump">
          <section class="route-confirm-card" role="dialog" aria-modal="true" aria-labelledby="route-confirm-title">
            <span>路线已标好</span>
            <h2 id="route-confirm-title">要回到地图跟着红线走吗？</h2>
            <p>伙伴已经为你规划好下一段路线。回到地图后可以直接按红线前进；如果你还想继续看当前园区，也可以先留下。</p>
            <div>
              <button class="ghost" type="button" @click="dismissRouteJump">先留在这里</button>
              <button type="button" @click="confirmRouteJump">回到地图</button>
            </div>
          </section>
        </div>
      </Transition>

      <Transition name="unlock" appear>
        <div v-if="unlockVisible" class="unlock-overlay" @click.self="unlockVisible = false">
          <section>
            <span>NEW COMPANION · 新相遇</span>
            <img :src="zoneCompanion.chatCharacterImage" :alt="zoneCompanion.name">
            <h2>{{ primaryCompanion.id === zoneCompanion.id ? `${zoneCompanion.name}在这里等你` : `${zoneCompanion.name}加入奇遇` }}</h2>
            <p>{{ primaryCompanion.id === zoneCompanion.id ? '同一位伙伴继续陪你探索，不会重复出现。' : `你的全程伙伴${primaryCompanion.name}和区域向导${zoneCompanion.name}会一起陪你。` }}</p>
            <strong>{{ zone.stampText }}</strong>
            <button type="button" @click="unlockVisible = false">开始这一站</button>
          </section>
        </div>
      </Transition>
    </template>
  </main>
</template>

<style scoped>
.zone-page { position: relative; width: min(100%,480px); min-height: 100dvh; margin: 0 auto; overflow: hidden; background: radial-gradient(circle at 86% 12%,color-mix(in srgb,var(--zone-accent) 20%,transparent),transparent 24%),#f4f0e6; color: var(--zone-ink); }
.zone-page::before { position: absolute; inset: 0; pointer-events: none; background: repeating-linear-gradient(90deg,rgba(28,53,42,.025) 0 1px,transparent 1px 18px); content: ''; }
.zone-state { display: grid; min-height: 100dvh; place-content: center; gap: 12px; text-align: center; }
.zone-state a { color: var(--forest); }
.zone-nav { position: relative; z-index: 5; display: grid; grid-template-columns: 42px 1fr 42px; align-items: center; padding: max(12px,env(safe-area-inset-top)) 16px 11px; gap: 9px; border-bottom: 1px solid color-mix(in srgb,var(--zone-accent) 17%,transparent); background: rgba(248,245,237,.82); backdrop-filter: blur(18px); }
.zone-nav button { width: 40px; height: 40px; border: 1px solid color-mix(in srgb,var(--zone-accent) 24%,transparent); border-radius: 14px 5px 14px 5px; background: #fff; color: var(--zone-ink); font-size: 17px; }
.zone-nav div { display: grid; gap: 1px; }
.zone-nav span { color: var(--zone-accent); font-size: 8px; font-weight: 900; letter-spacing: .1em; }
.zone-nav strong { font-family: var(--font-display); font-size: 14px; }
.zone-nav small { color: var(--zone-accent); font: 900 10px ui-monospace,monospace; text-align: right; }
.zone-hero { position: relative; min-height: 318px; padding: 46px 18px 20px; overflow: hidden; background: linear-gradient(154deg,var(--zone-ink),color-mix(in srgb,var(--zone-ink) 74%,var(--zone-accent))); color: #fff; }
.hero-copy { position: relative; z-index: 2; width: 62%; }
.hero-copy > span { color: color-mix(in srgb,var(--zone-accent) 62%,#fff); font-size: 9px; font-weight: 900; letter-spacing: .12em; }
.hero-copy h1 { margin: 10px 0 12px; font-family: var(--font-display); font-size: 35px; line-height: 1.13; letter-spacing: -.04em; }
.hero-copy em { color: color-mix(in srgb,var(--zone-accent) 72%,#fff); font-size: .72em; font-style: normal; }
.hero-copy p { margin: 0; color: rgba(255,255,255,.68); font-size: 10px; line-height: 1.7; }
.zone-hero > img { position: absolute; z-index: 1; right: -50px; bottom: -18px; width: 270px; height: 285px; object-fit: contain; object-position: bottom; filter: drop-shadow(0 18px 18px rgba(0,0,0,.25)); }
.orbit { position: absolute; border: 1px solid rgba(255,255,255,.14); border-radius: 50%; }
.orbit.one { right: -70px; bottom: -80px; width: 290px; height: 290px; }.orbit.two { right: -18px; bottom: -26px; width: 180px; height: 180px; }
.zone-content { position: relative; z-index: 3; display: grid; margin-top: -20px; padding: 0 16px calc(188px + env(safe-area-inset-bottom)); gap: 18px; }
.fact-strip { display: grid; grid-template-columns: 76px 1fr; padding: 13px 14px; gap: 10px; border-left: 4px solid var(--zone-accent); background: var(--zone-ink); color: #fff; }
.fact-strip span { color: color-mix(in srgb,var(--zone-accent) 68%,#fff); font-size: 9px; font-weight: 900; }
.fact-strip p { margin: 0; color: rgba(255,255,255,.74); font-size: 10px; line-height: 1.55; }
.task-card { padding: 18px; border-radius: 22px 8px 22px 8px; background: var(--zone-ink); color: #fff; box-shadow: 0 18px 34px color-mix(in srgb,var(--zone-ink) 18%,transparent); }
.task-card header { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
.task-card header span { color: color-mix(in srgb,var(--zone-accent) 65%,#fff); font-size: 8px; font-weight: 900; letter-spacing: .1em; }
.task-card header strong { font-family: var(--font-display); font-size: 17px; }
.task-card p { margin: 17px 0; color: rgba(255,255,255,.76); font-size: 11px; line-height: 1.6; }
.task-card div { display: grid; grid-template-columns: repeat(3,1fr); gap: 6px; }
.task-card button { min-height: 38px; border: 1px solid rgba(255,255,255,.18); border-radius: 11px 4px 11px 4px; background: rgba(255,255,255,.08); color: #fff; font-size: 9px; }
.task-card button:active { background: var(--zone-accent); transform: scale(.97); }
.task-card small { display: block; color: color-mix(in srgb,var(--zone-accent) 70%,#fff); font-size: 9px; }
.task-card.completed { background: var(--zone-accent); }
.route-confirm-overlay { position: fixed; z-index: 82; inset: 0; display: grid; padding: 24px; place-items: center; background: rgba(8,22,18,.38); backdrop-filter: blur(8px); }
.route-confirm-card { display: grid; width: min(100%,360px); padding: 22px 18px 18px; gap: 10px; border: 1px solid color-mix(in srgb,var(--zone-accent) 28%,rgba(255,255,255,.6)); border-radius: 24px 7px 24px 7px; background: #fffaf0; box-shadow: 0 24px 70px rgba(19,39,31,.26); }
.route-confirm-card span { color: #e34b36; font-size: 9px; font-weight: 900; letter-spacing: .12em; }
.route-confirm-card h2 { margin: 0; color: var(--zone-ink); font-family: var(--font-display); font-size: 25px; line-height: 1.12; }
.route-confirm-card p { margin: 0; color: #66756d; font-size: 10px; line-height: 1.7; }
.route-confirm-card div { display: grid; grid-template-columns: 1fr 1fr; margin-top: 6px; gap: 8px; }
.route-confirm-card button { min-height: 43px; border: 0; border-radius: 13px 5px 13px 5px; background: var(--zone-ink); color: #fff; font-size: 10px; font-weight: 900; }
.route-confirm-card button.ghost { border: 1px solid color-mix(in srgb,var(--zone-accent) 22%,#ddd0bd); background: #fff; color: var(--zone-ink); }
.route-confirm-enter-active,.route-confirm-leave-active { transition: opacity .22s ease; }
.route-confirm-enter-active .route-confirm-card,.route-confirm-leave-active .route-confirm-card { transition: transform .28s var(--ease-out), opacity .22s ease; }
.route-confirm-enter-from,.route-confirm-leave-to { opacity: 0; }
.route-confirm-enter-from .route-confirm-card,.route-confirm-leave-to .route-confirm-card { opacity: 0; transform: translateY(18px) scale(.96); }
.unlock-overlay { position: fixed; z-index: 90; inset: 0; display: grid; padding: 18px; place-items: center; background: rgba(9,23,18,.72); backdrop-filter: blur(12px); }
.unlock-overlay section { display: grid; width: min(100%,380px); padding: 24px 20px 20px; place-items: center; overflow: hidden; border: 1px solid rgba(255,255,255,.18); border-radius: 32px 9px 32px 9px; background: radial-gradient(circle at 50% 28%,var(--zone-soft),transparent 38%),#fffaf0; box-shadow: 0 30px 70px rgba(0,0,0,.3); text-align: center; }
.unlock-overlay span { color: var(--zone-accent); font-size: 9px; font-weight: 900; letter-spacing: .12em; }
.unlock-overlay img { width: 210px; height: 220px; margin: 4px 0 -5px; object-fit: contain; }
.unlock-overlay h2 { margin: 0; font-family: var(--font-display); font-size: 26px; }
.unlock-overlay p { max-width: 260px; margin: 8px 0; color: #65746e; font-size: 10px; line-height: 1.6; }
.unlock-overlay strong { color: var(--zone-accent); font-size: 9px; }
.unlock-overlay button { width: 100%; min-height: 48px; margin-top: 17px; border: 0; border-radius: 14px 5px 14px 5px; background: var(--zone-ink); color: #fff; font-size: 11px; font-weight: 900; }
.unlock-enter-active,.unlock-leave-active { transition: opacity .32s var(--ease-out); }.unlock-enter-active section,.unlock-leave-active section { transition: transform .42s var(--ease-out),opacity .28s ease; }.unlock-enter-from,.unlock-leave-to { opacity: 0; }.unlock-enter-from section,.unlock-leave-to section { opacity: 0; transform: translateY(24px) scale(.94); }
@media (max-width:360px) { .zone-hero > img { right: -80px; }.hero-copy { width: 68%; }.guide-rail { grid-template-columns: 1fr; } }
</style>
