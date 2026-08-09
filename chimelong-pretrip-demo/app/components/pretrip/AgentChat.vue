<script setup lang="ts">
import type {
  AnimalPoi,
  ChatStep,
  Companion,
  PaceOption,
  Restaurant,
  RestaurantId,
  PlanResponse,
  VisitorProfile,
} from '../../../shared/types/pretrip'
import type { JourneyMessage } from '../../composables/usePretripJourney'
import type { ParkNavigationRoute, ParkNavigationTarget, ParkService } from '../../../shared/types/park'
import { parkServices } from '#shared/data/parkServices'
import { parkLiveLandmarks } from '#shared/data/parkLiveData.generated'
import { parkMapPoints } from '#shared/data/parkGeometry.generated'
import { zoneExperienceConfigs } from '#shared/data/zoneExperience'
import { navigationRouteFromPosition } from '#shared/utils/parkGeo'
import ChatAnswerPanel from './ChatAnswerPanel.vue'
import DraggableCompanion from './DraggableCompanion.vue'
import ParkRasterMap from '../map/ParkRasterMap.vue'

const props = defineProps<{
  companion: Companion
  companions: Companion[]
  step: ChatStep
  stepIndex: number
  profile: VisitorProfile
  messages: JourneyMessage[]
  paceOptions: PaceOption[]
  animals: AnimalPoi[]
  restaurants: Restaurant[]
  recommendedRestaurantId: RestaurantId | null
  isReplying: boolean
  errorMessage: string | null
  plan: PlanResponse | null
}>()

const emit = defineEmits<{
  answer: [profile: VisitorProfile, summary: string]
  back: []
  reset: []
  generate: []
  arrive: []
}>()

const messageList = useTemplateRef<HTMLElement>('messageList')
const activeCompanion = shallowRef<Companion | null>(null)
const currentCompanion = computed(() => activeCompanion.value ?? props.companion)
const unlockOffer = shallowRef<{ zone: AnimalPoi, companion: Companion } | null>(null)
const learningZoneId = shallowRef<AnimalPoi['id'] | null>(null)
const scienceAnswer = shallowRef<string | null>(null)
const learningConfig = computed(() => learningZoneId.value ? zoneExperienceConfigs[learningZoneId.value] : null)
const progress = computed(() => Math.round(((props.stepIndex + 1) / 7) * 100))
const reactionKey = shallowRef(0)
const mapOpen = shallowRef(false)
const mapSearch = shallowRef('')
const presence = useParkPresence()
const selectedZone = shallowRef<AnimalPoi | null>(null)
const heatTick = shallowRef(0)
let heatTimer: ReturnType<typeof setInterval> | undefined
const animalStates = ['营业中', '进食中', '睡觉中'] as const
const animalStateIndex = shallowRef(0)
const animalState = computed(() => animalStates[animalStateIndex.value]!)
let animalStateTimer: ReturnType<typeof setInterval> | undefined
onMounted(() => { animalStateTimer = setInterval(() => { animalStateIndex.value = (animalStateIndex.value + 1) % animalStates.length }, 8000) })
onMounted(() => { heatTimer = setInterval(() => { heatTick.value += 1 }, 6000) })
onMounted(() => presence.start())
onMounted(() => {
  checkShowReminders()
  showReminderTimer = setInterval(checkShowReminders, 30_000)
})
function handleComposerKeydown(event: KeyboardEvent) {
  if (event.key !== 'Enter' || document.activeElement?.tagName !== 'INPUT') return
  if (!composerText.value.trim()) return
  event.preventDefault()
  sendChat()
}
onMounted(() => window.addEventListener('keydown', handleComposerKeydown))
onBeforeUnmount(() => { if (animalStateTimer) clearInterval(animalStateTimer); if (heatTimer) clearInterval(heatTimer); if (showReminderTimer) clearInterval(showReminderTimer) })
onBeforeUnmount(() => window.removeEventListener('keydown', handleComposerKeydown))
const toolsOpen = shallowRef(false)
const voiceActive = shallowRef(false)
const composerText = shallowRef('')
type LocalTimelineItem =
  | { id: string, type: 'message', role: 'user' | 'assistant', text: string }
  | { id: string, type: 'map' }
  | { id: string, type: 'show-reminder', service: ParkService, route: ParkNavigationRoute, startLabel: string }

const localMessages = ref<LocalTimelineItem[]>([])
const journeyMessages = computed(() => props.messages.filter(message => message.id !== 'park-arrival'))
const arrivalMessage = computed(() => props.messages.find(message => message.id === 'park-arrival') ?? null)
const photoInput = useTemplateRef<HTMLInputElement>('photoInput')
const restroomRequest = shallowRef(false)
const destinationRequest = shallowRef<{ text: string, kind: 'restaurant' | 'animal' | 'train' } | null>(null)
const activeDestination = shallowRef<ParkNavigationTarget | null>(null)
const activeRestroom = shallowRef<ParkService | null>(null)
const activeNavigation = shallowRef<ParkNavigationRoute | null>(null)
const announcedShows = new Set<string>()
let showReminderTimer: ReturnType<typeof setInterval> | undefined
type ParkLandmark = (typeof parkLiveLandmarks)[number]
const selectedService = shallowRef<ParkService | null>(null)
const selectedLandmark = shallowRef<ParkLandmark | null>(null)
const demoPosition = parkMapPoints.panda
const showTimes = ['10:30', '13:00', '15:30']

