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
  ChatAction,
  TuantuanReminder,
} from '../../../shared/types/pretrip'
import type { JourneyMessage } from '../../composables/usePretripJourney'
import type { ParkNavigationRoute, ParkNavigationTarget, ParkService } from '../../../shared/types/park'
import type { OperationsState } from '../../../shared/types/operations'
import { parkServices } from '#shared/data/parkServices'
import { parkLiveLandmarks } from '#shared/data/parkLiveData.generated'
import { parkMapMeta, parkMapPoints } from '#shared/data/parkGeometry.generated'
import { zoneExperienceConfigs } from '#shared/data/zoneExperience'
import { haversineMeters, navigationRouteFromPosition, projectGeoPoint, walkingMinutes } from '#shared/utils/parkGeo'
import { dueShowReminders } from '../../utils/showReminders'
import ChatAnswerPanel from './ChatAnswerPanel.vue'
import DraggableCompanion from './DraggableCompanion.vue'
import ParkRasterMap from '../map/ParkRasterMap.vue'
import AgentPhotoComposer from './AgentPhotoComposer.vue'
import { merchCatalog } from '../../utils/merchCatalog'
import { getParkAgent } from '../../data/parkAgents'
import ChatActionButtons from '../chat/ChatActionButtons.vue'
import TuantuanReminderCard from '../chat/TuantuanReminderCard.vue'

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

