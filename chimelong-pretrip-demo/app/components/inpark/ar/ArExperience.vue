<script setup lang="ts">
import type { CatalogResponse } from '../../../../shared/types/pretrip'
import type { ParkChatMessage, ParkChatResponse } from '../../../../shared/types/park'
import { arCompanionScripts } from '../../../data/arCompanions'
import ZoneChatComposer from '../zone/ZoneChatComposer.vue'
import ArCameraStage from './ArCameraStage.vue'

const { data: catalog } = await useFetch<CatalogResponse>('/api/catalog', { key: 'ar-catalog-v2' })
const park = useParkJourney()
const journeys = useJourneyRecords()
const stage = useTemplateRef<InstanceType<typeof ArCameraStage>>('stage')
const detected = shallowRef(false)
const scanning = shallowRef(false)
const storyOpen = shallowRef(false)
const chatOpen = shallowRef(false)
const toast = shallowRef('')
const chatMessages = ref<ParkChatMessage[]>([])
const chatLoading = shallowRef(false)
const chatError = shallowRef('')
const sessionId = useState('park-chat-session-v1', () => `park-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`)
let scanTimer: ReturnType<typeof setTimeout> | undefined
let toastTimer: ReturnType<typeof setTimeout> | undefined

const activeCompanion = computed(() => {
  const id = park.state.value.activeCompanionId ?? park.state.value.starterCompanionId ?? 'panda'
  return catalog.value?.companions.find(item => item.id === id) ?? catalog.value?.companions[0] ?? null
})
const animal = computed(() => catalog.value?.animals.find(item => item.id === activeCompanion.value?.id) ?? catalog.value?.animals[0] ?? null)
const script = computed(() => arCompanionScripts[activeCompanion.value?.id ?? 'panda'])
const cameraVideo = computed(() => stage.value?.video ?? null)
const modelAction = computed<'idle' | 'wave' | 'talk'>(() => chatLoading.value ? 'talk' : detected.value ? 'wave' : 'idle')
const camera = useArCamera(cameraVideo)

function showToast(message: string) {
  toast.value = message
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.value = '' }, 2400)
}

function scan() {
  if (scanning.value) return
  detected.value = false
  storyOpen.value = false
  scanning.value = true
  if (scanTimer) clearTimeout(scanTimer)
  scanTimer = setTimeout(() => {
    scanning.value = false
    detected.value = true
    storyOpen.value = true
    if (!chatMessages.value.length) {
      chatMessages.value.push({ id: `${Date.now()}-ar-greeting`, role: 'assistant', text: script.value.greeting, mode: 'template' })
    }
  }, 1700)
}

function openChat() {
  storyOpen.value = false
  chatOpen.value = true
}

async function sendChat(question: string) {
  const companion = activeCompanion.value
  if (!companion || chatLoading.value) return
  chatLoading.value = true
  chatError.value = ''
  chatMessages.value.push({ id: `${Date.now()}-u`, role: 'user', text: question })
  try {
    const response = await $fetch<ParkChatResponse>('/api/inpark/chat', {
      method: 'POST',
      body: {
        sessionId: sessionId.value,
        companionId: companion.id,
        currentZoneId: park.state.value.currentZoneId,
        currentPosition: park.state.value.currentPosition,
        routeZoneIds: [...park.state.value.routeZoneIds],
        completedZoneIds: [...park.state.value.routeCompletedIds],
        question,
      },
    })
    chatMessages.value.push({ id: `${Date.now()}-a`, role: 'assistant', text: response.reply, mode: response.mode })
    journeys.recordConversation(question, response.reply, park.state.value.currentZoneId ?? undefined)
    park.applyAdjustment(response.action)
  }
  catch {
    const fallback = script.value.idleLines[chatMessages.value.length % script.value.idleLines.length] ?? script.value.safety
    chatMessages.value.push({ id: `${Date.now()}-fallback`, role: 'assistant', text: fallback, mode: 'template' })
    chatError.value = '网络有点拥挤，伙伴先用现场知识回答你。'
  }
  finally {
    chatLoading.value = false
  }
}

function capture() {
  showToast(detected.value ? `已记录与${animal.value?.name ?? '动物'}的 AR 奇遇` : '请先完成一次动物识别')
}

onMounted(() => camera.start())
onBeforeUnmount(() => {
  if (scanTimer) clearTimeout(scanTimer)
  if (toastTimer) clearTimeout(toastTimer)
})
</script>