function checkShowReminders() {
  const venue = parkServices.find(service => service.serviceKind === 'show')
  if (!venue) return
  const now = new Date()
  for (const startLabel of showTimes) {
    const [hours, minutes] = startLabel.split(':').map(Number)
    const start = new Date(now)
    start.setHours(hours!, minutes!, 0, 0)
    const minutesUntil = (start.getTime() - now.getTime()) / 60000
    const key = `${now.toDateString()}-${venue.id}-${startLabel}`
    if (minutesUntil > 30 || minutesUntil < 0 || announcedShows.has(key)) continue
    announcedShows.add(key)
    try {
      localMessages.value.push({ id: `show-${key}`, type: 'show-reminder', service: venue, route: navigationRouteFromPosition(demoPosition, venue), startLabel })
      void scrollToLatest()
    }
    catch { /* the message can safely wait for the next location update */ }
  }
}
const restroomLabels: Record<string, string> = {
  'service-restroom-panda': '熊猫区洗手间',
  'service-restroom-south': '南门洗手间',
  'service-restroom-north': '北区洗手间',
  'service-restroom-koala': '考拉园洗手间',
  'service-restroom-west': '西区洗手间',
}
const restroomChoices = computed(() => parkServices
  .filter(service => service.serviceKind === 'restroom')
  .flatMap((service, index) => {
    try {
      const route = navigationRouteFromPosition(demoPosition, service)
      return [{ service, route, queue: [18, 32, 46, 24, 39][index] ?? 30 }]
    }
    catch { return [] }
  })
  .sort((a, b) => a.route.distanceMeters - b.route.distanceMeters))
const diningLabels: Record<string, string> = {
  'service-dining-panda': '熊猫餐厅',
  'service-dining-koala': '考拉美食街',
  'service-dining-birds': '飞禽餐厅',
}
const trainStations: Array<{ target: ParkNavigationTarget, detail: string }> = [
  { target: { id: 'train-panda', kind: 'service', name: '熊猫区小火车站', longitude: 113.3127385, latitude: 23.002081 }, detail: '熊猫区小火车站 · 环线起点' },
  { target: { id: 'train-koala', kind: 'service', name: '考拉园小火车站', longitude: 113.309833, latitude: 23.0046 }, detail: '考拉园小火车站 · 可换乘观光环线' },
  { target: { id: 'train-north', kind: 'service', name: '北区小火车站', longitude: 113.30785, latitude: 23.0071 }, detail: '北区小火车站 · 靠近北区展区' },
]
const destinationChoices = computed(() => {
  const request = destinationRequest.value
  if (!request) return []
  const normalized = request.text.replace(/我要去|带我去|我想|想吃|吃饭|吃点东西|吃东西|吃点|用餐|餐饮|餐厅|美食街|美食|饿了|饿|喝点|饮品|展区|附近|推荐|去哪|哪里|园/g, '')
  const query = request.kind === 'train' || (request.kind === 'restaurant' && !/熊猫|考拉|飞禽/.test(normalized)) ? '' : normalized
  const candidates: Array<{ target: ParkNavigationTarget, detail: string }> = request.kind === 'restaurant'
    ? parkServices.filter(service => service.serviceKind === 'dining').map(service => ({ target: service, detail: diningLabels[service.id] ?? service.name }))
    : request.kind === 'train'
      ? trainStations
      : props.animals.map(zone => ({ target: { id: zone.id, kind: 'animal' as const, name: zone.name, longitude: zone.longitude, latitude: zone.latitude }, detail: `${zone.name}展区` }))
  return candidates
    .filter(item => !query || item.detail.includes(query) || item.target.name.includes(query))
    .flatMap(item => {
      try { return [{ ...item, route: navigationRouteFromPosition(demoPosition, item.target) }] }
      catch { return [] }
    })
    .sort((a, b) => a.route.distanceMeters - b.route.distanceMeters)
})
const searchMatches = computed(() => {
  const query = mapSearch.value.trim().toLowerCase()
  if (!query) return []
  return [...props.animals.map(item => ({ id: item.id, label: item.name, type: '动物展区', zone: item })), ...parkServices.map(item => ({ id: item.id, label: item.name, type: '园区服务', service: item }))]
    .filter(item => item.label.toLowerCase().includes(query)).slice(0, 5)
})
function selectSearchMatch(match: { zone?: AnimalPoi, service?: ParkService }) {
  selectedZone.value = match.zone ?? null
  if (match.service) activeRestroom.value = match.service
  mapSearch.value = ''
}

const zoneAliases: Record<AnimalPoi['id'], string[]> = {
  panda: ['熊猫村', '熊猫馆', '熊猫展区'],
  tiger: ['虎园', '老虎园', '白虎园', '虎区'],
  koala: ['考拉园', '考拉展区', '考拉馆'],
  elephant: ['亚洲象园', '大象园', '大象展区'],
  giraffe: ['长颈鹿园', '长颈鹿展区', '长颈鹿区'],
  gorilla: ['黑猩猩馆', '黑猩猩园', '黑猩猩展区'],
}

function arrivedZoneFromText(text: string) {
  if (!/(我)?(到|到了|到达|已到|已经到)/.test(text)) return null
  return props.animals.find(zone => text.includes(zone.name) || zoneAliases[zone.id].some(alias => text.includes(alias))) ?? null
}

function offerAnimalAgent(zone: AnimalPoi) {
  const companion = props.companions.find(item => item.id === zone.id)
  if (!companion) return
  unlockOffer.value = { zone, companion }
  localMessages.value.push({ id: `${Date.now()}-unlock`, type: 'message', role: 'assistant', text: `你已到达${zone.name}，解锁了 ${companion.name} 的动物 Agent。` })
  void scrollToLatest()
}

