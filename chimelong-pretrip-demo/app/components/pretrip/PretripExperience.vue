<script setup lang="ts">
import type { CatalogResponse, Companion, ScenarioId, VisitorProfile } from '../../../shared/types/pretrip'
import AgentChat from './AgentChat.vue'
import AgentSelection from './AgentSelection.vue'
import PlanOverview from './PlanOverview.vue'

const emit = defineEmits<{
  ready: []
}>()

interface AIStatus {
  configured: boolean
  provider: string
  model: string
  baseUrl: string
}

const [{ data: catalog, status, error }, { data: aiStatus }] = await Promise.all([
  useFetch<CatalogResponse>('/api/catalog', { key: 'pretrip-catalog-v2' }),
  useFetch<AIStatus>('/api/ai/status', { key: 'pretrip-ai-status' }),
])

const journey = usePretripJourney()
const park = useParkJourney()
const journeyRecords = useJourneyRecords()
useAppViewportHeight()
const state = journey.state
const selectedCompanion = computed(() => catalog.value?.companions.find(item => item.id === state.value.companionId) ?? null)
const presence = useParkPresence()
const route = useRoute()
const mapOnly = computed(() => route.query.tab === 'map' && state.value.view === 'select-agent')
const displayedCompanion = computed(() => selectedCompanion.value ?? catalog.value?.companions[0] ?? null)

function selectCompanion(companion: Companion) {
  journey.chooseCompanion(companion)
}

function answer(profile: VisitorProfile, summary: string) {
  void journey.answerCurrent(profile, summary)
}

function regenerate(scenarioId: ScenarioId) {
  void journey.regenerate(scenarioId)
}

function enterPark() {
  if (!state.value.plan || !state.value.companionId) return
  journey.markInPark()
  if (!park.state.value.started) {
    park.begin(state.value.companionId, 'follow', state.value.plan.actualAnimalOrder)
    journeyRecords.start({ companionId: state.value.companionId, plan: state.value.plan, visitorProfile: state.value.profile })
  }
}

onMounted(() => presence.start(() => enterPark()))

async function clearCache() {
  if (!window.confirm('确定清除全部缓存并重新开始吗？游前计划、园中进度、回忆星册和票根都会被删除。')) return
  journey.reset()
  park.reset()
  journeyRecords.clear()
  await nextTick()
  await clearExperienceStorage()
  window.location.replace('/')
}
</script>

<template>
  <main class="app-frame">
    <div v-if="status === 'pending'" class="state-screen">
      <span class="loading-mark">AI</span>
      <strong>正在载入园区知识库</strong>
    </div>

    <div v-else-if="error || !catalog" class="state-screen error">
      <strong>园区数据暂时无法载入</strong>
      <p>请确认 Nuxt 服务端已经正常启动。</p>
    </div>

    <template v-else>
      <AgentSelection
        v-if="state.view === 'select-agent' && !mapOnly"
        :companions="catalog.companions"
        :ai-configured="Boolean(aiStatus?.configured)"
        :ai-model="aiStatus?.model ?? 'deepseek-v4-flash'"
        @select="selectCompanion"
      />

      <AgentChat
        v-else-if="(state.view === 'chat' || state.view === 'generating' || mapOnly) && displayedCompanion"
        :companion="displayedCompanion"
        :companions="catalog.companions"
        :step="journey.currentChatStep.value"
        :step-index="state.chatStepIndex"
        :profile="state.profile"
        :messages="state.messages"
        :pace-options="catalog.paceOptions"
        :animals="catalog.animals"
        :restaurants="catalog.restaurants"
        :recommended-restaurant-id="state.recommendedRestaurantId"
        :is-replying="journey.isReplying.value"
        :error-message="journey.errorMessage.value"
        :plan="state.plan"
        @answer="answer"
        @back="journey.previousStep"
        @reset="journey.reset"
        @generate="journey.generatePlan()"
        @arrive="enterPark"
      />

    </template>
  </main>
</template>

<style scoped>
.app-frame {
  width: min(100%, 480px);
  min-height: var(--app-viewport-height, 100dvh);
  margin: 0 auto;
  overflow: hidden;
  background: var(--paper);
  box-shadow: none;
}

.state-screen {
  display: grid;
  min-height: var(--app-viewport-height, 100dvh);
  padding: 34px;
  place-content: center;
  place-items: center;
  gap: 8px;
  color: var(--ink);
  text-align: center;
}

.state-screen p {
  margin: 0;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.6;
}

.loading-mark {
  display: grid;
  width: 78px;
  height: 78px;
  margin-bottom: 12px;
  place-items: center;
  border-radius: 26px;
  background: var(--forest);
  box-shadow: 0 17px 35px rgba(22, 55, 45, 0.18);
  color: #f1c77d;
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 900;
}

</style>
