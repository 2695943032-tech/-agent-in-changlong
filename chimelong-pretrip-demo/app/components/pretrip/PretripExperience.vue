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
const state = journey.state
const selectedCompanion = computed(() => catalog.value?.companions.find(item => item.id === state.value.companionId) ?? null)
const presence = useParkPresence()

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
        v-if="state.view === 'select-agent'"
        :companions="catalog.companions"
        :ai-configured="Boolean(aiStatus?.configured)"
        :ai-model="aiStatus?.model ?? 'deepseek-v4-flash'"
        @select="selectCompanion"
      />

      <AgentChat
        v-else-if="state.view === 'chat' && selectedCompanion"
        :companion="selectedCompanion"
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

      <section v-else-if="state.view === 'generating' && selectedCompanion" class="generating-screen">
        <div class="generation-mark" :style="{ '--agent-accent': selectedCompanion.accent }">
          {{ selectedCompanion.name }}
        </div>
        <span>地图距离知识库正在计算</span>
        <h2>把优先级变成真正可走的路线</h2>
        <p>计算点位取舍、最短步行组合、全时段用餐安排与模拟排队时间…</p>
        <div class="generation-steps">
          <i class="done" />
          <i class="active" />
          <i />
        </div>
      </section>

    </template>
  </main>
</template>

<style scoped>
.app-frame {
  width: min(100%, 480px);
  min-height: 100dvh;
  margin: 0 auto;
  overflow: hidden;
  background: var(--paper);
  box-shadow: none;
}

.state-screen,
.generating-screen {
  display: grid;
  min-height: 100dvh;
  padding: 34px;
  place-content: center;
  place-items: center;
  gap: 8px;
  color: var(--ink);
  text-align: center;
}

.state-screen p,
.generating-screen p {
  margin: 0;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.6;
}

.loading-mark,
.generation-mark {
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
  animation: breathe 1.4s ease-in-out infinite;
}

.generation-mark {
  background: color-mix(in srgb, var(--agent-accent) 28%, var(--forest));
  color: #fff;
}

.generating-screen > span {
  color: var(--accent-dark);
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.12em;
}

.generating-screen h2 {
  margin: 2px 0;
  font-family: var(--font-display);
  font-size: 23px;
}

.generation-steps {
  display: flex;
  margin-top: 16px;
  gap: 7px;
}

.generation-steps i {
  width: 27px;
  height: 4px;
  border-radius: 999px;
  background: rgba(18, 60, 50, 0.13);
}

.generation-steps i.done { background: #6d9b7c; }
.generation-steps i.active { background: var(--accent); animation: pulse 700ms ease-in-out infinite; }

@keyframes breathe { 50% { transform: translateY(-4px); } }
@keyframes pulse { 50% { opacity: 0.4; } }

</style>