function unlockAnimalAgent() {
  const offer = unlockOffer.value
  if (!offer) return
  activeCompanion.value = offer.companion
  const experience = zoneExperienceConfigs[offer.zone.id]
  learningZoneId.value = offer.zone.id
  scienceAnswer.value = null
  localMessages.value.push({
    id: `${Date.now()}-switched`,
    type: 'message',
    role: 'assistant',
    text: `我是${offer.companion.name}，${offer.companion.species}。${offer.zone.description} ${experience.lifeHabits}`,
  })
  unlockOffer.value = null
  void scrollToLatest()
}

function answerScienceQuestion(choice: string) {
  scienceAnswer.value = choice
}

async function sendChat() {
  const text = composerText.value.trim()
  if (!text) return
  composerText.value = ''
  // A destination card belongs to the question that created it; don't leave it under later chat replies.
  restroomRequest.value = false
  destinationRequest.value = null
  localMessages.value.push({ id: `${Date.now()}-u`, type: 'message', role: 'user', text })
  const arrivedZone = arrivedZoneFromText(text)
  if (arrivedZone) {
    offerAnimalAgent(arrivedZone)
    emit('arrive')
    return
  }
  if (/我(?:到|进)(?:了|啦)|到园(?:了|啦)?|进园(?:了|啦)?|已经到(?:了|啦)/.test(text)) {
    emit('arrive')
    return
  }
  if (/厕所|洗手间|卫生间/.test(text)) {
    restroomRequest.value = true
    destinationRequest.value = null
    toolsOpen.value = false
    nextTick(() => messageList.value?.scrollTo({ top: messageList.value?.scrollHeight ?? 0, behavior: 'smooth' }))
  }
  else if (/小火车|观光车|环线车/.test(text)) {
    destinationRequest.value = { text, kind: 'train' }
  }
  else if (/餐厅|吃饭|用餐|餐饮|吃东西|吃点|吃的|好吃|食物|美食|饿了|饿|喝点|饮品/.test(text)) {
    destinationRequest.value = { text, kind: 'restaurant' }
    restroomRequest.value = false
  }
  else if (/展区|长颈鹿|熊猫|考拉|大象|老虎|黑猩猩/.test(text)) {
    destinationRequest.value = { text, kind: 'animal' }
    restroomRequest.value = false
  }
  else {
    try {
      const response = await $fetch<{ reply: string, navigationTarget: ParkNavigationTarget | null }>('/api/inpark/chat', {
        method: 'POST',
        body: {
          sessionId: 'pretrip-map-chat',
          companionId: currentCompanion.value.id,
          currentZoneId: null,
          currentPosition: demoPosition,
          routeZoneIds: props.plan?.actualAnimalOrder ?? [],
          completedZoneIds: [],
          question: text,
        },
      })
      localMessages.value.push({ id: `${Date.now()}-a`, type: 'message', role: 'assistant', text: response.reply })
      if (response.navigationTarget) {
        activeDestination.value = response.navigationTarget
        activeNavigation.value = navigationRouteFromPosition(demoPosition, response.navigationTarget)
      }
    }
    catch {
      localMessages.value.push({ id: `${Date.now()}-a`, type: 'message', role: 'assistant', text: '我收到了。网络暂时不稳定，但我会继续为你保留这条请求。' })
    }
  }
}

function sendQuickPrompt(text: string) {
  composerText.value = text
  void sendChat()
}

function navigateToRestroom(choice: { service: ParkService, route: ParkNavigationRoute }) {
  activeRestroom.value = choice.service
  activeDestination.value = choice.service
  activeNavigation.value = choice.route
  selectedZone.value = null
  mapOpen.value = true
}

function navigateToDestination(choice: { target: ParkNavigationTarget, route: ParkNavigationRoute }) {
  activeDestination.value = choice.target
  activeRestroom.value = null
  activeNavigation.value = choice.route
  selectedZone.value = null
  mapOpen.value = true
}

function navigateToShowReminder(reminder: Extract<LocalTimelineItem, { type: 'show-reminder' }>) {
  activeDestination.value = reminder.service
  activeRestroom.value = null
  activeNavigation.value = reminder.route
  selectedZone.value = null
  mapOpen.value = true
}

function startZoneNavigation() {
  const zone = selectedZone.value
  if (!zone) return
  const target: ParkNavigationTarget = {
    id: zone.id,
    kind: 'animal',
    name: zone.name,
    longitude: zone.longitude,
    latitude: zone.latitude,
  }
  activeDestination.value = target
  activeRestroom.value = null
  activeNavigation.value = navigationRouteFromPosition(demoPosition, target)
  selectedZone.value = null
}

function reactToChoice() {
  reactionKey.value += 1
}

function capturePhoto() { photoInput.value?.click() }
function attachPhoto(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (file) composerText.value = `已选择照片：${file.name}`
}
const zoneInfo = computed(() => {
  const zone = selectedZone.value
  if (!zone) return null
  const copy: Record<string, string> = {
    panda: '在安静的竹影间，跟着团团观察熊猫用爪子抱住竹竿的细节。', tiger: '凯凯会带你认识白虎的领地习性，请保持安静，把观察留给眼睛。', koala: '悠米喜欢慢一点的节奏，抬头看看考拉如何在树杈间舒展身体。', elephant: '大象展区适合慢慢看：耳朵、鼻子与脚步都是交流的线索。', giraffe: '长颈鹿会用长舌卷取枝叶，留意它们取食时的耐心动作。', gorilla: '黑猩猩展区的群体互动很丰富，请和团团一起安静观察。',
  }
  return { ...zone, description: copy[zone.id] ?? zone.description }
})
const zoneHeat = computed(() => selectedZone.value ? 48 + ((selectedZone.value.id.length * 11 + heatTick.value * 7) % 43) : 0)
const poiInfo = computed(() => {
  const service = selectedService.value
  if (service) {
    const isRestroom = service.serviceKind === 'restroom'
    const isShow = service.serviceKind === 'show'
    const value = 18 + ((service.id.length * 7 + heatTick.value * 9) % 58)
    return {
      name: service.name,
      detail: service.detail,
      hours: isShow ? '表演时间 10:30 / 13:00 / 15:30' : isRestroom ? '开放时间 09:30—闭园' : '营业时间 10:00—18:30',
      metric: isRestroom ? `排队指数 ${value}%` : `火爆程度 ${value}%`,
    }
  }
  const landmark = selectedLandmark.value
  if (!landmark) return null
  const isShow = /剧场|表演|演出/.test(landmark.name)
  const value = 22 + ((landmark.id.length * 5 + heatTick.value * 8) % 61)
  return {
    name: landmark.name,
    detail: isShow ? '建议提前到场，现场以当日节目单为准。' : `${landmark.category} POI，可在地图中查看位置与路线。`,
    hours: isShow ? '表演时间 10:30 / 13:00 / 15:30' : '开放时间 09:30—17:30',
    metric: `火爆程度 ${value}%`,
  }
})