<template>
  <main class="ar-experience" :style="{ '--ar-accent': activeCompanion?.accent ?? '#d4a341' }">
    <ArCameraStage
      ref="stage"
      :status="camera.status.value"
      :scanning="scanning"
      :detected="detected"
      :animal-name="animal?.name ?? '动物伙伴'"
      :accent="activeCompanion?.accent ?? '#d4a341'"
      :companion-id="activeCompanion?.id ?? 'panda'"
      :model-action="modelAction"
      @request-camera="camera.start"
      @flip-camera="camera.flip"
      @scan="scan"
      @capture="capture"
    />

    <Transition name="story">
      <section v-if="storyOpen && activeCompanion && animal" class="discovery-card" aria-live="polite">
        <button class="card-close" type="button" aria-label="收起识别卡" @click="storyOpen = false">×</button>
        <div class="companion-portrait"><img :src="activeCompanion.chatCharacterImage" :alt="activeCompanion.name"></div>
        <div class="discovery-copy">
          <span>{{ activeCompanion.name }} · AI 现场讲解</span>
          <h1>你发现了<br>{{ animal.name }}</h1>
          <p>{{ script.discovery }}</p>
          <div class="fact-row"><i>✦</i><small>文明观察提示</small><strong>{{ script.safety }}</strong></div>
          <div class="card-actions">
            <button type="button" @click="showToast(`${activeCompanion.name}正在讲解`)" ><i>♪</i><span>听现场讲解</span></button>
            <button type="button" @click="openChat"><i>···</i><span>和{{ activeCompanion.name }}聊聊</span></button>
          </div>
        </div>
      </section>
    </Transition>

    <Transition name="chat-sheet">
      <div v-if="chatOpen && activeCompanion" class="chat-layer">
        <button class="close-chat" type="button" aria-label="关闭伙伴对话" @click="chatOpen = false">回到 AR 视野 ×</button>
        <ZoneChatComposer
          :companion="activeCompanion"
          :messages="chatMessages"
          :quick-questions="script.quickQuestions"
          :loading="chatLoading"
          :error="chatError"
          @send="sendChat"
        />
      </div>
    </Transition>

    <Transition name="toast"><p v-if="toast" class="ar-toast" role="status">{{ toast }}</p></Transition>
    <p v-if="camera.error.value" class="camera-error">{{ camera.error.value }}</p>
  </main>
</template>

<style scoped>
.ar-experience{position:relative;width:min(100%,480px);height:100dvh;min-height:100dvh;margin:0 auto;overflow:hidden;background:#13231c}.discovery-card{position:absolute;z-index:20;right:12px;bottom:calc(116px + env(safe-area-inset-bottom));left:12px;display:grid;grid-template-columns:88px 1fr;padding:14px;gap:12px;border:1px solid rgba(255,255,255,.2);border-radius:26px 8px 26px 8px;background:rgba(248,245,235,.94);color:#173027;box-shadow:0 28px 80px rgba(0,0,0,.35);backdrop-filter:blur(22px)}.card-close{position:absolute;top:8px;right:8px;display:grid;width:28px;height:28px;place-items:center;border:0;border-radius:50%;background:rgba(16,45,35,.08);color:#173027;font-size:18px}.companion-portrait{align-self:start;height:112px;overflow:hidden;border-radius:19px 6px 19px 6px;background:color-mix(in srgb,var(--ar-accent) 18%,#e8eadf)}.companion-portrait img{width:100%;height:100%;object-fit:contain;object-position:bottom}.discovery-copy{display:grid;padding-right:8px;gap:5px}.discovery-copy>span{color:color-mix(in srgb,var(--ar-accent) 75%,#815d25);font-size:7px;font-weight:900;letter-spacing:.08em}.discovery-copy h1{margin:0;font-family:var(--font-display);font-size:23px;line-height:1.02;letter-spacing:-.03em}.discovery-copy>p{margin:2px 0 4px;color:#65736d;font-size:8px;line-height:1.55}.fact-row{display:grid;grid-template-columns:24px 1fr;padding:8px;gap:0 7px;border-left:2px solid var(--ar-accent);background:rgba(18,49,38,.06)}.fact-row i{grid-row:1/span 2;display:grid;place-items:center;color:var(--ar-accent);font-style:normal}.fact-row small{color:#849089;font-size:7px}.fact-row strong{font-size:8px}.card-actions{display:grid;grid-template-columns:1fr 1fr;margin-top:5px;gap:6px}.card-actions button{display:flex;min-height:37px;align-items:center;justify-content:center;padding:6px;gap:5px;border:0;border-radius:11px 4px 11px 4px;background:#12362b;color:#fff;font-size:8px;font-weight:900}.card-actions button:last-child{background:var(--ar-accent);color:#13251e}.card-actions i{font-size:12px;font-style:normal}.chat-layer{position:absolute;z-index:32;inset:0;background:linear-gradient(180deg,transparent 22%,rgba(5,23,17,.38) 48%,rgba(5,23,17,.72));backdrop-filter:blur(3px)}.close-chat{position:absolute;z-index:50;right:14px;bottom:calc(176px + env(safe-area-inset-bottom));padding:7px 10px;border:1px solid rgba(255,255,255,.2);border-radius:999px;background:rgba(5,28,20,.72);color:#fff;font-size:8px}.camera-error{position:absolute;z-index:18;top:calc(106px + env(safe-area-inset-top));right:18px;left:18px;margin:0;padding:8px 10px;border:1px solid rgba(255,255,255,.16);border-radius:10px;background:rgba(48,28,16,.55);color:rgba(255,255,255,.82);font-size:8px;text-align:center;backdrop-filter:blur(12px)}.ar-toast{position:absolute;z-index:50;top:16%;left:50%;margin:0;padding:10px 15px;border-radius:999px;background:rgba(6,27,20,.82);color:#fff;font-size:9px;transform:translateX(-50%);backdrop-filter:blur(12px);white-space:nowrap}.story-enter-active,.story-leave-active,.chat-sheet-enter-active,.chat-sheet-leave-active{transition:opacity .25s ease,transform .36s var(--ease-out)}.story-enter-from,.story-leave-to{opacity:0;transform:translateY(24px)}.chat-sheet-enter-from,.chat-sheet-leave-to{opacity:0;transform:translateY(18px)}.toast-enter-active,.toast-leave-active{transition:opacity .2s ease,transform .25s ease}.toast-enter-from,.toast-leave-to{opacity:0;transform:translate(-50%,-8px)}@media(max-width:360px){.discovery-card{grid-template-columns:72px 1fr}.companion-portrait{height:96px}.discovery-copy h1{font-size:20px}}
</style>