const chatScrollArea = useTemplateRef<HTMLElement>('chatScrollArea')
const activeCompanion = useState<Companion | null>('pretrip-active-companion', () => null)
const currentCompanion = computed(() => activeCompanion.value ?? props.companion)
const currentAgentRole = computed(() => getParkAgent(currentCompanion.value.id)?.role ?? '亲子规划与儿童科普')
const agentUnlocks = useAgentUnlocks()
const fieldObservations = useFieldObservations()
const unlockOffer = shallowRef<{ zone: AnimalPoi, companion: Companion } | null>(null)
const merchOffer = shallowRef<Companion | null>(null)
const merchAdded = shallowRef(false)
const merchBagOpen = shallowRef(false)
const merchBag = useMerchBag()
const merchBagIds = merchBag.ids
const merchOrdering = shallowRef(false)
const operationsState = shallowRef<OperationsState | null>(null)
let operationsTimer: ReturnType<typeof setInterval> | undefined
const learningZoneId = shallowRef<AnimalPoi['id'] | null>(null)
const scienceAnswer = shallowRef<string | null>(null)
const learningConfig = computed(() => learningZoneId.value ? zoneExperienceConfigs[learningZoneId.value] : null)
const currentMerch = computed(() => merchOffer.value ? merchCatalog[merchOffer.value.id] : null)
const currentMerchStock = computed(() => merchOffer.value ? operationsState.value?.merchStock[merchOffer.value.id] ?? 1 : 0)
const merchSoldOut = computed(() => currentMerchStock.value <= 0)
const merchBagItems = computed(() => merchBagIds.value.flatMap((id) => {
  const companion = props.companions.find(item => item.id === id)
  return companion ? [{ companion, product: merchCatalog[id] }] : []
}))
const merchBagTotal = computed(() => merchBagItems.value.reduce((total, item) => total + Number(item.product.price.replace(/\D/g, '')), 0))
const progress = computed(() => Math.round(((props.stepIndex + 1) / 7) * 100))
const reactionKey = shallowRef(0)
const mapOpen = shallowRef(false)
const route = useRoute()
watch([() => route.query.tab, () => props.plan], ([tab]) => {
  if (tab === 'map') mapOpen.value = true
  else if (tab === 'chat') mapOpen.value = false
}, { immediate: true })
const mapSearch = shallowRef('')
const testPanelOpen = shallowRef(false)
const testTime = shallowRef('real')
const testZoneId = shallowRef('')
const diningOffer = shallowRef<ParkService | null>(null)
const presence = useParkPresence()
const selectedZone = shallowRef<AnimalPoi | null>(null)
const heatTick = shallowRef(0)
let heatTimer: ReturnType<typeof setInterval> | undefined
const animalState = computed(() => operationsState.value?.zones[currentCompanion.value.id]?.status ?? '营业中')
onMounted(() => { heatTimer = setInterval(() => { heatTick.value += 1 }, 6000) })
onMounted(() => presence.start())
async function refreshOperations() {
  try { operationsState.value = await $fetch<OperationsState>('/api/admin/state') }
  catch { /* Keep the visitor flow usable if the local admin API is temporarily unavailable. */ }
}
onMounted(() => {
  void refreshOperations()
  operationsTimer = setInterval(refreshOperations, 3000)
})
onMounted(() => {
  clearUnplannedShowReminders()
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
onBeforeUnmount(() => { if (heatTimer) clearInterval(heatTimer); if (operationsTimer) clearInterval(operationsTimer); stopShowReminderTimer() })
onBeforeUnmount(() => window.removeEventListener('keydown', handleComposerKeydown))
const toolsOpen = shallowRef(false)
const composerText = shallowRef('')
const lostChildOpen = shallowRef(false)
const lostChildSubmitting = shallowRef(false)
const lostChildForm = reactive({ name: '', appearance: '', location: '', guardianPhone: '' })
const canSubmitLostChild = computed(() => Boolean(!lostChildSubmitting.value && lostChildForm.name.trim() && lostChildForm.appearance.trim() && lostChildForm.location.trim() && lostChildForm.guardianPhone.trim()))
type LocalTimelineItem =
  | { id: string, type: 'message', role: 'user' | 'assistant', text: string, agentName?: string, actions?: ChatAction[], reminder?: TuantuanReminder, createdAt?: number }
  | { id: string, type: 'map', createdAt?: number }
  | { id: string, type: 'photo', dataUrl: string, agentName: string, usedAi: boolean, createdAt?: number }
  | { id: string, type: 'restroom-results', choices: Array<{ service: ParkService, route: ParkNavigationRoute, queue: number }>, createdAt?: number }
  | { id: string, type: 'medical-results', choices: Array<{ service: ParkService, route: ParkNavigationRoute }>, createdAt?: number }
  | { id: string, type: 'destination-results', kind: 'restaurant' | 'animal' | 'train', choices: Array<{ target: ParkNavigationTarget, detail: string, route: ParkNavigationRoute }>, createdAt?: number }
  | { id: string, type: 'posttrip', createdAt?: number }
  | { id: string, type: 'test-location', location: { kind: 'animal', zone: AnimalPoi, companion: Companion, unlocked?: boolean, scienceAnswer?: string } | { kind: 'dining', service: ParkService }, createdAt?: number }
  | { id: string, type: 'show-reminder', service: ParkService, route: ParkNavigationRoute, startLabel: string, createdAt?: number }

const localMessages = useState<LocalTimelineItem[]>('pretrip-local-messages', () => [])
const announcedShows = new Set<string>()
type PriorityTimelineItem = Extract<LocalTimelineItem, { type: 'show-reminder' | 'posttrip' | 'test-location' }>

function clearUnplannedShowReminders() {
  if (props.plan) return
  localMessages.value = localMessages.value.filter(message => message.type !== 'show-reminder')
  announcedShows.clear()
}

watch(() => props.plan, () => clearUnplannedShowReminders(), { immediate: true })

onMounted(() => {
  if (activeCompanion.value) agentUnlocks.unlock(activeCompanion.value.id)
  for (const message of localMessages.value) {
    if (message.type === 'test-location' && message.location.kind === 'animal' && message.location.unlocked) {
      agentUnlocks.unlock(message.location.companion.id)
    }
  }
})

function timelineTimestamp(message: LocalTimelineItem) {
  if (message.createdAt) return message.createdAt
  const timestamp = message.id.match(/^(\d{13})/)?.[1]
  return timestamp ? Number(timestamp) : null
}

function shouldShowTimelineTime(index: number) {
  const current = timelineTimestamp(localMessages.value[index]!)
  if (current === null) return false
  for (let previousIndex = index - 1; previousIndex >= 0; previousIndex -= 1) {
    const previous = timelineTimestamp(localMessages.value[previousIndex]!)
    if (previous !== null) return Math.abs(current - previous) >= 10 * 60 * 1000
  }
  return true
}

function formatTimelineTime(message: LocalTimelineItem) {
  const timestamp = timelineTimestamp(message)
  if (timestamp === null) return ''
  return new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(timestamp)
}
const priorityMessages = computed(() => localMessages.value
  .filter((message): message is PriorityTimelineItem => message.type === 'show-reminder' || message.type === 'posttrip' || message.type === 'test-location'))
// 优先事件现已直接在 localMessages 主时间线渲染；保留空集合仅兼容旧模板结构，避免重复显示。
const separatedPriorityMessages = computed<PriorityTimelineItem[]>(() => [])

function nextPriorityTimestamp(preferred = Date.now()) {
  const previous = priorityMessages.value.at(-1)
  const previousTimestamp = previous ? timelineTimestamp(previous) : null
  if (previousTimestamp === null) return preferred
  // 测试消息严格按按钮点击顺序追加；时间只作为聊天分层展示，绝不用于重新排序。
  return Math.max(preferred, previousTimestamp + 11 * 60 * 1000)
}

function shouldShowPriorityTime(index: number) {
  const current = timelineTimestamp(priorityMessages.value[index]!)
  if (current === null || index === 0) return true
  const previous = timelineTimestamp(priorityMessages.value[index - 1]!)
  return previous === null || Math.abs(current - previous) >= 10 * 60 * 1000
}
const journeyMessages = computed(() => props.messages.filter(message => message.id !== 'park-arrival'))
const arrivalMessage = computed(() => props.messages.find(message => message.id === 'park-arrival') ?? null)
const photoInput = useTemplateRef<HTMLInputElement>('photoInput')
const photoSourceFile = shallowRef<File | null>(null)
const photoComposerOpen = shallowRef(false)
const photoStickerSources = computed(() => {
  const stickerSets: Record<Companion['id'], string[]> = {
    panda: [
      '/companions/panda-companion.webp',
      '/companions/photo-stickers/panda-wave.png',
      '/companions/photo-stickers/panda-map.png',
      '/companions/photo-stickers/panda-binoculars.png',
      '/companions/photo-stickers/panda-drink.png',
      '/companions/photo-stickers/panda-celebrate.png',
    ],
    elephant: [
      '/companions/photo-stickers/elephant-walk.png',
      '/companions/photo-stickers/elephant-wave.png',
      '/companions/photo-stickers/elephant-jump.png',
      '/companions/photo-stickers/elephant-sit.png',
    ],
    giraffe: [
      '/companions/photo-stickers/giraffe-walk.png',
      '/companions/photo-stickers/giraffe-wave.png',
      '/companions/photo-stickers/giraffe-jump.png',
      '/companions/photo-stickers/giraffe-sit.png',
    ],
    tiger: [
      '/companions/photo-stickers/tiger-walk.png',
      '/companions/photo-stickers/tiger-wave.png',
      '/companions/photo-stickers/tiger-jump.png',
      '/companions/photo-stickers/tiger-sit.png',
    ],
    gorilla: [
      '/companions/photo-stickers/gorilla-walk.png',
      '/companions/photo-stickers/gorilla-wave.png',
      '/companions/photo-stickers/gorilla-jump.png',
      '/companions/photo-stickers/gorilla-sit.png',
    ],
    koala: [
      '/companions/photo-stickers/koala-walk.png',
      '/companions/photo-stickers/koala-wave.png',
      '/companions/photo-stickers/koala-jump.png',
      '/companions/photo-stickers/koala-sit.png',
    ],
  }
  return stickerSets[currentCompanion.value.id] ?? [currentCompanion.value.chatCharacterImage]
})
const restroomRequest = shallowRef(false)
const destinationRequest = shallowRef<{ text: string, kind: 'restaurant' | 'animal' | 'train' } | null>(null)
const activeDestination = shallowRef<ParkNavigationTarget | null>(null)
const activeRestroom = shallowRef<ParkService | null>(null)
const activeNavigation = shallowRef<ParkNavigationRoute | null>(null)
let showReminderTimer: ReturnType<typeof setInterval> | undefined
type ParkLandmark = (typeof parkLiveLandmarks)[number]
const selectedService = shallowRef<ParkService | null>(null)
const selectedLandmark = shallowRef<ParkLandmark | null>(null)
const gatePositions = {
  south: { ...parkMapPoints.entrance },
  // Northern gate / train interchange coordinate from the surveyed park POIs.
  north: { x: 585, y: 420, longitude: 113.310704, latitude: 23.009179 },
} as const
const trainDropoffPosition = {
  longitude: 113.308861,
  latitude: 23.008988,
  x: Number(((113.308861 - parkMapMeta.bounds.minLon) / (parkMapMeta.bounds.maxLon - parkMapMeta.bounds.minLon) * 100).toFixed(2)),
  y: Number(((parkMapMeta.bounds.maxLat - 23.008988) / (parkMapMeta.bounds.maxLat - parkMapMeta.bounds.minLat) * 100).toFixed(2)),
}
// Before a route is created, start the visitor at Chimelong Safari Park's north gate.
const demoPosition = reactive({ ...gatePositions.north })

watch(() => props.plan, (plan) => {
  if (!plan) return
  Object.assign(demoPosition, plan.entryGate === 'north' && plan.takeNorthGateTrain ? trainDropoffPosition : gatePositions[plan.entryGate])
}, { immediate: true })
function pickupPoint(id: string, name: string, detail: string, x: number, y: number): ParkService {
  return {
    id,
    kind: 'service',
    serviceKind: 'retail',
    name,
    detail,
    aliases: ['周边领取', '纪念品', '线上订单', '自提'],
    source: 'demo',
    x: x / 10,
    y: y / 9.51,
    longitude: parkMapMeta.bounds.minLon + (x / parkMapMeta.viewWidth) * (parkMapMeta.bounds.maxLon - parkMapMeta.bounds.minLon),
    latitude: parkMapMeta.bounds.maxLat - (y / parkMapMeta.viewHeight) * (parkMapMeta.bounds.maxLat - parkMapMeta.bounds.minLat),
  }
}
const merchPickupPoints: ParkService[] = [
  pickupPoint('service-merch-pickup-south', '南门周边领取点', '南门出口服务区 · 线上订单自提', 950.2, 852.2),
  pickupPoint('service-merch-pickup-north', '北门周边领取点', '北门停车场入口 · 线上订单自提', 523.6, 40.3),
]
const mapServices = [...parkServices, ...merchPickupPoints]
const merchPickupRoutes = computed(() => merchPickupPoints.flatMap((service) => {
  try { return [{ service, route: navigationRouteFromPosition(demoPosition, service) }] }
  catch { return [] }
}))
const showTimes = ['10:30', '13:00', '15:30']
const diningTestServices = parkServices.filter(service => service.serviceKind === 'dining')
const restaurantMenuData: Record<string, {
  childMeal: string
  allergyNotice: string
  dishes: Array<{ name: string, price: string, allergens: string }>
}> = {
  'service-dining-panda': {
    childMeal: '提供儿童餐，可选少盐、少油和小份主食。',
    allergyNotice: '下单前请主动告知工作人员；厨房同时处理含麸质、蛋、奶和坚果的食材。',
    dishes: [
      { name: '熊猫竹香鸡肉饭', price: '¥48', allergens: '含麸质、大豆' },
      { name: '儿童蔬菜肉丸餐', price: '¥38', allergens: '含蛋、奶' },
      { name: '竹叶青团甜品', price: '¥22', allergens: '含乳制品、糯米' },
    ],
  },
  'service-dining-koala': {
    childMeal: '提供儿童套餐和不辣选项，可分装为小份。',
    allergyNotice: '摊位食材不同，请逐个确认；部分小吃含花生、芝麻、海鲜和麸质。',
    dishes: [
      { name: '考拉牛肉卷', price: '¥36', allergens: '含麸质、奶' },
      { name: '亲子迷你披萨', price: '¥42', allergens: '含麸质、奶' },
      { name: '鲜果酸奶杯', price: '¥25', allergens: '含乳制品' },
    ],
  },
  'service-dining-birds': {
    childMeal: '提供儿童餐具，可将主食制作成小份。',
    allergyNotice: '部分菜品含蛋、奶、坚果及甲壳类食材，严重过敏游客请先咨询工作人员。',
    dishes: [
      { name: '飞禽缤纷鸡肉面', price: '¥46', allergens: '含麸质、蛋' },
      { name: '儿童玉米鸡肉饭', price: '¥36', allergens: '含大豆' },
      { name: '鹦鹉彩虹果杯', price: '¥24', allergens: '可能含坚果' },
    ],
  },
}
const diningMenu = computed(() => diningOffer.value ? restaurantMenuData[diningOffer.value.id] ?? null : null)

function simulatedNow() {
  const now = new Date()
  if (testTime.value === 'real') return now
  const [hours, minutes] = testTime.value.split(':').map(Number)
  now.setHours(hours!, minutes!, 0, 0)
  return now
}

function applyTestTime() {
  announcedShows.clear()
  checkShowReminders()
}

function applyTestZone() {
  const zone = props.animals.find(item => item.id === testZoneId.value)
  const dining = diningTestServices.find(item => item.id === testZoneId.value)
  const location = zone ?? dining
  if (!location) return
  Object.assign(demoPosition, { longitude: location.longitude, latitude: location.latitude, x: location.x, y: location.y })
  activeNavigation.value = null
  activeDestination.value = null
  activeRestroom.value = null
  if (zone) {
    const companion = props.companions.find(item => item.id === zone.id)
    diningOffer.value = null
    merchOffer.value = null
    unlockOffer.value = null
    learningZoneId.value = null
    scienceAnswer.value = null
    if (companion) {
      localMessages.value.push({
        id: `${Date.now()}-test-zone`,
        type: 'test-location',
        location: { kind: 'animal', zone, companion },
        createdAt: nextPriorityTimestamp(),
      })
    }
    void scrollToLatest()
    return
  }
  unlockOffer.value = null
  learningZoneId.value = null
  scienceAnswer.value = null
  diningOffer.value = null
  if (dining) {
    localMessages.value.push({
      id: `${Date.now()}-test-dining`,
      type: 'test-location',
      location: { kind: 'dining', service: dining },
      createdAt: nextPriorityTimestamp(),
    })
    void scrollToLatest()
  }
}

function unlockTestLocation(message: PriorityTimelineItem) {
  if (message.type !== 'test-location' || message.location.kind !== 'animal') return
  message.location.unlocked = true
  activeCompanion.value = message.location.companion
  agentUnlocks.unlock(message.location.companion.id)
  void scrollToLatest()
}

function answerTestLocationScience(message: PriorityTimelineItem, choice: string) {
  if (message.type !== 'test-location' || message.location.kind !== 'animal') return
  message.location.scienceAnswer = choice
  fieldObservations.complete(message.location.zone.id)
}

function addTestMerchToBag(companion: Companion) {
  const stock = operationsState.value?.merchStock[companion.id] ?? 1
  if (stock <= 0 || merchBagIds.value.includes(companion.id)) return
  merchBag.add(companion.id)
  void scrollToLatest()
}

function simulateLeavingPark() {
  testPanelOpen.value = false
  localMessages.value.push({ id: `${Date.now()}-posttrip`, type: 'posttrip', createdAt: nextPriorityTimestamp() })
  void scrollToLatest()
}

function checkShowReminders() {
  // A reminder only makes sense after the visitor has completed the planning flow.
  // Without a plan, it otherwise appears before any preferences have been selected.
  if (!props.plan) return
  const venue = parkServices.find(service => service.serviceKind === 'show')
  if (!venue) return
  const now = new Date()
  const reminders = dueShowReminders({
    parkActivated: Boolean(arrivalMessage.value),
    now,
    venueId: venue.id,
    showTimes,
    announcedKeys: announcedShows,
  })
  for (const { key, startLabel } of reminders) {
    try {
      localMessages.value.push({ id: `show-${key}`, type: 'show-reminder', service: venue, route: navigationRouteFromPosition(demoPosition, venue), startLabel, createdAt: nextPriorityTimestamp(now.getTime()) })
      announcedShows.add(key)
      void scrollToLatest()
    }
    catch { /* the message can safely wait for the next location update */ }
  }
}

function startShowReminderTimer() {
  if (showReminderTimer || !arrivalMessage.value) return
  checkShowReminders()
  showReminderTimer = setInterval(checkShowReminders, 30_000)
}

function stopShowReminderTimer() {
  if (!showReminderTimer) return
  clearInterval(showReminderTimer)
  showReminderTimer = undefined
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
const medicalChoices = computed(() => parkServices
  .filter(service => service.serviceKind === 'medical')
  .map(service => ({ service, route: safeNavigationRoute(service) }))
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

function safeNavigationRoute(target: ParkNavigationTarget): ParkNavigationRoute {
  try {
    return navigationRouteFromPosition(demoPosition, target)
  }
  catch {
    // 少量 GIS 点位可能暂未接入完整步行图；仍需向游客返回可用的距离排序结果。
    const distanceMeters = Math.max(1, Math.round(haversineMeters(demoPosition, target) * 1.18))
    return {
      target,
      distanceMeters,
      walkingMinutes: walkingMinutes(distanceMeters),
      path: [projectGeoPoint(demoPosition), projectGeoPoint(target)],
      startedAt: new Date().toISOString(),
    }
  }
}

function buildDestinationChoices(request: { text: string, kind: 'restaurant' | 'animal' | 'train' }) {
  const normalized = request.text.replace(/我要去|带我去|我想|想吃|吃饭|吃点东西|吃东西|吃点|用餐|餐饮|餐厅|美食街|美食|饿了|饿|喝点|饮品|展区|附近|推荐|去哪|哪里|园/g, '')
  const query = request.kind === 'train' || (request.kind === 'restaurant' && !/熊猫|考拉|飞禽/.test(normalized)) ? '' : normalized
  const candidates: Array<{ target: ParkNavigationTarget, detail: string }> = request.kind === 'restaurant'
    ? parkServices.filter(service => service.serviceKind === 'dining').map(service => ({ target: service, detail: diningLabels[service.id] ?? service.name }))
    : request.kind === 'train'
      ? trainStations
      : props.animals.map(zone => ({ target: { id: zone.id, kind: 'animal' as const, name: zone.name, longitude: zone.longitude, latitude: zone.latitude }, detail: `${zone.name}展区` }))
  return candidates
    .filter(item => !query || item.detail.includes(query) || item.target.name.includes(query))
    .map(item => ({ ...item, route: safeNavigationRoute(item.target) }))
    .sort((a, b) => a.route.distanceMeters - b.route.distanceMeters)
}
const destinationChoices = computed(() => destinationRequest.value ? buildDestinationChoices(destinationRequest.value) : [])
const legacySearchMatches = computed(() => {
  const query = mapSearch.value.trim().toLowerCase()
  if (!query) return []
  return [...props.animals.map(item => ({ id: item.id, label: item.name, type: '动物展区', zone: item })), ...mapServices.map(item => ({ id: item.id, label: item.name, type: '园区服务', service: item }))]
    .filter(item => item.label.toLowerCase().includes(query)).slice(0, 5)
})
function selectLegacySearchMatch(match: { zone?: AnimalPoi, service?: ParkService }) {
  selectedZone.value = match.zone ?? null
  if (match.service) activeRestroom.value = match.service
  mapSearch.value = ''
}

type MapSearchMatch = {
  id: string
  label: string
  type: string
  keywords: string
  zone?: AnimalPoi
  service?: ParkService
  landmark?: ParkLandmark
}

const animalSearchAliases: Record<AnimalPoi['id'], string> = {
  panda: '熊猫 大熊猫 国宝 熊猫园',
  giraffe: '长颈鹿 长颈鹿园',
  gorilla: '黑猩猩 猩猩 大猩猩 猩猩园',
  tiger: '老虎 白虎 虎园',
  elephant: '大象 亚洲象 象园 亚洲象园',
  koala: '考拉 无尾熊 考拉园',
}

const searchMatches = computed(() => {
  const query = mapSearch.value.trim().toLowerCase()
  if (!query) return []
  const matches: MapSearchMatch[] = [
    ...props.animals.map(item => ({ id: `animal-${item.id}`, label: item.name, type: '动物展区', keywords: `${item.name} ${item.description}`, zone: item })),
    ...mapServices.map(item => ({ id: `service-${item.id}`, label: item.name, type: '园区服务', keywords: `${item.name} ${item.detail} ${item.aliases.join(' ')}`, service: item })),
    ...parkLiveLandmarks.map(item => ({ id: `landmark-${item.id}`, label: item.name, type: item.category || '园区兴趣点', keywords: `${item.name} ${item.category}`, landmark: item })),
  ]
  return matches.filter(item => item.keywords.toLowerCase().includes(query)
    || Boolean(item.zone && animalSearchAliases[item.zone.id].toLowerCase().includes(query))).slice(0, 8)
})

function selectSearchMatch(match: MapSearchMatch) {
  if (match.zone) selectZonePoi(match.zone)
  else if (match.service) selectServicePoi(match.service)
  else if (match.landmark) selectLandmarkPoi(match.landmark)
  mapSearch.value = ''
}

function selectFirstSearchMatch() {
  const match = searchMatches.value[0]
  if (match) selectSearchMatch(match)
}

function offerAnimalAgent(zone: AnimalPoi) {
  const companion = props.companions.find(item => item.id === zone.id)
  if (!companion) return
  unlockOffer.value = { zone, companion }
  localMessages.value.push({ id: `${Date.now()}-unlock`, type: 'message', role: 'assistant', text: `你已到达${zone.name}，解锁了 ${companion.name} 的动物 Agent。`, createdAt: simulatedNow().getTime() })
  void scrollToLatest()
}

function unlockAnimalAgent() {
  const offer = unlockOffer.value
  if (!offer) return
  activeCompanion.value = offer.companion
  agentUnlocks.unlock(offer.companion.id)
  merchOffer.value = offer.companion
  merchAdded.value = merchBagIds.value.includes(offer.companion.id)
  const experience = zoneExperienceConfigs[offer.zone.id]
  learningZoneId.value = offer.zone.id
  scienceAnswer.value = null
  localMessages.value.push({
    id: `${Date.now()}-switched`,
    type: 'message',
    role: 'assistant',
    text: `我是${offer.companion.name}，${offer.companion.species}。${offer.zone.description} ${experience.lifeHabits}`,
    createdAt: simulatedNow().getTime(),
  })
  unlockOffer.value = null
  void scrollToLatest()
}

function answerScienceQuestion(choice: string) {
  scienceAnswer.value = choice
  if (learningZoneId.value) fieldObservations.complete(learningZoneId.value)
}

function addMerchToBag() {
  if (!merchOffer.value || !currentMerch.value || merchAdded.value || merchSoldOut.value) return
  merchBag.add(merchOffer.value.id)
  merchAdded.value = true
  localMessages.value.push({
    id: `${Date.now()}-merch`,
    type: 'message',
    role: 'assistant',
    text: `${currentMerch.value.name}已加入纪念袋。演示版本暂不付款，正式上线后可选择园区自提或快递到家。`,
    createdAt: simulatedNow().getTime(),
  })
  void scrollToLatest()
}

async function submitMerchOrder() {
  if (!merchBagIds.value.length || merchOrdering.value) return
  merchOrdering.value = true
  try {
    const orderedCount = merchBagIds.value.length
    operationsState.value = await $fetch<OperationsState>('/api/admin/order', {
      method: 'POST',
      body: { ids: [...merchBagIds.value] },
    })
    merchBag.clear()
    merchAdded.value = false
    merchBagOpen.value = false
    localMessages.value.push({
      id: `${Date.now()}-merch-order`,
      type: 'message',
      role: 'assistant',
      text: `下单成功，共 ${orderedCount} 件。纪念礼品已经为你预留，请前往园区周边领取点领取。`,
      actions: merchPickupRoutes.value.map(({ service }) => ({
        id: `pickup-${service.id}`,
        label: `导航至${service.name}`,
        type: 'select-pickup' as const,
        payload: { serviceId: service.id },
        variant: 'primary' as const,
      })),
      createdAt: simulatedNow().getTime(),
    })
    void scrollToLatest()
  }
  catch {
    localMessages.value.push({
      id: `${Date.now()}-merch-order-error`,
      type: 'message',
      role: 'assistant',
      text: '下单没有完成，可能有商品已经售罄，请刷新库存后重试。',
      createdAt: simulatedNow().getTime(),
    })
  }
  finally {
    merchOrdering.value = false
  }
}

function showRestaurantMenuFromChat(text: string) {
  if (!/菜单|菜品|有什么菜|有什么吃|儿童餐|过敏原|忌口/.test(text)) return false
  const venue = diningTestServices.find((service) => {
    if (text.includes('熊猫')) return service.id === 'service-dining-panda'
    if (text.includes('考拉') || text.includes('小吃街') || text.includes('食街')) return service.id === 'service-dining-koala'
    if (text.includes('飞禽') || text.includes('鸟')) return service.id === 'service-dining-birds'
    return text.includes(service.name)
  })
  if (!venue) return false
  diningOffer.value = venue
  destinationRequest.value = null
  localMessages.value.push({
    id: `${Date.now()}-menu-answer`,
    type: 'message',
    role: 'assistant',
    text: `这是${venue.name}的演示菜单。我也标出了儿童餐和主要过敏原，正式供应请以餐厅当天公示为准。`,
    createdAt: simulatedNow().getTime(),
  })
  void scrollToLatest()
  return true
}

async function sendChat(presetText?: string) {
  const text = (presetText ?? composerText.value).trim()
  if (!text) return
  composerText.value = ''
  // A destination card belongs to the question that created it; don't leave it under later chat replies.
  restroomRequest.value = false
  destinationRequest.value = null
  diningOffer.value = null
  localMessages.value.push({ id: `${Date.now()}-u`, type: 'message', role: 'user', text, createdAt: simulatedNow().getTime() })
  void scrollToLatest()
  if (showRestaurantMenuFromChat(text)) return
  if (/我(?:到|进)(?:了|啦)|到园(?:了|啦)?|进园(?:了|啦)?|已经到(?:了|啦)/.test(text)) {
    emit('arrive')
    return
  }
  if (/厕所|洗手间|卫生间/.test(text)) {
    localMessages.value.push({ id: `${Date.now()}-restroom-results`, type: 'restroom-results', choices: [...restroomChoices.value], createdAt: simulatedNow().getTime() + 1000 })
    toolsOpen.value = false
    void scrollToLatest()
  }
  else if (/腿部受伤|腿受伤|腿疼|扭伤|摔伤|受伤|不舒服|需要医务|医务室|医疗/.test(text)) {
    localMessages.value.push({ id: `${Date.now()}-medical-results`, type: 'medical-results', choices: [...medicalChoices.value], createdAt: simulatedNow().getTime() + 1000 })
    toolsOpen.value = false
    void scrollToLatest()
  }
  else if (/小火车|观光车|环线车/.test(text)) {
    localMessages.value.push({ id: `${Date.now()}-train-results`, type: 'destination-results', kind: 'train', choices: buildDestinationChoices({ text, kind: 'train' }), createdAt: simulatedNow().getTime() + 1000 })
    void scrollToLatest()
  }
  else if (/餐厅|吃饭|用餐|餐饮|吃东西|吃点|吃的|好吃|食物|美食|饿了|饿|喝点|饮品/.test(text)) {
    localMessages.value.push({ id: `${Date.now()}-restaurant-results`, type: 'destination-results', kind: 'restaurant', choices: buildDestinationChoices({ text, kind: 'restaurant' }), createdAt: simulatedNow().getTime() + 1000 })
    void scrollToLatest()
  }
  else if (/展区|长颈鹿|熊猫|考拉|大象|老虎|虎园|虎区|黑猩猩/.test(text)) {
    localMessages.value.push({ id: `${Date.now()}-animal-results`, type: 'destination-results', kind: 'animal', choices: buildDestinationChoices({ text, kind: 'animal' }), createdAt: simulatedNow().getTime() + 1000 })
    void scrollToLatest()
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
      localMessages.value.push({ id: `${Date.now()}-a`, type: 'message', role: 'assistant', text: response.reply, createdAt: simulatedNow().getTime() })
      if (response.navigationTarget) {
        activeDestination.value = response.navigationTarget
        activeNavigation.value = navigationRouteFromPosition(demoPosition, response.navigationTarget)
      }
      void scrollToLatest()
    }
    catch {
      localMessages.value.push({ id: `${Date.now()}-a`, type: 'message', role: 'assistant', text: '我收到了。网络暂时不稳定，但我会继续为你保留这条请求。', createdAt: simulatedNow().getTime() })
    }
  }
}

function sendQuickPrompt(text: string) {
  void sendChat(text)
}

async function submitLostChildReport() {
  if (!canSubmitLostChild.value) return
  const report = {
    name: lostChildForm.name.trim(),
    appearance: lostChildForm.appearance.trim(),
    location: lostChildForm.location.trim(),
    guardianPhone: lostChildForm.guardianPhone.trim(),
  }
  const createdAt = simulatedNow().getTime()
  lostChildSubmitting.value = true
  try {
    await $fetch('/api/admin/lost-child', { method: 'POST', body: report })
    localMessages.value.push(
      { id: `${Date.now()}-lost-child-user`, type: 'message', role: 'user', text: `儿童走失播报：${report.name}；样貌特征：${report.appearance}；走失地点：${report.location}`, createdAt },
      { id: `${Date.now()}-lost-child-agent`, type: 'message', role: 'assistant', text: '走失信息已上传至园区运营后台，工作人员可立即查看并更新协查状态。请留在原地或前往最近的工作人员服务点，并保持电话畅通。', createdAt },
    )
    lostChildOpen.value = false
    lostChildForm.name = ''
    lostChildForm.appearance = ''
    lostChildForm.location = ''
    lostChildForm.guardianPhone = ''
  }
  catch {
    localMessages.value.push({ id: `${Date.now()}-lost-child-error`, type: 'message', role: 'assistant', text: '信息暂时未能上传，请立即联系附近工作人员或拨打 110。', createdAt })
  }
  finally { lostChildSubmitting.value = false }
  void scrollToLatest()
}

function navigateToRestroom(choice: { service: ParkService, route: ParkNavigationRoute }) {
  diningOffer.value = null
  activeRestroom.value = choice.service
  activeDestination.value = choice.service
  activeNavigation.value = choice.route
  selectedZone.value = null
  mapOpen.value = true
}

function navigateToMedical(choice: { service: ParkService, route: ParkNavigationRoute }) {
  diningOffer.value = null
  activeDestination.value = choice.service
  activeRestroom.value = null
  activeNavigation.value = choice.route
  selectedZone.value = null
  mapOpen.value = true
}

function navigateToDestination(choice: { target: ParkNavigationTarget, route: ParkNavigationRoute }) {
  diningOffer.value = null
  activeDestination.value = choice.target
  activeRestroom.value = null
  activeNavigation.value = choice.route
  selectedZone.value = null
  mapOpen.value = true
}

function navigateToShowReminder(reminder: Extract<LocalTimelineItem, { type: 'show-reminder' }>) {
  diningOffer.value = null
  activeDestination.value = reminder.service
  activeRestroom.value = null
  activeNavigation.value = reminder.route
  selectedZone.value = null
  mapOpen.value = true
}

function navigateToMerchPickup(choice: { service: ParkService, route: ParkNavigationRoute }) {
  diningOffer.value = null
  activeDestination.value = choice.service
  activeRestroom.value = null
  activeNavigation.value = choice.route
  selectedZone.value = null
  merchBagOpen.value = false
  mapOpen.value = true
}

/** 聊天里的按钮全部通过这里落到地图、菜单、计划或现场任务。 */
function executeChatAction(action: ChatAction) {
  if (action.type === 'view-map') {
    mapOpen.value = true
    return
  }
  if (action.type === 'show-schedule') {
    checkShowReminders()
    localMessages.value.push({
      id: `${Date.now()}-schedule-action`, type: 'message', role: 'assistant',
      text: '下一场演出信息已为你整理好；开演前 30 分钟，团团会再结合你的位置提醒你出发。',
      actions: [{ id: 'view-map', label: '查看剧场路线', type: 'view-map', variant: 'primary' }],
      reminder: { type: 'show', reason: '演出提醒会按开演时间与步行时长触发，避免你太早等候或错过开场。' },
      createdAt: simulatedNow().getTime(),
    })
    void scrollToLatest()
    return
  }
  if (action.type === 'view-menu') {
    const venue = diningTestServices.find(service => service.id === action.payload?.serviceId) ?? diningTestServices[0]
    if (venue) {
      diningOffer.value = venue
      localMessages.value.push({
        id: `${Date.now()}-menu-action`, type: 'message', role: 'assistant',
        text: `${venue.name}的儿童餐、主要过敏原和菜品已为你展开。`,
        actions: [{ id: `go-${venue.id}`, label: '现在出发', type: 'navigate', payload: { serviceId: venue.id }, variant: 'primary' }],
        reminder: { type: 'dining', reason: '这里提供儿童餐，并可优先推荐当前排队较短的选择。' },
        createdAt: simulatedNow().getTime(),
      })
    }
    void scrollToLatest()
    return
  }
  if (action.type === 'navigate' || action.type === 'select-pickup') {
    const service = mapServices.find(item => item.id === action.payload?.serviceId)
    if (service) navigateToDestination({ target: service, route: navigationRouteFromPosition(demoPosition, service) })
    else mapOpen.value = true
    return
  }
  if (action.type === 'start-observation' || action.type === 'answer-quiz') {
    const zone = props.animals.find(item => item.id === action.payload?.zoneId)
    if (zone) offerAnimalAgent(zone)
    return
  }
  if (action.type === 'view-merch') {
    const nextCompanion = props.companions.find(item => item.id === action.payload?.companionId) ?? currentCompanion.value
    merchOffer.value = nextCompanion
    merchAdded.value = merchBagIds.value.includes(nextCompanion.id)
    void scrollToLatest()
    return
  }
  if (action.type === 'add-plan') {
    localMessages.value.push({
      id: `${Date.now()}-plan-action`, type: 'message', role: 'assistant',
      text: '已加入今日计划。入园后团团会根据实时位置和排队情况继续调整建议。',
      actions: [{ id: 'view-map', label: '查看路线', type: 'view-map', variant: 'primary' }],
      createdAt: simulatedNow().getTime(),
    })
    void scrollToLatest()
  }
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

function closeMap() {
  // 地图是底部一级入口时保持为独立页面，只能通过底部导航切换离开。
  if (route.query.tab === 'map') return
  mapOpen.value = false
}

function reactToChoice() {
  reactionKey.value += 1
}

function capturePhoto() { photoInput.value?.click() }
function attachPhoto(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  photoSourceFile.value = file
  photoComposerOpen.value = true
  toolsOpen.value = false
  ;(event.target as HTMLInputElement).value = ''
}
function closePhotoComposer() {
  photoComposerOpen.value = false
  photoSourceFile.value = null
}
function sendCompositePhoto(image: string, usedAi: boolean) {
  const companion = currentCompanion.value
  const positiveReplies: Record<Companion['id'], string> = {
    panda: '拍得真棒！我是熊猫伙伴团团，也成功和你同框啦。这张合照很有旅行故事感，我要帮你把这份开心好好收藏起来。',
    tiger: '太有探险队的气势了！我是老虎伙伴凯凯，很高兴加入你的合照。今天的虎园观察之旅又多了一份特别纪念。',
    koala: '这张合照好温暖呀！我是考拉伙伴悠米，已经把它收进慢游回忆里，看到照片就会想起今天的相遇。',
    elephant: '合照完成得很棒！我是大象伙伴潺潺，也来和你同框了。这会是一张很有纪念意义的园区照片。',
    giraffe: '视角和氛围都很棒！我是长颈鹿伙伴长乐，很开心能加入你的照片，这一刻值得收藏。',
    gorilla: '拍得真不错！我是黑猩猩伙伴阿悟，已经加入合照，这张照片很有森林探险伙伴的感觉。',
  }
  localMessages.value.push({
    id: `${Date.now()}-agent-photo`,
    type: 'photo',
    dataUrl: image,
    agentName: companion.name,
    usedAi,
    createdAt: simulatedNow().getTime(),
  })
  localMessages.value.push({
    id: `${Date.now()}-agent-photo-reply`,
    type: 'message',
    role: 'assistant',
    text: positiveReplies[companion.id],
    agentName: companion.name,
    createdAt: simulatedNow().getTime() + 1000,
  })
  closePhotoComposer()
  void scrollToLatest()
}
const zoneInfo = computed(() => {
  const zone = selectedZone.value
  if (!zone) return null
  const copy: Record<string, string> = {
    panda: '在安静的竹影间，跟着团团观察熊猫用爪子抱住竹竿的细节。', tiger: '凯凯会带你认识白虎的领地习性，请保持安静，把观察留给眼睛。', koala: '悠米喜欢慢一点的节奏，抬头看看考拉如何在树杈间舒展身体。', elephant: '大象展区适合慢慢看：耳朵、鼻子与脚步都是交流的线索。', giraffe: '长颈鹿会用长舌卷取枝叶，留意它们取食时的耐心动作。', gorilla: '黑猩猩展区的群体互动很丰富，请和团团一起安静观察。',
  }
  return { ...zone, description: copy[zone.id] ?? zone.description }
})
const zoneHeat = computed(() => selectedZone.value ? operationsState.value?.zones[selectedZone.value.id]?.heat ?? 50 : 0)
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
    detail: isShow ? '建议提前到场，现场以当日节目单为准。' : `${landmark.category}地点，可在地图中查看位置与路线。`,
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
  const area = chatScrollArea.value
  if (!area) return
  area.scrollTo({ top: area.scrollHeight, behavior })
}

onMounted(() => void scrollToLatest('auto'))
onMounted(() => startShowReminderTimer())

watch(arrivalMessage, (message) => {
  if (!message) {
    stopShowReminderTimer()
    return
  }
  if (!localMessages.value.some(item => item.id === 'park-arrival-map')) {
    localMessages.value.push(
      { id: 'park-arrival-map', type: 'map', createdAt: Date.now() },
      { id: 'park-arrival-welcome', type: 'message', role: 'assistant', text: message.text, createdAt: Date.now() },
    )
  }
  if (import.meta.client) startShowReminderTimer()
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
      <div class="header-actions">
        <button class="test-button" type="button" @click="testPanelOpen = !testPanelOpen">测试</button>
        <button class="reset-button" type="button" @click="emit('reset')">重选</button>
      </div>
      <div v-if="testPanelOpen" class="test-panel">
        <label>
          <span>模拟时间</span>
          <select v-model="testTime" @change="applyTestTime">
            <option value="real">跟随真实时间</option>
            <option value="10:00">10:00 · 10:30 演出提醒</option>
            <option value="12:30">12:30 · 13:00 演出提醒</option>
            <option value="15:00">15:00 · 15:30 演出提醒</option>
          </select>
        </label>
        <label>
          <span>模拟地点</span>
          <select v-model="testZoneId" @change="applyTestZone">
            <option value="" disabled>选择当前所在展区</option>
            <optgroup label="动物展区">
              <option v-for="zone in animals" :key="zone.id" :value="zone.id">{{ zone.name }}</option>
            </optgroup>
            <optgroup label="餐厅与小吃街">
              <option v-for="service in diningTestServices" :key="service.id" :value="service.id">{{ service.name }}</option>
            </optgroup>
          </select>
        </label>
        <button class="leave-test-button" type="button" @click="simulateLeavingPark"><span>模拟状态</span><strong>用户准备离开园区</strong></button>
        <small>应用上线时以实际手机端时间和实时定位为准。</small>
      </div>
    </header>

    <div ref="chatScrollArea" class="chat-scroll-area">
    <div class="progress-row">
      <span><i :style="{ width: `${progress}%` }" /></span>
      <small>{{ stepIndex + 1 }}/7</small>
    </div>

    <DraggableCompanion :companion="currentCompanion" :reaction-key="reactionKey" :animal-state="animalState" />

    <div class="message-list" aria-live="polite">
      <div
        v-for="message in journeyMessages"
        :key="message.id"
        class="message-row"
        :class="message.role"
      >
        <span v-if="message.role === 'assistant'" class="message-avatar">{{ companion.name.slice(0, 1) }}</span>
        <div class="message-bubble">
          <p>{{ message.text }}</p>
          <TuantuanReminderCard v-if="message.reminder" :reminder="message.reminder" />
          <ChatActionButtons :actions="message.actions ?? []" @action="executeChatAction" />
          <small v-if="message.mode === 'deepseek'">DeepSeek生成</small>
        </div>
      </div>

      <template v-for="(message, messageIndex) in localMessages" :key="message.id">
        <time v-if="shouldShowTimelineTime(messageIndex)" class="timeline-time">{{ formatTimelineTime(message) }}</time>
        <button v-if="message.type === 'map' && plan" class="location-card" type="button" @click="mapOpen = true">
          <span class="location-pin">⌖</span>
          <span><small>{{ companion.name }}分享了一个位置</small><strong>{{ plan.title }}</strong><em>{{ plan.stops.length }} 个推荐地点 · 预计步行 {{ plan.walkingMeters }} 米</em></span>
          <b>查看地图 ›</b>
        </button>
        <div v-else-if="message.type === 'photo'" class="message-row user photo-message">
          <div class="message-bubble"><img :src="message.dataUrl" :alt="`与${message.agentName}的合照`"><small>{{ message.usedAi ? '人物轮廓已智能合成' : '团团合照' }}</small></div>
        </div>
        <div v-else-if="message.type === 'restroom-results'" class="message-row assistant restroom-answer">
          <span class="message-avatar">{{ currentCompanion.name.slice(0, 1) }}</span>
          <div class="message-bubble">
            <p>收到，我按你当前位置为你排好了附近洗手间。排队指数会随园区客流变化。</p>
            <button v-for="choice in message.choices" :key="`${message.id}-${choice.service.id}`" class="restroom-choice" type="button" @click="navigateToRestroom(choice)">
              <span class="restroom-icon">⌾</span>
              <span><strong>{{ restroomLabels[choice.service.id] ?? choice.service.name }}</strong><small>距你 {{ choice.route.distanceMeters }} 米 · 约 {{ choice.route.walkingMinutes }} 分钟</small></span>
              <b :class="{ busy: choice.queue >= 40 }">排队 {{ choice.queue }}%</b>
            </button>
          </div>
        </div>
        <div v-else-if="message.type === 'medical-results'" class="message-row assistant restroom-answer">
          <span class="message-avatar">医</span>
          <div class="message-bubble">
            <p>先别勉强走动，我按你当前位置找到了最近的医务服务点。点击卡片即可打开地图导航。</p>
            <button v-for="choice in message.choices" :key="`${message.id}-${choice.service.id}`" class="restroom-choice destination-choice" type="button" @click="navigateToMedical(choice)">
              <span class="restroom-icon">✚</span>
              <span><strong>{{ choice.service.name }}</strong><small>距你 {{ choice.route.distanceMeters }} 米 · 约 {{ choice.route.walkingMinutes }} 分钟</small></span>
              <b>开始导航</b>
            </button>
          </div>
        </div>
        <div v-else-if="message.type === 'destination-results'" class="message-row assistant restroom-answer">
          <span class="message-avatar">{{ currentCompanion.name.slice(0, 1) }}</span>
          <div class="message-bubble">
            <p>{{ message.kind === 'restaurant' ? '为你找到了附近餐厅，按步行距离排序。' : message.kind === 'train' ? '为你找到了附近小火车站，选一个站点后就开始导航。' : '为你找到了匹配展区，点一下就开始导航。' }}</p>
            <button v-for="choice in message.choices" :key="`${message.id}-${choice.target.id}`" class="restroom-choice destination-choice" type="button" @click="navigateToDestination(choice)">
              <span class="restroom-icon">{{ message.kind === 'restaurant' ? '⌑' : message.kind === 'train' ? '▣' : '◉' }}</span>
              <span><strong>{{ choice.detail }}</strong><small>距你 {{ choice.route.distanceMeters }} 米 · 约 {{ choice.route.walkingMinutes }} 分钟</small></span>
              <b>去这里</b>
            </button>
            <small v-if="!message.choices.length" class="no-destination">暂未匹配到目的地，试试输入完整名称。</small>
          </div>
        </div>
        <div v-else-if="message.type === 'show-reminder'" class="message-row assistant show-reminder">
          <span class="message-avatar">演</span>
          <div class="message-bubble">
            <p>演出提醒：{{ message.service.name }}将在 {{ message.startLabel }} 开始，距离开演约半小时。</p>
            <TuantuanReminderCard :reminder="{ type: 'show', reason: `距开演约 30 分钟，按你当前位置步行约 ${message.route.walkingMinutes} 分钟，现在准备最从容。` }" />
            <button class="show-route-card" type="button" @click="navigateToShowReminder(message)">
              <span>⌖</span><strong>{{ message.service.name }}</strong><em>距你 {{ message.route.distanceMeters }} 米 · 步行约 {{ message.route.walkingMinutes }} 分钟</em><b>查看路线</b>
            </button>
          </div>
        </div>
        <div v-else-if="message.type === 'test-location'" class="message-row assistant test-location-message">
          <span class="message-avatar">{{ message.location.kind === 'animal' ? message.location.companion.name.slice(0, 1) : '食' }}</span>
          <div class="message-bubble test-location-card">
            <small>模拟地点已更新</small>
            <strong>{{ message.location.kind === 'animal' ? message.location.zone.name : message.location.service.name }}</strong>
            <template v-if="message.location.kind === 'animal'">
              <p>你已到达{{ message.location.zone.name }}，发现了专属动物 Agent。确认后才会切换当前伙伴。</p>
              <p>{{ message.location.zone.description }}</p>
              <em>当前状态：{{ operationsState?.zones[message.location.zone.id]?.status ?? '营业中' }} · 火爆指数 {{ operationsState?.zones[message.location.zone.id]?.heat ?? 50 }}%</em>
              <button v-if="!message.location.unlocked" class="unlock-agent-button test-unlock-button" type="button" @click="unlockTestLocation(message)">
                <img :src="message.location.companion.selectionImage" :alt="message.location.companion.name">
                <span><small>新 Agent 待解锁</small><strong>解锁 {{ message.location.companion.name }}</strong><em>{{ message.location.companion.species }}</em></span>
                <b>启用</b>
              </button>
              <div v-else class="test-science-card">
                <small>动物科普问答</small>
                <strong>{{ zoneExperienceConfigs[message.location.zone.id].task.title }}</strong>
                <p>{{ zoneExperienceConfigs[message.location.zone.id].task.prompt }}</p>
                <button v-for="choice in zoneExperienceConfigs[message.location.zone.id].task.choices" :key="choice" type="button" :class="{ correct: message.location.scienceAnswer === choice && choice === zoneExperienceConfigs[message.location.zone.id].task.correctChoice, incorrect: message.location.scienceAnswer === choice && choice !== zoneExperienceConfigs[message.location.zone.id].task.correctChoice }" @click="answerTestLocationScience(message, choice)">{{ choice }}</button>
                <em v-if="message.location.scienceAnswer">{{ message.location.scienceAnswer === zoneExperienceConfigs[message.location.zone.id].task.correctChoice ? zoneExperienceConfigs[message.location.zone.id].task.successMessage : `再观察一下：${zoneExperienceConfigs[message.location.zone.id].task.correctChoice}` }}</em>
                <div class="test-merch-card">
                  <small>解锁专属购买机会</small>
                  <div><img :src="message.location.companion.selectionImage" :alt="merchCatalog[message.location.companion.id].name"><span><em>{{ merchCatalog[message.location.companion.id].badge }}</em><strong>{{ merchCatalog[message.location.companion.id].name }}</strong><p>{{ merchCatalog[message.location.companion.id].description }}</p></span><b>{{ (operationsState?.merchStock[message.location.companion.id] ?? 1) <= 0 ? '售罄' : merchCatalog[message.location.companion.id].price }}</b></div>
                  <button type="button" :disabled="(operationsState?.merchStock[message.location.companion.id] ?? 1) <= 0 || merchBagIds.includes(message.location.companion.id)" @click="addTestMerchToBag(message.location.companion)">{{ (operationsState?.merchStock[message.location.companion.id] ?? 1) <= 0 ? '已售罄' : merchBagIds.includes(message.location.companion.id) ? '已加入纪念袋' : '加入纪念袋' }}</button>
                </div>
              </div>
            </template>
            <template v-else>
              <p>你已到达{{ message.location.service.name }}，下面是该地点的菜单与用餐提示。</p>
              <p class="child-meal"><b>儿童餐：</b>{{ restaurantMenuData[message.location.service.id]?.childMeal ?? '可向现场工作人员咨询儿童餐。' }}</p>
              <p class="allergy-notice"><b>过敏原提醒：</b>{{ restaurantMenuData[message.location.service.id]?.allergyNotice ?? '下单前请向工作人员说明过敏情况。' }}</p>
              <div class="test-dish-list"><span v-for="dish in restaurantMenuData[message.location.service.id]?.dishes ?? []" :key="dish.name"><b>{{ dish.name }}</b><em>{{ dish.price }} · {{ dish.allergens }}</em></span></div>
            </template>
          </div>
        </div>
        <div v-else-if="message.type === 'posttrip'" class="message-row assistant posttrip-message">
          <span class="message-avatar">忆</span>
          <div class="message-bubble posttrip-entry-card"><small>游后回顾已生成</small><strong>把今天的奇遇，整理成一册回忆</strong><p>先回看路线、到访展区和伙伴总结；票根会作为最后的纪念品保存下来。</p><div><NuxtLink class="review-link" to="/posttrip?from=chat"><span>忆</span><em>查看今日回顾</em><b>从路线开始 ›</b></NuxtLink><NuxtLink to="/posttrip/tickets?from=chat"><span>票</span><em>票根收藏</em><b>最后领取 ›</b></NuxtLink></div></div>
        </div>
        <div v-else-if="message.type === 'message'" class="message-row" :class="message.role">
          <span v-if="message.role === 'assistant'" class="message-avatar">{{ (message.agentName ?? currentCompanion.name).slice(0, 1) }}</span>
          <div class="message-bubble">
            <p>{{ message.text }}</p>
            <TuantuanReminderCard v-if="message.reminder" :reminder="message.reminder" />
            <ChatActionButtons :actions="message.actions ?? []" @action="executeChatAction" />
          </div>
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

      <div v-if="merchOffer && currentMerch" class="message-row assistant merch-answer">
        <span class="message-avatar">{{ merchOffer.name.slice(0, 1) }}</span>
        <div class="merch-card">
          <small>解锁专属购买机会</small>
          <div class="merch-product">
            <div class="merch-image"><img :src="merchOffer.selectionImage" :alt="currentMerch.name"></div>
            <div><em>{{ currentMerch.badge }}</em><strong>{{ currentMerch.name }}</strong><p>{{ currentMerch.description }}</p></div>
            <b>{{ merchSoldOut ? '售罄' : currentMerch.price }}</b>
          </div>
          <div class="merch-actions">
            <button type="button" @click="merchOffer = null">暂时不要</button>
              <button class="primary" type="button" :disabled="merchAdded || merchSoldOut" @click="addMerchToBag">{{ merchSoldOut ? '已售罄' : merchAdded ? '已加入纪念袋' : '加入纪念袋' }}</button>
          </div>
        </div>
      </div>

      <div v-if="diningOffer && diningMenu" class="message-row assistant dining-answer">
        <span class="message-avatar">{{ currentCompanion.name.slice(0, 1) }}</span>
        <div class="dining-card">
          <small>餐厅菜单与用餐提示</small>
          <strong>{{ diningOffer.name }}</strong>
          <p class="child-meal"><b>儿童餐：</b>{{ diningMenu.childMeal }}</p>
          <p class="allergy-notice"><b>过敏原提醒：</b>{{ diningMenu.allergyNotice }}</p>
          <div class="dish-list">
            <article v-for="dish in diningMenu.dishes" :key="dish.name">
              <div class="dish-image-placeholder"><span>菜品图片</span></div>
              <div><strong>{{ dish.name }}</strong><small>{{ dish.allergens }}</small></div>
              <b>{{ dish.price }}</b>
            </article>
          </div>
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
      <template v-for="(priorityMessage, priorityIndex) in separatedPriorityMessages" :key="`priority-${priorityMessage.id}`">
        <time v-if="shouldShowPriorityTime(priorityIndex)" class="timeline-time">{{ formatTimelineTime(priorityMessage) }}</time>
        <div v-if="priorityMessage.type === 'show-reminder'" class="message-row assistant show-reminder">
          <span class="message-avatar">演</span>
          <div class="message-bubble">
            <p>演出提醒：{{ priorityMessage.service.name }}将在 {{ priorityMessage.startLabel }} 开始，距离开演约半小时。</p>
            <button class="show-route-card" type="button" @click="navigateToShowReminder(priorityMessage)">
              <span>⌖</span><strong>{{ priorityMessage.service.name }}</strong><em>距你 {{ priorityMessage.route.distanceMeters }} 米 · 步行约 {{ priorityMessage.route.walkingMinutes }} 分钟</em><b>查看路线</b>
            </button>
          </div>
        </div>
        <div v-else-if="priorityMessage.type === 'test-location'" class="message-row assistant test-location-message">
          <span class="message-avatar">{{ priorityMessage.location.kind === 'animal' ? priorityMessage.location.companion.name.slice(0, 1) : '食' }}</span>
          <div class="message-bubble test-location-card">
            <small>模拟地点已更新</small>
            <strong>{{ priorityMessage.location.kind === 'animal' ? priorityMessage.location.zone.name : priorityMessage.location.service.name }}</strong>
            <template v-if="priorityMessage.location.kind === 'animal'">
              <p>你已到达{{ priorityMessage.location.zone.name }}，发现了专属动物 Agent。确认后才会切换当前伙伴。</p>
              <p>{{ priorityMessage.location.zone.description }}</p>
              <em>当前状态：{{ operationsState?.zones[priorityMessage.location.zone.id]?.status ?? '营业中' }} · 火爆指数 {{ operationsState?.zones[priorityMessage.location.zone.id]?.heat ?? 50 }}%</em>
              <button v-if="!priorityMessage.location.unlocked" class="unlock-agent-button test-unlock-button" type="button" @click="unlockTestLocation(priorityMessage)">
                <img :src="priorityMessage.location.companion.selectionImage" :alt="priorityMessage.location.companion.name">
                <span><small>新 Agent 待解锁</small><strong>解锁 {{ priorityMessage.location.companion.name }}</strong><em>{{ priorityMessage.location.companion.species }}</em></span>
                <b>启用</b>
              </button>
              <div v-else class="test-science-card">
                <small>动物科普问答</small>
                <strong>{{ zoneExperienceConfigs[priorityMessage.location.zone.id].task.title }}</strong>
                <p>{{ zoneExperienceConfigs[priorityMessage.location.zone.id].task.prompt }}</p>
                <button
                  v-for="choice in zoneExperienceConfigs[priorityMessage.location.zone.id].task.choices"
                  :key="choice"
                  type="button"
                  :class="{ correct: priorityMessage.location.scienceAnswer === choice && choice === zoneExperienceConfigs[priorityMessage.location.zone.id].task.correctChoice, incorrect: priorityMessage.location.scienceAnswer === choice && choice !== zoneExperienceConfigs[priorityMessage.location.zone.id].task.correctChoice }"
                  @click="answerTestLocationScience(priorityMessage, choice)"
                >{{ choice }}</button>
                <em v-if="priorityMessage.location.scienceAnswer">{{ priorityMessage.location.scienceAnswer === zoneExperienceConfigs[priorityMessage.location.zone.id].task.correctChoice ? zoneExperienceConfigs[priorityMessage.location.zone.id].task.successMessage : `再观察一下：${zoneExperienceConfigs[priorityMessage.location.zone.id].task.correctChoice}` }}</em>
                <div class="test-merch-card">
                  <small>解锁专属购买机会</small>
                  <div>
                    <img :src="priorityMessage.location.companion.selectionImage" :alt="merchCatalog[priorityMessage.location.companion.id].name">
                    <span><em>{{ merchCatalog[priorityMessage.location.companion.id].badge }}</em><strong>{{ merchCatalog[priorityMessage.location.companion.id].name }}</strong><p>{{ merchCatalog[priorityMessage.location.companion.id].description }}</p></span>
                    <b>{{ (operationsState?.merchStock[priorityMessage.location.companion.id] ?? 1) <= 0 ? '售罄' : merchCatalog[priorityMessage.location.companion.id].price }}</b>
                  </div>
                  <button
                    type="button"
                    :disabled="(operationsState?.merchStock[priorityMessage.location.companion.id] ?? 1) <= 0 || merchBagIds.includes(priorityMessage.location.companion.id)"
                    @click="addTestMerchToBag(priorityMessage.location.companion)"
                  >{{ (operationsState?.merchStock[priorityMessage.location.companion.id] ?? 1) <= 0 ? '已售罄' : merchBagIds.includes(priorityMessage.location.companion.id) ? '已加入纪念袋' : '加入纪念袋' }}</button>
                </div>
              </div>
            </template>
            <template v-else>
              <p>你已到达{{ priorityMessage.location.service.name }}，下面是该地点的菜单与用餐提示。</p>
              <p class="child-meal"><b>儿童餐：</b>{{ restaurantMenuData[priorityMessage.location.service.id]?.childMeal ?? '可向现场工作人员咨询儿童餐。' }}</p>
              <p class="allergy-notice"><b>过敏原提醒：</b>{{ restaurantMenuData[priorityMessage.location.service.id]?.allergyNotice ?? '下单前请向工作人员说明过敏情况。' }}</p>
              <div class="test-dish-list">
                <span v-for="dish in restaurantMenuData[priorityMessage.location.service.id]?.dishes ?? []" :key="dish.name"><b>{{ dish.name }}</b><em>{{ dish.price }} · {{ dish.allergens }}</em></span>
              </div>
            </template>
          </div>
        </div>
        <div v-else class="message-row assistant posttrip-message">
          <span class="message-avatar">忆</span>
          <div class="message-bubble posttrip-entry-card">
            <small>游后回顾已生成</small>
            <strong>把今天的奇遇，整理成一册回忆</strong>
            <p>先回看路线、到访展区和伙伴总结；票根会作为最后的纪念品保存下来。</p>
            <div><NuxtLink class="review-link" to="/posttrip?from=chat"><span>忆</span><em>查看今日回顾</em><b>从路线开始 ›</b></NuxtLink><NuxtLink to="/posttrip/tickets?from=chat"><span>票</span><em>票根收藏</em><b>最后领取 ›</b></NuxtLink></div>
          </div>
        </div>
      </template>
    </div>

    <p v-if="errorMessage" class="chat-error">{{ errorMessage }}</p>
    </div>

    <div v-if="!plan && route.query.tab !== 'map'" class="answer-dock">
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
    <div v-else-if="plan && route.query.tab !== 'map' && !mapOpen" class="wechat-dock">
      <input ref="photoInput" class="photo-input" type="file" accept="image/*" capture="environment" @change="attachPhoto">
      <button class="photo-creation-card" type="button" @click="capturePhoto"><i>✦</i><span><strong>和{{ currentCompanion.name }}创作一张照片</strong><small>上传后可选择合影、贴纸和 AI 风格</small></span><b>打开</b></button>
      <div class="quick-prompts" aria-label="快捷提问">
        <button type="button" @click="sendQuickPrompt('我要去厕所')">我要去厕所</button>
        <button type="button" @click="sendQuickPrompt('离我最近的餐厅在哪')">离我最近的餐厅在哪</button>
        <button type="button" @click="sendQuickPrompt('我要去虎园')">我要去虎园</button>
        <button class="emergency-prompt" type="button" @click="lostChildOpen = true">儿童走失播报</button>
      </div>
      <div class="composer-row">
        <input v-model="composerText" placeholder="和团团说点什么…">
        <button type="button">☺</button>
        <button class="plus-button" type="button" @click="toolsOpen = !toolsOpen">＋</button>
      </div>
      <div v-if="toolsOpen" class="tool-grid">
        <button type="button" @click="navigateTo('/inpark/ar')"><i>AR</i><span>实景奇遇</span></button>
        <button type="button" @click="merchBagOpen = true; toolsOpen = false"><i>袋</i><span>纪念袋<b v-if="merchBagIds.length">{{ merchBagIds.length }}</b></span></button>
      </div>
    </div>

    <Transition name="map-drop">
      <div v-if="merchBagOpen" class="bag-backdrop" @click.self="merchBagOpen = false">
        <section class="merch-bag-sheet" role="dialog" aria-modal="true" aria-label="纪念袋">
          <header><div><small>CHIMELONG MEMORY BAG</small><strong>我的纪念袋</strong></div><button type="button" aria-label="关闭" @click="merchBagOpen = false">×</button></header>
          <div v-if="merchBagItems.length" class="bag-items">
            <article v-for="item in merchBagItems" :key="item.companion.id">
              <img :src="item.companion.selectionImage" :alt="item.product.name">
              <div><small>{{ item.product.badge }}</small><strong>{{ item.product.name }}</strong><span>{{ item.companion.name }} Agent 专属</span></div>
              <b>{{ item.product.price }}</b>
            </article>
          </div>
          <div v-else class="empty-bag"><span>袋</span><strong>纪念袋还是空的</strong><p>到达动物展区并解锁 Agent，即可获得限定周边购买机会。</p></div>
          <div v-if="merchBagItems.length" class="pickup-options">
            <small>线上下单后选择领取点</small>
            <button v-for="choice in merchPickupRoutes" :key="choice.service.id" type="button" @click="navigateToMerchPickup(choice)">
              <span>袋</span><span><strong>{{ choice.service.name }}</strong><em>{{ choice.service.detail }}</em></span><b>{{ choice.route.distanceMeters }} 米 · 查看路线</b>
            </button>
          </div>
          <footer v-if="merchBagItems.length"><span>共 {{ merchBagItems.length }} 件</span><strong>合计 ¥{{ merchBagTotal }}</strong><button type="button" :disabled="merchOrdering" @click="submitMerchOrder">{{ merchOrdering ? '正在下单…' : '演示下单' }}</button></footer>
        </section>
      </div>
    </Transition>

    <Transition name="map-drop">
      <div v-if="lostChildOpen" class="emergency-backdrop" @click.self="lostChildOpen = false">
        <section class="lost-child-sheet" role="dialog" aria-modal="true" aria-label="儿童走失播报">
          <header><div><small>紧急协助</small><strong>儿童走失播报</strong></div><button type="button" aria-label="关闭" @click="lostChildOpen = false">×</button></header>
          <p>请立即联系附近工作人员。情况紧急时，可直接拨打报警电话。</p>
          <a class="emergency-call" href="tel:110"><span>☎</span><strong>拨打 110</strong><small>紧急报警电话</small></a>
          <form @submit.prevent="submitLostChildReport">
            <label><span>孩子名字</span><input v-model="lostChildForm.name" required placeholder="请输入孩子姓名或小名"></label>
            <label><span>样貌特征</span><textarea v-model="lostChildForm.appearance" required placeholder="衣着颜色、身高、发型等明显特征"></textarea></label>
              <label><span>走丢地点</span><input v-model="lostChildForm.location" required placeholder="例如：考拉园出口附近"></label>
              <label><span>家长联系电话</span><input v-model="lostChildForm.guardianPhone" type="tel" inputmode="tel" autocomplete="tel" required placeholder="请输入可随时接听的电话号码"></label>
              <small>提交后将实时上传至园区运营后台，由工作人员接收并更新协查状态。</small>
              <button class="submit-lost-child" type="submit" :disabled="!canSubmitLostChild">{{ lostChildSubmitting ? '正在上传…' : '提交走失信息' }}</button>
          </form>
        </section>
      </div>
    </Transition>

      <Transition name="map-drop"><div v-if="mapOpen" :class="['map-backdrop', { 'tab-map-backdrop': route.query.tab === 'map' }]" @click.self="closeMap"><div :class="['map-modal', { 'tab-map-modal': route.query.tab === 'map' }]" role="dialog" aria-modal="true" aria-label="园区路线地图">
      <header><div><small>园区实时地图 · 步行路网</small><strong>{{ plan?.title ?? '长隆野生动物世界' }}</strong><div class="map-search-wrap"><label class="map-search"><span>⌕</span><input v-model="mapSearch" type="search" autocomplete="off" placeholder="搜索动物、展区、服务或景点" @keydown.enter.prevent="selectFirstSearchMatch"></label><div v-if="mapSearch.trim()" class="poi-search-results" role="listbox" aria-label="园区地点搜索结果"><button v-for="match in searchMatches" :key="match.id" type="button" role="option" @click="selectSearchMatch(match)"><span><strong>{{ match.label }}</strong><small>{{ match.type }}</small></span><b>定位</b></button><p v-if="!searchMatches.length">未找到相关地点，请换个关键词试试</p></div></div></div><button v-if="route.query.tab !== 'map'" type="button" @click="closeMap">×</button></header>
       <div class="map-canvas"><ParkRasterMap :animals="animals" :route-zone-ids="plan?.actualAnimalOrder ?? []" :entry-gate="plan?.entryGate ?? 'north'" :exit-gate="plan?.exitGate ?? 'south'" :take-north-gate-train="plan?.takeNorthGateTrain ?? false" :current-position="demoPosition" :services="mapServices" :show-services="true" :navigation-route="activeNavigation" :interactive="true" @select-zone="selectZonePoi" @select-service="selectServicePoi" @select-landmark="selectLandmarkPoi" /></div>
      <footer v-if="activeDestination && !activeRestroom && activeNavigation" class="navigation-summary"><small>正在为你导航</small><strong>{{ activeDestination.name }}</strong><span>已为你规划园区步行路线。</span><b>距你 {{ activeNavigation.distanceMeters }} 米 · 步行约 {{ activeNavigation.walkingMinutes }} 分钟</b></footer>
      <footer v-if="activeRestroom && activeNavigation" class="navigation-summary"><small>正在为你导航</small><strong>{{ restroomLabels[activeRestroom.id] ?? activeRestroom.name }}</strong><span>{{ activeRestroom.detail }}</span><b>距你 {{ activeNavigation.distanceMeters }} 米 · 步行约 {{ activeNavigation.walkingMinutes }} 分钟</b></footer>
      <footer v-if="poiInfo" class="poi-summary"><small>园区地点信息</small><strong>{{ poiInfo.name }}</strong><span>{{ poiInfo.detail }}</span><b>{{ poiInfo.hours }} · {{ poiInfo.metric }}</b></footer>
      <footer v-if="zoneInfo" class="zone-summary"><small>展区实时信息</small><strong>{{ zoneInfo.name }}</strong><span>{{ zoneInfo.description }}</span><b>当前状态：{{ animalState }} · 火爆指数 {{ zoneHeat }}%</b><button type="button" @click="startZoneNavigation">现在出发</button></footer>
      <footer v-else><strong>路线已标记</strong><span>点击地图中的动物展区，查看介绍、状态与实时火爆指数。</span></footer>
      </div></div></Transition>
      <AgentPhotoComposer v-if="photoComposerOpen && photoSourceFile" :source-file="photoSourceFile" :sticker-sources="photoStickerSources" :agent-name="currentCompanion.name" @complete="sendCompositePhoto" @close="closePhotoComposer" @retry="capturePhoto" />
    </section>
</template>

<style scoped>
.chat-shell {
  position: relative;
  isolation: isolate;
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr) auto;
  min-height: 0;
  height: var(--app-viewport-height, 100dvh);
  overflow: hidden;
  background: var(--paper);
}

.chat-header {
  position: relative;
  z-index: 7;
  display: grid;
  grid-template-columns: 38px 1fr auto;
  align-items: center;
  min-height: calc(68px + env(safe-area-inset-top));
  padding: max(12px, env(safe-area-inset-top)) 16px 10px;
  gap: 10px;
  border-bottom: 1px solid var(--line);
  background: rgba(243,240,231,.94);
  backdrop-filter: blur(16px);
}

.back-button,
.reset-button,
.test-button {
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

.chat-scroll-area {
  min-height: 0;
  overflow-y: scroll;
  scrollbar-gutter: stable;
}

.header-actions { display: flex; gap: 5px; }.header-actions button { width: 40px; }.test-button { border-color: #b9d5bd; background: #eff7ef; color: #326b43; font-size: 11px; font-weight: 800; }
.test-panel { grid-column: 1 / -1; display: grid; grid-template-columns: 1fr 1fr; width: 100%; margin-top: 2px; padding: 10px; gap: 8px; border: 1px solid #d2ddd0; border-radius: 13px; background: #fafbf7; }
.test-panel label { display: grid; min-width: 0; gap: 4px; }.test-panel label > span { color: var(--muted); font-size: 9px; font-weight: 800; }.test-panel select { width: 100%; height: 34px; padding: 0 8px; border: 1px solid #cad8c8; border-radius: 9px; outline: 0; background: #fff; color: var(--forest); font-size: 10px; }.test-panel > small { grid-column: 1 / -1; color: #6c7b73; font-size: 9px; }
.leave-test-button { grid-column: 1 / -1; display: flex; min-height: 42px; padding: 7px 10px; align-items: center; justify-content: space-between; border: 1px solid #d9bd82; border-radius: 10px; background: #fff8e8; color: var(--forest); text-align: left; }.leave-test-button span { color: #a2702b; font-size: 9px; }.leave-test-button strong { font-size: 11px; }

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
  max-height: none;
  /* 给固定的快捷键与输入栏预留完整高度，最后一条消息不会被覆盖。 */
  padding: 14px 17px 230px;
  overflow: visible;
  flex-direction: column;
  gap: 10px;
  scroll-behavior: smooth;
}

.timeline-time { align-self: center; margin: 4px 0 1px; padding: 3px 8px; border-radius: 999px; background: rgba(108, 120, 113, .1); color: #7a847f; font-size: 9px; line-height: 1.2; }

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
.photo-message .message-bubble { width: min(82%, 286px); padding: 4px; overflow: hidden; }.photo-message .message-bubble img { display: block; width: 100%; max-height: 320px; border-radius: 12px; object-fit: cover; }.photo-message .message-bubble small { padding: 1px 5px 3px; color: rgba(255,255,255,.78); }
.posttrip-message { align-items: flex-start; }.posttrip-entry-card { width: min(100%, 350px); max-width: 350px; padding: 12px; border-color: #dbc590; background: linear-gradient(145deg, #fffdf6, #f7eed7); }.posttrip-entry-card > small { margin: 0; color: #9b6c27; font-size: 9px; }.posttrip-entry-card > strong { display: block; margin-top: 4px; color: var(--forest); font-size: 14px; line-height: 1.45; }.posttrip-entry-card > p { margin-top: 6px; color: var(--muted); font-size: 10px; line-height: 1.5; }.posttrip-entry-card > div { display: grid; margin-top: 10px; gap: 7px; }.posttrip-entry-card a { display: grid; grid-template-columns: 34px 1fr auto; padding: 8px; align-items: center; gap: 7px; border: 1px solid #d8dfca; border-radius: 11px; background: rgba(255,255,255,.78); color: var(--forest); text-decoration: none; }.posttrip-entry-card a > span { grid-row: 1 / span 2; display: grid; width: 32px; height: 32px; place-items: center; border-radius: 9px; background: var(--forest); color: #fff; font-size: 12px; font-weight: 900; }.posttrip-entry-card a > em { font-size: 11px; font-style: normal; font-weight: 800; }.posttrip-entry-card a > b { grid-column: 3; grid-row: 1 / span 2; color: #8c672d; font-size: 9px; white-space: nowrap; }

.posttrip-entry-card { padding: 14px; border-radius: 18px 18px 18px 6px; box-shadow: 0 10px 24px rgba(111,82,29,.1); }
.posttrip-entry-card > div { gap: 8px; }
.posttrip-entry-card a { min-height: 48px; transition: transform .18s ease, box-shadow .18s ease; }
.posttrip-entry-card a.review-link { border-color: #0b483a; background: linear-gradient(135deg,#0b483a,#135e4d); color: #fff; box-shadow: 0 8px 16px rgba(10,67,54,.18); }
.posttrip-entry-card a.review-link > span { background: #fff4d7; color: #104f40; }
.posttrip-entry-card a.review-link > b { color: #f4d98b; }
.posttrip-entry-card a:active { transform: scale(.98); }
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
  /* 答题面板固定停在底部导航上方，不能再由内容高度把确认按钮挤到导航后面。 */
  position: absolute;
  right: 0;
  bottom: calc(28px + env(safe-area-inset-bottom));
  left: 0;
  z-index: 12;
  min-height: 0;
  max-height: min(62dvh, 560px);
  padding: 0 12px 28px;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scroll-padding-bottom: 16px;
  background: linear-gradient(to top, var(--paper) 88%, rgba(250, 248, 241, 0));
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
.map-modal { position: fixed; z-index: 20; right: 50%; bottom: 8px; width: min(100% - 12px, 468px); height: min(calc(var(--app-viewport-height, 100dvh) - 16px), 850px); display: grid; grid-template-rows: auto 1fr auto; overflow: hidden; border: 1px solid rgba(22,82,67,.14); border-radius: 28px; background: var(--paper); box-shadow: 0 -22px 60px rgba(21,58,48,.28); transform: translateX(50%); animation: map-rise 460ms cubic-bezier(.2,.9,.2,1); }
.map-modal header { display: flex; align-items: center; justify-content: space-between; padding: max(14px, env(safe-area-inset-top)) 16px 14px; border-bottom: 1px solid var(--line); }
.map-modal header > div { display: grid; min-width: 0; flex: 1; gap: 2px; }.map-modal header small { color: var(--accent-dark); font-size: 10px; }.map-modal header strong { color: var(--ink); font-size: 15px; }
.map-modal header button { width: 36px; height: 36px; border: 1px solid var(--line); border-radius: 12px; background: #fff; color: var(--forest); font-size: 24px; }
.map-search-wrap { position: relative; width: 100%; }.map-search { display: flex; align-items: center; height: 38px; margin-top: 10px; padding: 0 11px; gap: 6px; border-radius: 12px; background: #e9e9e5; color: #6b716d; }.map-search input { width: 100%; border: 0; outline: 0; background: transparent; color: var(--ink); font-size: 13px; }.poi-search-results { position: absolute; z-index: 30; top: calc(100% + 6px); right: 0; left: 0; display: grid; max-height: 290px; overflow-y: auto; padding: 6px; border: 1px solid #d8ded6; border-radius: 14px; background: rgba(255,255,255,.98); box-shadow: 0 14px 28px rgba(22,55,45,.18); }.poi-search-results button { display: flex; width: 100%; min-height: 48px; padding: 8px 10px; align-items: center; justify-content: space-between; gap: 10px; border: 0; border-radius: 9px; background: transparent; color: var(--forest); text-align: left; }.poi-search-results button:hover,.poi-search-results button:focus-visible { background: #edf5ed; outline: 0; }.poi-search-results button span { display: grid; gap: 2px; }.poi-search-results button strong { font-size: 12px; }.poi-search-results button small { color: #708178; font-size: 10px; }.poi-search-results button b { color: #a66b25; font-size: 10px; white-space: nowrap; }.poi-search-results p { margin: 12px 8px; color: #718079; font-size: 11px; }.map-canvas { min-height: 0; }.map-modal footer { display: grid; min-height: 116px; padding: 34px 16px max(15px, env(safe-area-inset-bottom)); gap: 2px; border-top: 1px solid var(--line); background: #fff; }.map-modal footer strong { color: var(--forest); font-size: 13px; }.map-modal footer span { color: var(--muted); font-size: 10px; }
.poi-search-results { grid-template-columns: minmax(0, 1fr); max-height: 260px; gap: 4px; }
.poi-search-results button { display: grid; grid-template-columns: minmax(0, 1fr) auto; min-width: 0; min-height: 52px; border-radius: 10px; }
.poi-search-results button span { min-width: 0; gap: 3px; }
.poi-search-results button strong,.poi-search-results button small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.poi-search-results button strong { font-size: 13px; }
.poi-search-results button b { padding: 5px 8px; border-radius: 999px; background: #f4ead7; color: #9a6221; }
.zone-status-card { display: none; }
.zone-status-card { position: absolute; right: 12px; bottom: 70px; left: 12px; display: grid; padding: 14px; gap: 6px; border-radius: 16px; background: rgba(255,255,255,.97); box-shadow: 0 12px 28px rgba(7,56,45,.2); }.zone-status-card button { position: absolute; top: 8px; right: 9px; border: 0; background: transparent; color: var(--muted); font-size: 20px; }.zone-status-card small { color: var(--accent-dark); font-size: 10px; font-weight: 800; }.zone-status-card strong { color: var(--forest); font-size: 17px; }.zone-status-card p { margin: 0; color: var(--muted); font-size: 11px; line-height: 1.5; }.zone-status-card div { display: flex; flex-wrap: wrap; gap: 5px; }.zone-status-card span { padding: 5px 7px; border-radius: 8px; background: #edf5ed; color: var(--forest); font-size: 9px; }
.wechat-dock { position: fixed; right: 50%; bottom: calc(62px + env(safe-area-inset-bottom)); left: auto; z-index: 91; width: min(100%, 480px); min-height: 112px; padding: 9px 12px max(10px, env(safe-area-inset-bottom)); box-sizing: border-box; background: var(--paper); pointer-events: auto; transform: translateX(50%); }
.photo-creation-card { display: grid; width: 100%; grid-template-columns: 34px 1fr auto; align-items: center; margin-bottom: 8px; padding: 8px 10px; gap: 8px; border: 1px solid #cddccc; border-radius: 14px 5px 14px 5px; background: #f7fbf3; color: var(--forest); text-align: left; box-shadow: 0 6px 14px rgba(41,74,55,.07); }.photo-creation-card i { display: grid; width: 29px; height: 29px; place-items: center; border-radius: 10px 3px; background: var(--forest); color: #f4d27b; font-style: normal; }.photo-creation-card span { display: grid; gap: 2px; }.photo-creation-card strong { font-size: 10px; }.photo-creation-card small { color: #6c7d70; font-size: 8px; }.photo-creation-card>b { padding: 5px 7px; border-radius: 8px 3px; background: #e7f0e3; font-size: 8px; }
.animal-status { color: #42805a !important; font-weight: 800; }.composer-row { display: grid; grid-template-columns: 1fr 34px 34px; align-items: center; gap: 8px; }.composer-row input { min-width: 0; height: 37px; padding: 0 11px; border: 0; border-radius: 7px; background: #fff; color: var(--ink); font-size: 13px; }.composer-row button { display: grid; width: 34px; height: 34px; place-items: center; border: 0; background: transparent; color: #31443d; font-size: 23px; line-height: 1; }.plus-button { font-size: 26px !important; }.photo-input { display: none; }.tool-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); padding: 15px 0 5px; gap: 0; }.tool-grid button { display: grid; justify-items: center; gap: 6px; border: 0; background: transparent; color: var(--ink); font-size: 11px; }.tool-grid i { display: grid; width: 48px; height: 48px; place-items: center; border-radius: 12px; background: #e3e5df; color: var(--forest); font-size: 25px; font-style: normal; }.tool-grid button:first-child i { background: var(--forest); color: #fff; font-size: 19px; font-weight: 900; }.tool-grid span { position: relative; }.tool-grid span b { position: absolute; top: -56px; right: -13px; display: grid; min-width: 17px; height: 17px; padding: 0 4px; place-items: center; border-radius: 999px; background: #bd4c2e; color: #fff; font-size: 9px; }

.zone-status-card { display: none; }
.restroom-answer .message-bubble { width: min(100%, 330px); }
.unlock-answer .message-bubble { width: min(100%, 330px); }
.unlock-agent-button { display: grid; grid-template-columns: 42px 1fr auto; width: 100%; margin-top: 9px; padding: 9px; align-items: center; gap: 9px; border: 1px solid #b9d6bf; border-radius: 14px; background: linear-gradient(135deg, #f5fbf4, #e6f3e7); color: var(--ink); text-align: left; }
.unlock-agent-button img { width: 42px; height: 42px; border-radius: 12px; object-fit: cover; background: #fff; }
.unlock-agent-button span { display: grid; gap: 2px; }.unlock-agent-button small { margin: 0; color: #4e8561; font-size: 9px; }.unlock-agent-button strong { color: var(--forest); font-size: 13px; }.unlock-agent-button em { color: var(--muted); font-size: 9px; font-style: normal; }.unlock-agent-button b { padding: 6px 8px; border-radius: 999px; background: var(--forest); color: #fff; font-size: 10px; }
.show-reminder .message-bubble { width: min(100%, 330px); }.show-route-card { display: grid; grid-template-columns: 30px 1fr auto; width: 100%; margin-top: 8px; padding: 9px; align-items: center; gap: 7px; border: 1px solid #c7d8c7; border-radius: 12px; background: #f3faf3; color: var(--forest); text-align: left; }.show-route-card > span { grid-row: 1 / span 2; display: grid; width: 28px; height: 28px; place-items: center; border-radius: 50%; background: var(--forest); color: #fff; }.show-route-card strong { font-size: 12px; }.show-route-card em { color: var(--muted); font-size: 10px; font-style: normal; }.show-route-card b { grid-column: 3; grid-row: 1 / span 2; padding: 5px 7px; border-radius: 8px; background: #e0efdf; color: #39724a; font-size: 9px; white-space: nowrap; }
.test-location-card { display: grid; width: min(100%, 342px); gap: 6px; border-color: #c8dcc9; background: #f7fbf4; }.test-location-card > small { color: #8a682e; font-size: 9px; font-weight: 800; }.test-location-card > strong { color: var(--forest); font-size: 15px; }.test-location-card > p { margin: 0; font-size: 11px; line-height: 1.55; }.test-location-card > em { width: fit-content; padding: 5px 8px; border-radius: 999px; background: #e2efe1; color: #356244; font-size: 10px; font-style: normal; font-weight: 700; }.test-location-card .child-meal,.test-location-card .allergy-notice { padding: 7px 8px; border-radius: 9px; }.test-dish-list { display: grid; gap: 6px; }.test-dish-list > span { display: grid; grid-template-columns: 1fr auto; padding: 7px 8px; gap: 6px; border-radius: 9px; background: #fff; }.test-dish-list b { color: var(--ink); font-size: 10px; }.test-dish-list em { color: #a05d35; font-size: 9px; font-style: normal; }
.test-unlock-button { margin-top: 4px; }.test-science-card { display: grid; margin-top: 4px; padding-top: 9px; gap: 6px; border-top: 1px solid #d4e2d3; }.test-science-card > small { color: var(--accent-dark); font-size: 9px; font-weight: 800; }.test-science-card > strong { color: var(--forest); font-size: 13px; }.test-science-card > p { margin: 0 0 2px; font-size: 11px; line-height: 1.5; }.test-science-card > button { width: 100%; padding: 8px; border: 1px solid #d5e3d4; border-radius: 9px; background: #fff; color: var(--ink); font-size: 10px; text-align: left; }.test-science-card > button.correct { border-color: #75ac80; background: #e4f2e4; color: #235c36; }.test-science-card > button.incorrect { border-color: #e3b087; background: #fff1e6; color: #9b5427; }.test-science-card > em { color: #326b43; font-size: 10px; font-style: normal; line-height: 1.5; }
.test-merch-card { display: grid; margin-top: 5px; padding: 10px; gap: 8px; border: 1px solid #e1c997; border-radius: 13px; background: linear-gradient(145deg, #fffaf0, #f8f0dc); }.test-merch-card > small { color: #a56720; font-size: 9px; font-weight: 900; }.test-merch-card > div { display: grid; grid-template-columns: 52px 1fr auto; align-items: center; gap: 8px; }.test-merch-card img { width: 52px; height: 52px; border-radius: 11px; background: #fff; object-fit: cover; }.test-merch-card span { display: grid; gap: 2px; }.test-merch-card span > em { width: fit-content; padding: 2px 5px; border-radius: 5px; background: #f1dfb7; color: #8d5c1e; font-size: 8px; font-style: normal; }.test-merch-card span > strong { color: var(--forest); font-size: 10px; }.test-merch-card span > p { margin: 0; color: var(--muted); font-size: 8px; line-height: 1.4; }.test-merch-card div > b { color: #b45225; font-size: 11px; white-space: nowrap; }.test-merch-card > button { height: 34px; border: 0; border-radius: 10px; background: var(--forest); color: #fff; font-size: 10px; font-weight: 800; }.test-merch-card > button:disabled { opacity: .58; }
.science-answer { align-items: flex-start; }.science-card { width: min(100%, 330px); padding: 12px; border: 1px solid #cddfce; border-radius: 14px; background: #f8fbf6; }.science-card > small { display: block; color: var(--accent-dark); font-size: 10px; font-weight: 800; }.science-card > strong { display: block; margin-top: 3px; color: var(--forest); font-size: 13px; }.science-card p { margin: 7px 0; color: var(--ink); font-size: 12px; line-height: 1.5; }.science-card button { display: block; width: 100%; margin-top: 6px; padding: 8px; border: 1px solid #d5e3d4; border-radius: 9px; background: #fff; color: var(--ink); font-size: 11px; text-align: left; }.science-card button.correct { border-color: #75ac80; background: #e4f2e4; color: #235c36; }.science-card button.incorrect { border-color: #e3b087; background: #fff1e6; color: #9b5427; }.science-card em { display: block; margin-top: 8px; color: #326b43; font-size: 11px; font-style: normal; line-height: 1.5; }
.merch-answer { align-items: flex-start; }.merch-card { width: min(100%, 342px); padding: 12px; border: 1px solid #e1c997; border-radius: 15px; background: linear-gradient(145deg, #fffaf0, #f8f0dc); }.merch-card > small { color: #a56720; font-size: 10px; font-weight: 900; }.merch-product { display: grid; grid-template-columns: 66px 1fr auto; margin-top: 8px; align-items: center; gap: 9px; }.merch-image { width: 66px; height: 66px; overflow: hidden; border-radius: 14px; background: #fff; }.merch-image img { width: 100%; height: 100%; object-fit: cover; }.merch-product > div:nth-child(2) { display: grid; gap: 3px; }.merch-product em { width: fit-content; padding: 2px 5px; border-radius: 5px; background: #f1dfb7; color: #8d5c1e; font-size: 8px; font-style: normal; }.merch-product strong { color: var(--forest); font-size: 12px; }.merch-product p { margin: 0; color: var(--muted); font-size: 9px; line-height: 1.4; }.merch-product > b { color: #b45225; font-size: 13px; white-space: nowrap; }.merch-actions { display: grid; grid-template-columns: 1fr 1.5fr; margin-top: 10px; gap: 7px; }.merch-actions button { height: 34px; border: 1px solid #d8c8a6; border-radius: 10px; background: #fff; color: #77654b; font-size: 10px; font-weight: 800; }.merch-actions button.primary { border-color: var(--forest); background: var(--forest); color: #fff; }.merch-actions button:disabled { opacity: .58; }
.dining-answer { align-items: flex-start; }.dining-card { width: min(100%, 342px); padding: 12px; border: 1px solid #e0d4bd; border-radius: 15px; background: #fffaf1; }.dining-card > small { color: #a46625; font-size: 10px; font-weight: 800; }.dining-card > strong { display: block; margin: 3px 0 8px; color: var(--forest); font-size: 15px; }.dining-card > p { margin: 6px 0; padding: 7px 8px; border-radius: 9px; font-size: 10px; line-height: 1.5; }.child-meal { background: #edf6e9; color: #315e3c; }.allergy-notice { background: #fff0df; color: #8b5428; }.dish-list { display: grid; margin-top: 9px; gap: 8px; }.dish-list article { display: grid; grid-template-columns: 58px 1fr auto; align-items: center; gap: 8px; }.dish-image-placeholder { display: grid; width: 58px; height: 48px; place-items: center; border: 1px dashed #c8b99f; border-radius: 9px; background: #f4efe6; }.dish-image-placeholder span { color: #a79b88; font-size: 9px; }.dish-list article > div:nth-child(2) { display: grid; gap: 3px; }.dish-list article strong { color: var(--ink); font-size: 11px; }.dish-list article small { color: #a06038; font-size: 9px; }.dish-list article > b { color: #b55d2c; font-size: 11px; white-space: nowrap; }
.restroom-choice { display: grid; grid-template-columns: 30px 1fr auto; width: 100%; margin-top: 8px; padding: 10px; gap: 8px; align-items: center; border: 1px solid #c8dec9; border-radius: 12px; background: #f4faf4; color: var(--ink); text-align: left; }
.restroom-choice:hover { background: #e7f2e8; }.restroom-choice .restroom-icon { display: grid; width: 28px; height: 28px; place-items: center; border-radius: 50%; background: var(--forest); color: #fff; font-size: 18px; }.restroom-choice > span:nth-child(2) { display: grid; gap: 2px; }.restroom-choice strong { font-size: 12px; color: var(--forest); }.restroom-choice small { color: var(--muted); font-size: 10px; }.restroom-choice b { padding: 4px 6px; border-radius: 7px; background: #e3f0df; color: #36704e; font-size: 9px; white-space: nowrap; }.restroom-choice b.busy { background: #fff0dc; color: #ae642d; }
.navigation-summary ~ footer { display: none; }.navigation-summary { min-height: 116px; }.navigation-summary b { color: var(--forest); font-size: 12px; }
.poi-summary ~ footer { display: none; }.poi-summary b { color: var(--forest); font-size: 11px; }
.zone-summary { grid-template-columns: 1fr auto; align-items: end; }.zone-summary small,.zone-summary strong,.zone-summary span,.zone-summary b { grid-column: 1; }.zone-summary button { grid-column: 2; grid-row: 1 / span 4; align-self: center; padding: 10px 13px; border: 0; border-radius: 999px; background: var(--forest); color: #fff; font-size: 12px; font-weight: 800; white-space: nowrap; }
.quick-prompts { position: relative; z-index: 1; display: flex; justify-content: center; gap: 7px; margin: 0 0 8px; overflow-x: auto; scrollbar-width: none; pointer-events: auto; }.quick-prompts::-webkit-scrollbar { display: none; }.quick-prompts button { flex: 0 0 auto; padding: 7px 10px; border: 1px solid #c8dcc9; border-radius: 999px; background: #f2f8f1; color: var(--forest); font-size: 11px; font-weight: 700; cursor: pointer; touch-action: manipulation; pointer-events: auto; }.quick-prompts button:active { background: #dceedd; transform: scale(.97); }
.quick-prompts .emergency-prompt { border-color: #e4ad96; background: #fff1eb; color: #a8482e; }
.bag-backdrop { position: fixed; z-index: 29; inset: 0; display: grid; align-items: end; justify-items: center; padding: 10px; background: rgba(19, 34, 28, .4); }.merch-bag-sheet { width: min(100%, 460px); max-height: 84dvh; padding: 16px; overflow-y: auto; border-radius: 24px 24px 18px 18px; background: #fffaf0; box-shadow: 0 -20px 55px rgba(27, 45, 36, .28); }.merch-bag-sheet > header { display: flex; align-items: center; justify-content: space-between; }.merch-bag-sheet > header div { display: grid; gap: 2px; }.merch-bag-sheet > header small { color: #9b6824; font-size: 8px; font-weight: 900; letter-spacing: .1em; }.merch-bag-sheet > header strong { color: var(--forest); font-size: 20px; }.merch-bag-sheet > header button { width: 36px; height: 36px; border: 1px solid #dfd0b4; border-radius: 12px; background: #fff; color: var(--forest); font-size: 22px; }.bag-items { display: grid; margin-top: 14px; gap: 9px; }.bag-items article { display: grid; grid-template-columns: 58px 1fr auto; padding: 9px; align-items: center; gap: 9px; border: 1px solid #e0d3b9; border-radius: 13px; background: #fff; }.bag-items img { width: 58px; height: 58px; border-radius: 12px; object-fit: cover; }.bag-items article > div { display: grid; gap: 2px; }.bag-items small { color: #a56a23; font-size: 8px; }.bag-items strong { color: var(--forest); font-size: 11px; }.bag-items span { color: var(--muted); font-size: 9px; }.bag-items article > b { color: #b55328; font-size: 12px; }.empty-bag { display: grid; min-height: 210px; place-content: center; place-items: center; gap: 6px; text-align: center; }.empty-bag > span { display: grid; width: 58px; height: 58px; place-items: center; border-radius: 18px; background: #eee4ce; color: #947044; font-size: 20px; }.empty-bag strong { color: var(--forest); font-size: 14px; }.empty-bag p { max-width: 250px; margin: 0; color: var(--muted); font-size: 10px; line-height: 1.5; }.pickup-options { display: grid; margin-top: 13px; gap: 7px; }.pickup-options > small { color: #8e6a35; font-size: 9px; font-weight: 800; }.pickup-options > button { display: grid; grid-template-columns: 30px 1fr auto; padding: 8px; align-items: center; gap: 7px; border: 1px solid #d4dcbf; border-radius: 11px; background: #f7fbef; color: var(--forest); text-align: left; }.pickup-options > button > span:first-child { display: grid; width: 29px; height: 29px; place-items: center; border-radius: 9px; background: var(--forest); color: #fff; }.pickup-options > button > span:nth-child(2) { display: grid; gap: 2px; }.pickup-options strong { font-size: 10px; }.pickup-options em { color: var(--muted); font-size: 8px; font-style: normal; }.pickup-options b { color: #417052; font-size: 8px; white-space: nowrap; }.merch-bag-sheet > footer { display: grid; grid-template-columns: 1fr auto; margin-top: 14px; padding-top: 12px; align-items: center; gap: 2px 10px; border-top: 1px solid #e0d3b9; }.merch-bag-sheet > footer span { color: var(--muted); font-size: 9px; }.merch-bag-sheet > footer strong { color: #a64724; font-size: 15px; }.merch-bag-sheet > footer button { grid-column: 2; grid-row: 1 / span 2; height: 38px; padding: 0 16px; border: 0; border-radius: 11px; background: var(--forest); color: #fff; font-size: 11px; font-weight: 800; }
.emergency-backdrop { position: fixed; z-index: 30; inset: 0; display: grid; align-items: end; justify-items: center; padding: 10px; background: rgba(30, 24, 20, .42); }.lost-child-sheet { width: min(100%, 460px); max-height: 92dvh; padding: 16px; overflow-y: auto; border-radius: 24px 24px 18px 18px; background: #fffaf5; box-shadow: 0 -20px 55px rgba(48, 25, 16, .28); }.lost-child-sheet > header { display: flex; align-items: center; justify-content: space-between; }.lost-child-sheet > header div { display: grid; gap: 2px; }.lost-child-sheet > header small { color: #b34e32; font-size: 10px; font-weight: 800; }.lost-child-sheet > header strong { color: #542b20; font-size: 20px; }.lost-child-sheet > header button { width: 36px; height: 36px; border: 1px solid #e6d2c8; border-radius: 12px; background: #fff; color: #7d5145; font-size: 22px; }.lost-child-sheet > p { margin: 12px 0; color: #6f5a52; font-size: 11px; line-height: 1.6; }.emergency-call { display: grid; grid-template-columns: 36px 1fr; padding: 10px; align-items: center; gap: 2px 9px; border-radius: 13px; background: #ae3f2c; color: #fff; text-decoration: none; }.emergency-call > span { grid-row: 1 / span 2; display: grid; width: 36px; height: 36px; place-items: center; border-radius: 50%; background: rgba(255,255,255,.18); font-size: 19px; }.emergency-call strong { font-size: 14px; }.emergency-call small { color: rgba(255,255,255,.78); font-size: 9px; }.lost-child-sheet form { display: grid; margin-top: 13px; gap: 10px; }.lost-child-sheet form label { display: grid; gap: 5px; }.lost-child-sheet form label > span { color: #4f3b34; font-size: 10px; font-weight: 800; }.lost-child-sheet input,.lost-child-sheet textarea { width: 100%; padding: 10px; border: 1px solid #decfc7; border-radius: 10px; outline: 0; background: #fff; color: var(--ink); font: inherit; font-size: 12px; }.lost-child-sheet textarea { min-height: 68px; resize: vertical; }.lost-child-sheet form > small { color: #9a7567; font-size: 9px; line-height: 1.5; }.submit-lost-child { height: 42px; border: 0; border-radius: 12px; background: #9e3c29; color: #fff; font-size: 13px; font-weight: 800; }.submit-lost-child:disabled { opacity: .4; }

@keyframes typing {
  50% { opacity: 0.25; transform: translateY(-2px); }
}
@keyframes map-rise { from { opacity: 0; transform: translate(50%, calc(100% + 20px)) scale(.98); } to { opacity: 1; transform: translateX(50%) scale(1); } }
.map-backdrop { position: fixed; z-index: 19; inset: 0; background: rgba(8,30,24,.28); }
.map-drop-enter-active .map-modal,.map-drop-leave-active .map-modal { transition: transform 380ms cubic-bezier(.2,.9,.2,1), opacity 220ms ease; }.map-drop-enter-from .map-modal,.map-drop-leave-to .map-modal { opacity: 0; transform: translate(50%, calc(100% + 20px)) scale(.98); }
.map-modal header > div { width: 100%; gap: 5px; }
.map-modal header small { font-size: 13px; font-weight: 800; }
.map-modal header strong { font-size: 20px; }
.map-search { width: min(100%, 340px); height: 44px; margin: 14px auto 0; padding: 0 14px; gap: 8px; border-radius: 14px; }
.map-search input { font-size: 15px; }
.tab-map-backdrop { background: #f1f0eb; }
.tab-map-modal { width: min(100%, 480px); border: 0; border-radius: 0; background: #f6f4ed; box-shadow: none; }
.tab-map-modal header { padding: max(12px, env(safe-area-inset-top)) 16px 11px; background: rgba(247,245,238,.96); }
.tab-map-modal header > div { gap: 3px; }
.tab-map-modal header small { color: #a16c25; font-size: 9px; letter-spacing: .04em; }
.tab-map-modal header strong { font-size: 18px; }
.tab-map-modal .map-search { width: 100%; height: 41px; margin: 8px 0 0; border-radius: 13px; background: #e8e9e4; }
.tab-map-modal footer { min-height: 82px; padding: 12px 16px 14px; }
.map-modal > footer { align-self: end; margin: 0; }
.map-modal {
  /* 地图与底部信息框整体停在导览栏上沿，避免 POI 内容被导航覆盖。 */
  bottom: calc(62px + env(safe-area-inset-bottom));
  height: min(calc(100dvh - 74px - env(safe-area-inset-bottom)), 850px);
}
.bag-backdrop {
  padding-bottom: calc(176px + env(safe-area-inset-bottom));
}
.merch-bag-sheet { max-height: calc(100dvh - 188px - env(safe-area-inset-bottom)); }
.merch-bag-sheet > footer {
  position: sticky;
  bottom: 0;
  z-index: 1;
  padding-bottom: 8px;
  background: #fffaf0;
  box-shadow: 0 -8px 14px #fffaf0;
}
.emergency-backdrop {
  /* 表单停在固定快捷键区正上方，底部输入栏始终可见可操作。 */
  padding-bottom: calc(176px + env(safe-area-inset-bottom));
}
.lost-child-sheet { max-height: calc(100dvh - 124px - env(safe-area-inset-bottom)); }
.lost-child-sheet .submit-lost-child {
  position: sticky;
  bottom: 0;
  z-index: 1;
  box-shadow: 0 -8px 14px #fffaf5;
}
</style>