function selectServicePoi(service: ParkService) {
  selectedService.value = service
  selectedLandmark.value = null
  selectedZone.value = null
  activeDestination.value = null
  activeRestroom.value = null
  activeNavigation.value = null
}

function selectLandmarkPoi(landmark: ParkLandmark) {
  selectedLandmark.value = landmark
  selectedService.value = null
  selectedZone.value = null
  activeDestination.value = null
  activeRestroom.value = null
  activeNavigation.value = null
}

function selectZonePoi(zone: AnimalPoi) {
  selectedZone.value = zone
  selectedService.value = null
  selectedLandmark.value = null
  activeDestination.value = null
  activeRestroom.value = null
  activeNavigation.value = null
}

async function scrollToLatest(behavior: ScrollBehavior = 'smooth') {
  await nextTick()
  const list = messageList.value
  if (!list) return
  list.scrollTo({ top: list.scrollHeight, behavior })
}

onMounted(() => void scrollToLatest('auto'))

watch(arrivalMessage, (message) => {
  if (!message || localMessages.value.some(item => item.id === 'park-arrival-map')) return
  localMessages.value.push(
    { id: 'park-arrival-map', type: 'map' },
    { id: 'park-arrival-welcome', type: 'message', role: 'assistant', text: message.text },
  )
}, { immediate: true })

watch([
  () => props.messages.length,
  () => localMessages.value.length,
  () => restroomRequest.value,
  () => destinationRequest.value?.text,
  () => props.plan,
], () => void scrollToLatest())
</script>

<template>
  <section class="chat-shell" data-release="2026-08-07-collaboration-release-2" :style="{ '--agent-accent': currentCompanion.accent }">
    <header class="chat-header">
      <button class="back-button" type="button" aria-label="返回上一步" @click="emit('back')">←</button>
      <div class="header-agent">
        <span class="mini-avatar"><img :src="currentCompanion.selectionImage" :alt="currentCompanion.name"></span>
        <span><strong>{{ currentCompanion.name }}</strong><small class="animal-status">● {{ currentCompanion === companion ? animalState : `${currentCompanion.species} 已解锁` }}</small></span>
      </div>
      <button class="reset-button" type="button" @click="emit('reset')">重选</button>
    </header>

    <div class="progress-row">
      <span><i :style="{ width: `${progress}%` }" /></span>
      <small>{{ stepIndex + 1 }}/7</small>
    </div>

    <DraggableCompanion :companion="currentCompanion" :reaction-key="reactionKey" :animal-state="animalState" />

    <div ref="messageList" class="message-list" aria-live="polite">
      <div
        v-for="message in journeyMessages"
        :key="message.id"
        class="message-row"
        :class="message.role"
      >
        <span v-if="message.role === 'assistant'" class="message-avatar">{{ companion.name.slice(0, 1) }}</span>
        <div class="message-bubble">
          <p>{{ message.text }}</p>
          <small v-if="message.mode === 'deepseek'">DeepSeek生成</small>
        </div>
      </div>

      <template v-for="message in localMessages" :key="message.id">
        <button v-if="message.type === 'map' && plan" class="location-card" type="button" @click="mapOpen = true">
          <span class="location-pin">⌖</span>
          <span><small>{{ companion.name }}分享了一个位置</small><strong>{{ plan.title }}</strong><em>{{ plan.stops.length }} 个 POI · 预计步行 {{ plan.walkingMeters }} 米</em></span>
          <b>查看地图 ›</b>
        </button>
        <div v-else-if="message.type === 'show-reminder'" class="message-row assistant show-reminder">
          <span class="message-avatar">演</span>
          <div class="message-bubble">
            <p>演出提醒：{{ message.service.name }}将在 {{ message.startLabel }} 开始，距离开演约半小时。</p>
            <button class="show-route-card" type="button" @click="navigateToShowReminder(message)">
              <span>⌖</span><strong>{{ message.service.name }}</strong><em>距你 {{ message.route.distanceMeters }} 米 · 步行约 {{ message.route.walkingMinutes }} 分钟</em><b>查看路线</b>
            </button>
          </div>
        </div>
        <div v-else-if="message.type === 'message'" class="message-row" :class="message.role">
          <span v-if="message.role === 'assistant'" class="message-avatar">{{ companion.name.slice(0, 1) }}</span>
          <div class="message-bubble"><p>{{ message.text }}</p></div>
        </div>
      </template>

      <div v-if="unlockOffer" class="message-row assistant unlock-answer">
        <span class="message-avatar">{{ unlockOffer.companion.name.slice(0, 1) }}</span>
        <div class="message-bubble">
          <p>{{ unlockOffer.zone.name }}已抵达，发现专属动物 Agent。</p>
          <button class="unlock-agent-button" type="button" @click="unlockAnimalAgent">
            <img :src="unlockOffer.companion.selectionImage" :alt="unlockOffer.companion.name">
            <span><small>新 Agent 已解锁</small><strong>解锁 {{ unlockOffer.companion.name }}</strong><em>{{ unlockOffer.companion.species }}</em></span>
            <b>启用</b>
          </button>
        </div>
      </div>

      <div v-if="learningConfig" class="message-row assistant science-answer">
        <span class="message-avatar">{{ currentCompanion.name.slice(0, 1) }}</span>
        <div class="science-card">
          <small>动物科普问答</small>
          <strong>{{ learningConfig.task.title }}</strong>
          <p>{{ learningConfig.task.prompt }}</p>
          <button
            v-for="choice in learningConfig.task.choices"
            :key="choice"
            type="button"
            :class="{ correct: scienceAnswer === choice && choice === learningConfig.task.correctChoice, incorrect: scienceAnswer === choice && choice !== learningConfig.task.correctChoice }"
            @click="answerScienceQuestion(choice)"
          >{{ choice }}</button>
          <em v-if="scienceAnswer">{{ scienceAnswer === learningConfig.task.correctChoice ? learningConfig.task.successMessage : `再观察一下：${learningConfig.task.correctChoice}` }}</em>
        </div>
      </div>

      <div v-if="isReplying" class="message-row assistant">
        <span class="message-avatar">{{ companion.name.slice(0, 1) }}</span>
        <div class="typing-bubble" aria-label="伙伴正在思考"><i /><i /><i /></div>
      </div>
      <template v-if="restroomRequest">
        <div class="message-row assistant restroom-answer">
          <span class="message-avatar">{{ companion.name.slice(0, 1) }}</span>
          <div class="message-bubble">
            <p>收到，我按你当前位置为你排好了附近洗手间。排队指数会随园区客流变化。</p>
            <button v-for="choice in restroomChoices" :key="choice.service.id" class="restroom-choice" type="button" @click="navigateToRestroom(choice)">
              <span class="restroom-icon">⌾</span>
              <span><strong>{{ restroomLabels[choice.service.id] ?? choice.service.name }}</strong><small>距你 {{ choice.route.distanceMeters }} 米 · 约 {{ choice.route.walkingMinutes }} 分钟</small></span>
              <b :class="{ busy: choice.queue >= 40 }">排队 {{ choice.queue }}%</b>
            </button>
          </div>
        </div>
      </template>
      <template v-if="destinationRequest">
        <div class="message-row assistant restroom-answer">
          <span class="message-avatar">{{ companion.name.slice(0, 1) }}</span>
          <div class="message-bubble">
            <p>{{ destinationRequest.kind === 'restaurant' ? '为你找到了附近餐厅，按步行距离排序。' : destinationRequest.kind === 'train' ? '为你找到了附近小火车站，选一个站点后就开始导航。' : '为你找到了匹配展区，点一下就开始导航。' }}</p>
            <button v-for="choice in destinationChoices" :key="choice.target.id" class="restroom-choice destination-choice" type="button" @click="navigateToDestination(choice)">
              <span class="restroom-icon">{{ destinationRequest.kind === 'restaurant' ? '⌑' : destinationRequest.kind === 'train' ? '▣' : '◉' }}</span>
              <span><strong>{{ choice.detail }}</strong><small>距你 {{ choice.route.distanceMeters }} 米 · 约 {{ choice.route.walkingMinutes }} 分钟</small></span>
              <b>去这里</b>
            </button>
            <small v-if="!destinationChoices.length" class="no-destination">暂未匹配到目的地，试试输入完整名称。</small>
          </div>
        </div>
      </template>
    </div>

    <p v-if="errorMessage" class="chat-error">{{ errorMessage }}</p>

    <div v-if="!plan" class="answer-dock">
      <ChatAnswerPanel
        :step="step"
        :profile="profile"
        :companion-id="companion.id"
        :pace-options="paceOptions"
        :animals="animals"
        :restaurants="restaurants"
        :recommended-restaurant-id="recommendedRestaurantId"
        :disabled="isReplying"
        @answer="(nextProfile, summary) => emit('answer', nextProfile, summary)"
        @generate="emit('generate')"
        @interact="reactToChoice"
      />
    </div>
    <div v-else class="wechat-dock">
      <input ref="photoInput" class="photo-input" type="file" accept="image/*" capture="environment" @change="attachPhoto">
      <div class="quick-prompts" aria-label="快捷提问">
        <button type="button" @click="sendQuickPrompt('我想去卫生间')">我想去卫生间</button>
        <button type="button" @click="sendQuickPrompt('离我最近的餐厅在哪')">离我最近的餐厅在哪</button>
        <button type="button" @click="sendQuickPrompt('我要去虎园')">我要去虎园</button>
        <button type="button" @click="sendQuickPrompt('我到考拉园了')">我到考拉园了</button>
      </div>
      <div class="composer-row">
        <button :class="{ active: voiceActive }" type="button" @click="voiceActive = !voiceActive">◉</button>
        <input v-model="composerText" placeholder="和团团说点什么…">
        <button type="button">☺</button>
        <button class="plus-button" type="button" @click="toolsOpen = !toolsOpen">＋</button>
      </div>
      <small v-if="voiceActive" class="voice-hint">正在聆听，点击圆形按钮结束</small>
      <div v-if="toolsOpen" class="tool-grid">
        <button type="button" @click="mapOpen = true; toolsOpen = false"><i>⌖</i><span>位置</span></button>
        <button type="button" @click="capturePhoto"><i>◉</i><span>拍摄</span></button>
        <button type="button" @click="voiceActive = !voiceActive; toolsOpen = false"><i>♬</i><span>语音输入</span></button>
      </div>
    </div>

    <Transition name="map-drop"><div v-if="mapOpen && plan" class="map-backdrop" @click.self="mapOpen = false"><div class="map-modal" role="dialog" aria-modal="true" aria-label="园区路线地图">
      <header><div><small>园区实时地图</small><strong>{{ plan.title }}</strong><label class="map-search"><span>⌕</span><input placeholder="搜索动物、展区或服务"></label></div><button type="button" @click="mapOpen = false">×</button></header>
      <div class="map-canvas"><ParkRasterMap :animals="animals" :route-zone-ids="plan.actualAnimalOrder" :current-position="demoPosition" :services="parkServices" :show-services="true" :navigation-route="activeNavigation" :interactive="true" @select-zone="selectZonePoi" @select-service="selectServicePoi" @select-landmark="selectLandmarkPoi" /></div>
      <footer v-if="activeDestination && !activeRestroom && activeNavigation" class="navigation-summary"><small>正在为你导航</small><strong>{{ activeDestination.name }}</strong><span>已为你规划园区步行路线。</span><b>距你 {{ activeNavigation.distanceMeters }} 米 · 步行约 {{ activeNavigation.walkingMinutes }} 分钟</b></footer>
      <footer v-if="activeRestroom && activeNavigation" class="navigation-summary"><small>正在为你导航</small><strong>{{ restroomLabels[activeRestroom.id] ?? activeRestroom.name }}</strong><span>{{ activeRestroom.detail }}</span><b>距你 {{ activeNavigation.distanceMeters }} 米 · 步行约 {{ activeNavigation.walkingMinutes }} 分钟</b></footer>
      <footer v-if="poiInfo" class="poi-summary"><small>园区 POI 信息</small><strong>{{ poiInfo.name }}</strong><span>{{ poiInfo.detail }}</span><b>{{ poiInfo.hours }} · {{ poiInfo.metric }}</b></footer>
      <footer v-if="zoneInfo" class="zone-summary"><small>展区实时信息</small><strong>{{ zoneInfo.name }}</strong><span>{{ zoneInfo.description }}</span><b>当前状态：{{ animalState }} · 火爆指数 {{ zoneHeat }}%</b><button type="button" @click="startZoneNavigation">现在出发</button></footer>
      <footer v-else><strong>路线已标记</strong><span>点击地图中的动物展区，查看介绍、状态与实时火爆指数。</span></footer>
    </div></div></Transition>
  </section>
</template>

<style scoped>
.chat-shell {
  position: relative;
  isolation: isolate;
  display: grid;
  grid-template-rows: auto auto minmax(220px, 1fr) auto;
  min-height: 100dvh;
  height: 100dvh;
  overflow: hidden;
  background: var(--paper);
}

.chat-header {
  position: relative;
  z-index: 7;
  display: grid;
  grid-template-columns: 38px 1fr 42px;
  align-items: center;
  min-height: calc(68px + env(safe-area-inset-top));
  padding: max(12px, env(safe-area-inset-top)) 16px 10px;
  gap: 10px;
  border-bottom: 1px solid var(--line);
  background: rgba(243,240,231,.94);
  backdrop-filter: blur(16px);
}

.back-button,
.reset-button {
  height: 40px;
  border: 1px solid var(--line);
  border-radius: 11px;
  background: var(--surface);
  color: var(--forest);
}

.back-button {
  width: 40px;
  font-size: 17px;
}

.reset-button {
  font-size: 11px;
  font-weight: 800;
}

.header-agent {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 9px;
}

.mini-avatar {
  display: grid;
  width: 40px;
  height: 40px;
  flex: 0 0 auto;
  overflow: hidden;
  border-radius: 14px;
  background: color-mix(in srgb, var(--agent-accent) 20%, #fff);
}

.mini-avatar img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.header-agent > span:last-child {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.header-agent strong {
  color: var(--ink);
  font-family: var(--font-display);
  font-size: 16px;
}

.header-agent small {
  overflow: hidden;
  color: var(--muted);
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.progress-row {
  position: relative;
  z-index: 7;
  display: grid;
  grid-template-columns: 1fr 28px;
  align-items: center;
  padding: 10px 18px 8px;
  gap: 8px;
}

.progress-row > span {
  height: 4px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(18, 60, 50, 0.09);
}

.progress-row i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--agent-accent);
  transition: width 220ms ease;
}

.progress-row small {
  color: var(--muted);
  font-size: 10px;
  text-align: right;
}

.message-list {
  display: flex;
  min-height: 0;
  padding: 14px 17px 22px;
  overflow-y: auto;
  flex-direction: column;
  gap: 10px;
  scroll-behavior: smooth;
}

.message-row {
  display: flex;
  align-items: flex-end;
  gap: 7px;
}

.message-row.user {
  justify-content: flex-end;
}

.message-avatar {
  display: grid;
  width: 32px;
  height: 32px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 9px;
  background: color-mix(in srgb, var(--agent-accent) 22%, #fff);
  color: var(--forest);
  font-size: 11px;
  font-weight: 900;
}

.message-bubble {
  max-width: 80%;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: 6px 15px 15px 15px;
  background: var(--surface);
  box-shadow: none;
}

.message-row.user .message-bubble {
  border-color: var(--forest);
  border-radius: 15px 6px 15px 15px;
  background: var(--forest);
  color: #fff;
}

.message-bubble p {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
}

.message-bubble small {
  display: block;
  margin-top: 5px;
  color: var(--agent-accent);
  font-size: 9px;
  font-weight: 800;
}

.typing-bubble {
  display: flex;
  padding: 11px 13px;
  gap: 4px;
  border-radius: 7px 16px 16px 16px;
  background: #fff;
}

.typing-bubble i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--agent-accent);
  animation: typing 900ms ease-in-out infinite;
}

.typing-bubble i:nth-child(2) { animation-delay: 140ms; }
.typing-bubble i:nth-child(3) { animation-delay: 280ms; }

.answer-dock {
  position: relative;
  z-index: 2;
  padding: 0 12px max(12px, env(safe-area-inset-bottom));
}

.chat-error {
  margin: 0 15px 8px;
  padding: 9px 11px;
  border-radius: 11px;
  background: #fff0eb;
  color: #9c442e;
  font-size: 12px;
}

.location-card { display: grid; grid-template-columns: 38px 1fr auto; align-items: center; margin: 3px 0 8px 39px; padding: 12px; gap: 9px; border: 1px solid #bed6c1; border-radius: 14px; background: #eff7ef; color: var(--ink); text-align: left; }
.location-pin { display: grid; width: 35px; height: 35px; place-items: center; border-radius: 12px; background: var(--forest); color: #fff; font-size: 21px; }
.location-card span:nth-child(2) { display: grid; gap: 2px; }
.location-card small,.location-card em { color: var(--muted); font-size: 9px; font-style: normal; }
.location-card strong { color: var(--forest); font-size: 12px; }
.location-card b { color: var(--accent-dark); font-size: 10px; }
.map-modal { position: fixed; z-index: 20; right: 50%; bottom: 8px; width: min(100% - 12px, 468px); height: min(96dvh, 850px); display: grid; grid-template-rows: auto 1fr auto; overflow: hidden; border: 1px solid rgba(22,82,67,.14); border-radius: 28px; background: var(--paper); box-shadow: 0 -22px 60px rgba(21,58,48,.28); transform: translateX(50%); animation: map-rise 460ms cubic-bezier(.2,.9,.2,1); }
.map-modal header { display: flex; align-items: center; justify-content: space-between; padding: max(14px, env(safe-area-inset-top)) 16px 14px; border-bottom: 1px solid var(--line); }
.map-modal header div { display: grid; gap: 2px; }.map-modal header small { color: var(--accent-dark); font-size: 10px; }.map-modal header strong { color: var(--ink); font-size: 15px; }
.map-modal header button { width: 36px; height: 36px; border: 1px solid var(--line); border-radius: 12px; background: #fff; color: var(--forest); font-size: 24px; }
.map-search { display: flex; align-items: center; height: 38px; margin-top: 10px; padding: 0 11px; gap: 6px; border-radius: 12px; background: #e9e9e5; color: #6b716d; }.map-search input { width: 100%; border: 0; outline: 0; background: transparent; color: var(--ink); font-size: 13px; }.map-canvas { min-height: 0; }.map-modal footer { display: grid; min-height: 116px; padding: 34px 16px max(15px, env(safe-area-inset-bottom)); gap: 2px; border-top: 1px solid var(--line); background: #fff; }.map-modal footer strong { color: var(--forest); font-size: 13px; }.map-modal footer span { color: var(--muted); font-size: 10px; }
.zone-status-card { display: none; }
.zone-status-card { position: absolute; right: 12px; bottom: 70px; left: 12px; display: grid; padding: 14px; gap: 6px; border-radius: 16px; background: rgba(255,255,255,.97); box-shadow: 0 12px 28px rgba(7,56,45,.2); }.zone-status-card button { position: absolute; top: 8px; right: 9px; border: 0; background: transparent; color: var(--muted); font-size: 20px; }.zone-status-card small { color: var(--accent-dark); font-size: 10px; font-weight: 800; }.zone-status-card strong { color: var(--forest); font-size: 17px; }.zone-status-card p { margin: 0; color: var(--muted); font-size: 11px; line-height: 1.5; }.zone-status-card div { display: flex; flex-wrap: wrap; gap: 5px; }.zone-status-card span { padding: 5px 7px; border-radius: 8px; background: #edf5ed; color: var(--forest); font-size: 9px; }
.wechat-dock { padding: 9px 12px max(10px, env(safe-area-inset-bottom)); border-top: 1px solid var(--line); background: #f5f4f0; }
.animal-status { color: #42805a !important; font-weight: 800; }.composer-row { display: grid; grid-template-columns: 35px 1fr 34px 34px; align-items: center; gap: 8px; }.composer-row input { min-width: 0; height: 37px; padding: 0 11px; border: 0; border-radius: 7px; background: #fff; color: var(--ink); font-size: 13px; }.composer-row button { display: grid; width: 34px; height: 34px; place-items: center; border: 0; background: transparent; color: #31443d; font-size: 23px; line-height: 1; }.composer-row button.active { color: #ba6332; }.plus-button { font-size: 26px !important; }.photo-input { display: none; }.voice-hint { display: block; margin: 5px 44px 0; color: #ba6332; font-size: 10px; }.tool-grid { display: grid; grid-template-columns: repeat(3, 72px); padding: 15px 6px 5px; gap: 14px; }.tool-grid button { display: grid; justify-items: center; gap: 6px; border: 0; background: transparent; color: var(--ink); font-size: 11px; }.tool-grid i { display: grid; width: 48px; height: 48px; place-items: center; border-radius: 12px; background: #e3e5df; color: var(--forest); font-size: 25px; font-style: normal; }

.zone-status-card { display: none; }
.restroom-answer .message-bubble { width: min(100%, 330px); }
.unlock-answer .message-bubble { width: min(100%, 330px); }
.unlock-agent-button { display: grid; grid-template-columns: 42px 1fr auto; width: 100%; margin-top: 9px; padding: 9px; align-items: center; gap: 9px; border: 1px solid #b9d6bf; border-radius: 14px; background: linear-gradient(135deg, #f5fbf4, #e6f3e7); color: var(--ink); text-align: left; }
.unlock-agent-button img { width: 42px; height: 42px; border-radius: 12px; object-fit: cover; background: #fff; }
.unlock-agent-button span { display: grid; gap: 2px; }.unlock-agent-button small { margin: 0; color: #4e8561; font-size: 9px; }.unlock-agent-button strong { color: var(--forest); font-size: 13px; }.unlock-agent-button em { color: var(--muted); font-size: 9px; font-style: normal; }.unlock-agent-button b { padding: 6px 8px; border-radius: 999px; background: var(--forest); color: #fff; font-size: 10px; }
.show-reminder .message-bubble { width: min(100%, 330px); }.show-route-card { display: grid; grid-template-columns: 30px 1fr auto; width: 100%; margin-top: 8px; padding: 9px; align-items: center; gap: 7px; border: 1px solid #c7d8c7; border-radius: 12px; background: #f3faf3; color: var(--forest); text-align: left; }.show-route-card > span { grid-row: 1 / span 2; display: grid; width: 28px; height: 28px; place-items: center; border-radius: 50%; background: var(--forest); color: #fff; }.show-route-card strong { font-size: 12px; }.show-route-card em { color: var(--muted); font-size: 10px; font-style: normal; }.show-route-card b { grid-column: 3; grid-row: 1 / span 2; padding: 5px 7px; border-radius: 8px; background: #e0efdf; color: #39724a; font-size: 9px; white-space: nowrap; }
.science-answer { align-items: flex-start; }.science-card { width: min(100%, 330px); padding: 12px; border: 1px solid #cddfce; border-radius: 14px; background: #f8fbf6; }.science-card > small { display: block; color: var(--accent-dark); font-size: 10px; font-weight: 800; }.science-card > strong { display: block; margin-top: 3px; color: var(--forest); font-size: 13px; }.science-card p { margin: 7px 0; color: var(--ink); font-size: 12px; line-height: 1.5; }.science-card button { display: block; width: 100%; margin-top: 6px; padding: 8px; border: 1px solid #d5e3d4; border-radius: 9px; background: #fff; color: var(--ink); font-size: 11px; text-align: left; }.science-card button.correct { border-color: #75ac80; background: #e4f2e4; color: #235c36; }.science-card button.incorrect { border-color: #e3b087; background: #fff1e6; color: #9b5427; }.science-card em { display: block; margin-top: 8px; color: #326b43; font-size: 11px; font-style: normal; line-height: 1.5; }
.restroom-choice { display: grid; grid-template-columns: 30px 1fr auto; width: 100%; margin-top: 8px; padding: 10px; gap: 8px; align-items: center; border: 1px solid #c8dec9; border-radius: 12px; background: #f4faf4; color: var(--ink); text-align: left; }
.restroom-choice:hover { background: #e7f2e8; }.restroom-choice .restroom-icon { display: grid; width: 28px; height: 28px; place-items: center; border-radius: 50%; background: var(--forest); color: #fff; font-size: 18px; }.restroom-choice > span:nth-child(2) { display: grid; gap: 2px; }.restroom-choice strong { font-size: 12px; color: var(--forest); }.restroom-choice small { color: var(--muted); font-size: 10px; }.restroom-choice b { padding: 4px 6px; border-radius: 7px; background: #e3f0df; color: #36704e; font-size: 9px; white-space: nowrap; }.restroom-choice b.busy { background: #fff0dc; color: #ae642d; }
.navigation-summary ~ footer { display: none; }.navigation-summary { min-height: 116px; }.navigation-summary b { color: var(--forest); font-size: 12px; }
.poi-summary ~ footer { display: none; }.poi-summary b { color: var(--forest); font-size: 11px; }
.zone-summary { grid-template-columns: 1fr auto; align-items: end; }.zone-summary small,.zone-summary strong,.zone-summary span,.zone-summary b { grid-column: 1; }.zone-summary button { grid-column: 2; grid-row: 1 / span 4; align-self: center; padding: 10px 13px; border: 0; border-radius: 999px; background: var(--forest); color: #fff; font-size: 12px; font-weight: 800; white-space: nowrap; }
.quick-prompts { display: flex; justify-content: center; gap: 7px; margin: 0 0 8px; overflow-x: auto; scrollbar-width: none; }.quick-prompts::-webkit-scrollbar { display: none; }.quick-prompts button { flex: 0 0 auto; padding: 7px 10px; border: 1px solid #c8dcc9; border-radius: 999px; background: #f2f8f1; color: var(--forest); font-size: 11px; font-weight: 700; }.quick-prompts button:active { background: #dceedd; transform: scale(.97); }

@keyframes typing {
  50% { opacity: 0.25; transform: translateY(-2px); }
}
@keyframes map-rise { from { opacity: 0; transform: translate(50%, calc(100% + 20px)) scale(.98); } to { opacity: 1; transform: translateX(50%) scale(1); } }
.map-backdrop { position: fixed; z-index: 19; inset: 0; background: rgba(8,30,24,.28); }
.map-drop-enter-active .map-modal,.map-drop-leave-active .map-modal { transition: transform 380ms cubic-bezier(.2,.9,.2,1), opacity 220ms ease; }.map-drop-enter-from .map-modal,.map-drop-leave-to .map-modal { opacity: 0; transform: translate(50%, calc(100% + 20px)) scale(.98); }
.map-modal header div { width: 100%; gap: 5px; }
.map-modal header small { font-size: 13px; font-weight: 800; }
.map-modal header strong { font-size: 20px; }
.map-search { width: min(100%, 340px); height: 44px; margin: 14px auto 0; padding: 0 14px; gap: 8px; border-radius: 14px; }
.map-search input { font-size: 15px; }
</style>
