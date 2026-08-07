<script setup lang="ts">
import type { AnimalId, CatalogResponse, Companion, CompanionId, GeoPoint } from '../../../shared/types/pretrip'
import type { DynamicEventId, ParkChatMessage, ParkChatResponse, ParkNavigationTarget, ParkService, ParkZoneContent, TripMode } from '../../../shared/types/park'
import { routeDistanceMeters, walkingMinutes } from '#shared/utils/parkGeo'
import { parkServices, parkZones } from '../../data/park'
import CompanionCollectionSheet from './CompanionCollectionSheet.vue'
import ParkAgentChat from './ParkAgentChat.vue'
import ParkEventCard from './ParkEventCard.vue'
import ParkMap from './ParkMap.vue'
import ParkServiceDrawer from './ParkServiceDrawer.vue'
import TripEntryGate from './TripEntryGate.vue'
import ZoneUnlockSheet from './ZoneUnlockSheet.vue'

interface PendingUnlock {
  zone: ParkZoneContent
  companion: Companion
  activeCompanion: Companion
  alreadyKnown: boolean
}

const { data: catalog, status, error } = await useFetch<CatalogResponse>('/api/catalog', { key: 'park-catalog-v1' })
const pretrip = usePretripJourney()
const park = useParkJourney()
const journeys = useJourneyRecords()
const navigation = useParkNavigation()
const tripState = computed(() => park.state.value)
const pretripState = computed(() => pretrip.state.value)
const collectionOpen = shallowRef(false)
const servicesOpen = shallowRef(false)
const drawerExpanded = shallowRef(false)
const pendingUnlock = shallowRef<PendingUnlock | null>(null)
const selectedService = shallowRef<ParkService | null>(null)
const navigationRoute = navigation.route
const chatMessages = ref<ParkChatMessage[]>([])
const chatLoading = shallowRef(false)
const chatError = shallowRef('')
const locationError = shallowRef('')
const sessionId = useState('park-chat-session-v1', () => `park-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`)
const { startFogTransition } = useFogTransition()
let geolocationWatchId: number | undefined

const hasPlan = computed(() => Boolean(pretripState.value.plan))
const plannedZoneIds = computed<AnimalId[]>(() => pretripState.value.plan?.actualAnimalOrder ?? [])
const activeCompanion = computed(() => catalog.value?.companions.find(item => item.id === tripState.value.activeCompanionId) ?? catalog.value?.companions[0] ?? null)
const nextZoneId = computed(() => tripState.value.routeZoneIds.find(id => !tripState.value.routeCompletedIds.includes(id)) ?? null)
const nextDistanceMeters = computed(() => nextZoneId.value
  ? routeDistanceMeters(tripState.value.currentZoneId ?? 'entrance', nextZoneId.value)
  : null)
const nextWalkingMinutes = computed(() => nextDistanceMeters.value === null ? null : walkingMinutes(nextDistanceMeters.value))
const nextZoneName = computed(() => catalog.value?.animals.find(item => item.id === nextZoneId.value)?.name ?? '自由探索')
const routeProgress = computed(() => {
  if (!tripState.value.routeZoneIds.length) return 0
  return Math.round((tripState.value.routeCompletedIds.length / tripState.value.routeZoneIds.length) * 100)
})

function syncJourneyRecord() {
  const companionId = tripState.value.starterCompanionId ?? pretripState.value.companionId ?? 'panda'
  journeys.reconcileParkState(tripState.value, {
    companionId,
    plan: pretripState.value.plan,
    visitorProfile: pretripState.value.profile,
  })
}

async function beginWithMode(mode: TripMode) {
  const companionId = pretripState.value.companionId ?? 'panda'
  await startFogTransition({ label: '园中奇遇 · 正在展开' })
  park.begin(companionId, mode, mode === 'follow' ? plannedZoneIds.value : [])
  journeys.start({ companionId, plan: pretripState.value.plan, visitorProfile: pretripState.value.profile })
}

async function quickStart(companionId: CompanionId) {
  await startFogTransition({ label: '园中奇遇 · 正在展开' })
  park.begin(companionId, 'free')
  journeys.start({ companionId, visitorProfile: pretripState.value.profile })
}

function updateLocation(position: GeoPoint) {
  if (!catalog.value) return
  const result = park.updateLocation(position, catalog.value.animals)
  journeys.recordLocation(position, result.state.totalWalkedMeters)
  const zonePoi = result.matchedZone
  if (!zonePoi) {
    locationError.value = '当前位置尚未进入任何 50 米展区围栏。'
    return
  }
  locationError.value = ''
  const zone = parkZones.find(item => item.id === zonePoi.id)
  const zoneCompanion = catalog.value?.companions.find(item => item.id === zone?.companionId)
  const active = activeCompanion.value
  if (!zone || !zoneCompanion || !active) return
  navigation.clear()
  journeys.arriveZone(zone.id, zone.companionId, result.firstVisit)

  const wasVisited = !result.firstVisit
  const alreadyKnown = !result.firstVisit || tripState.value.starterCompanionId === zone.companionId

  if (!wasVisited) {
    pendingUnlock.value = { zone, companion: zoneCompanion, activeCompanion: active, alreadyKnown }
  }
  navigateTo({ path: `/inpark/zone/${zone.id}`, query: result.firstVisit ? { new: '1' } : undefined })
}

function locateMe() {
  locationError.value = ''
  if (!navigator.geolocation) {
    locationError.value = '当前设备不支持定位，请点击地图展区模拟前往。'
    return
  }
  if (geolocationWatchId !== undefined) navigator.geolocation.clearWatch(geolocationWatchId)
  geolocationWatchId = navigator.geolocation.watchPosition(
    position => updateLocation({ longitude: position.coords.longitude, latitude: position.coords.latitude }),
    () => { locationError.value = '未获得定位权限，请点击地图展区模拟前往。' },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 },
  )
}

function startNavigation(target: ParkNavigationTarget) {
  const route = navigation.start(target, tripState.value.currentPosition, pretripState.value.profile.pace ?? 'balanced')
  if (!route) {
    locationError.value = navigation.error.value
    return
  }
  selectedService.value = target.kind === 'service' ? parkServices.find(item => item.id === target.id) ?? null : null
  locationError.value = ''
}

async function sendChat(question: string) {
  const companionId = tripState.value.activeCompanionId
  if (!companionId || chatLoading.value) return
  chatLoading.value = true
  chatError.value = ''
  chatMessages.value.push({ id: `${Date.now()}-u`, role: 'user', text: question })
  try {
    const response = await $fetch<ParkChatResponse>('/api/inpark/chat', {
      method: 'POST',
      body: {
        sessionId: sessionId.value,
        companionId,
        currentZoneId: tripState.value.currentZoneId,
        currentPosition: tripState.value.currentPosition,
        routeZoneIds: [...tripState.value.routeZoneIds],
        completedZoneIds: [...tripState.value.routeCompletedIds],
        question,
      },
    })
    chatMessages.value.push({ id: `${Date.now()}-a`, role: 'assistant', text: response.reply, mode: response.mode })
    journeys.recordConversation(question, response.reply, tripState.value.currentZoneId ?? undefined)
    if (response.navigationTarget) startNavigation(response.navigationTarget)
    const previousRoute = [...tripState.value.routeZoneIds]
    park.applyAdjustment(response.action)
    if (response.action !== 'none') journeys.recordRouteChange(question, previousRoute, [...park.state.value.routeZoneIds])
  }
  catch (cause) {
    chatError.value = cause instanceof Error ? cause.message : '伙伴暂时没有听清，请稍后再试。'
  }
  finally {
    chatLoading.value = false
  }
}

function selectCompanion(companionId: CompanionId) {
  park.switchCompanion(companionId)
  collectionOpen.value = false
}

function selectService(service: ParkService) {
  startNavigation(service)
  servicesOpen.value = false
}

function reportFatigue() {
  servicesOpen.value = false
  park.reportFatigue()
}

function resolveEvent(eventId: DynamicEventId, accepted: boolean) {
  park.resolveEvent(eventId, accepted)
}

function resetExperience() {
  pendingUnlock.value = null
  collectionOpen.value = false
  servicesOpen.value = false
  selectedService.value = null
  navigation.clear()
  chatMessages.value = []
  chatError.value = ''
  park.reset()
}

onBeforeUnmount(() => {
  if (geolocationWatchId !== undefined && navigator.geolocation) navigator.geolocation.clearWatch(geolocationWatchId)
})

onMounted(syncJourneyRecord)

watch(() => park.state.value, syncJourneyRecord, { deep: true })

function finishJourney() {
  syncJourneyRecord()
  journeys.finish()
  navigateTo('/posttrip')
}
</script>

<template>
  <main class="inpark-frame">
    <div v-if="status === 'pending'" class="park-state-screen"><span>MAP</span><strong>正在唤醒园区地图</strong></div>
    <div v-else-if="error || !catalog" class="park-state-screen error"><strong>园区地图暂时无法载入</strong><p>请确认 Nuxt 服务已正常启动。</p></div>

    <TripEntryGate
      v-else-if="!tripState.started"
      :companions="catalog.companions"
      :has-plan="hasPlan"
      :selected-companion-id="pretripState.companionId"
      @choose-mode="beginWithMode"
      @request-plan="navigateTo('/pretrip')"
      @quick-start="quickStart"
    />

    <template v-else-if="activeCompanion">
      <JourneyBackHome stage="02 · 园中探险" />
      <section class="park-shell" :class="{ 'drawer-open': drawerExpanded }" :style="{ '--agent-accent': activeCompanion.accent }">
        <header class="park-header">
          <div class="park-title">
            <span>LIVE ADVENTURE · {{ tripState.mode === 'follow' ? '路线模式' : '自由模式' }}</span>
            <h1>{{ tripState.mode === 'follow' ? `下一站 · ${nextZoneName}` : '地图想去哪，就点哪里' }}</h1>
          </div>
          <button type="button" @click="resetExperience">重置</button>
          <div class="route-progress">
            <span><i :style="{ width: `${tripState.mode === 'follow' ? routeProgress : (tripState.visitedZoneIds.length / 6) * 100}%` }" /></span>
            <small>{{ tripState.mode === 'follow' ? `${tripState.routeCompletedIds.length}/${tripState.routeZoneIds.length}站` : `${tripState.visitedZoneIds.length}/6区` }}</small>
          </div>
          <p v-if="tripState.routeAdjusted">伙伴已根据实时客流调整后续顺序</p>
          <p v-else-if="tripState.breakInserted">河畔休息点已加入行程</p>
        </header>

        <div class="park-content">
          <section class="park-map-stage" aria-label="实时园区地图">
            <ParkMap
              :animals="catalog.animals"
              :route-zone-ids="tripState.routeZoneIds"
              :completed-zone-ids="tripState.routeCompletedIds"
              :current-zone-id="tripState.currentZoneId"
              :current-position="tripState.currentPosition"
              :current-zone-distance-meters="tripState.currentZoneDistanceMeters"
              :mode="tripState.mode ?? 'free'"
              :services="parkServices"
              :navigation-route="navigationRoute"
              @navigate="startNavigation"
              @simulate-arrival="updateLocation"
              @locate="locateMe"
            />
            <p v-if="locationError" class="location-error">{{ locationError }}</p>
          </section>

          <section class="park-drawer" aria-label="随行助手抽屉">
            <button class="drawer-handle" type="button" :aria-expanded="drawerExpanded" @click="drawerExpanded = !drawerExpanded">
              <i />
              <span>{{ drawerExpanded ? '收起随行对话' : '上拉问伙伴 / 看路线' }}</span>
              <strong>{{ drawerExpanded ? '⌄' : '⌃' }}</strong>
            </button>

            <div class="park-drawer-scroll">
              <div class="quick-status-row">
                <button type="button" @click="servicesOpen = true"><span>附近服务</span><strong>{{ selectedService?.name ?? '餐饮 · 洗手间 · 休息' }}</strong></button>
                <button type="button" @click="collectionOpen = true"><span>伙伴图鉴</span><strong>{{ tripState.unlockedCompanionIds.length }}/6 已解锁</strong></button>
              </div>

              <ParkAgentChat
                :companion="activeCompanion"
                :messages="chatMessages"
                :loading="chatLoading"
                :error="chatError"
                :next-zone-name="nextZoneName"
                :distance-meters="nextDistanceMeters"
                :walking-minutes="nextWalkingMinutes"
                @send="sendChat"
              />
            </div>
          </section>

          <nav class="park-bottom-nav" aria-label="园中功能">
            <button class="active" type="button"><span>图</span><small>地图</small></button>
            <button type="button" @click="servicesOpen = true"><span>+</span><small>服务</small></button>
            <button type="button" @click="collectionOpen = true"><span>{{ tripState.unlockedCompanionIds.length }}</span><small>伙伴</small></button>
            <button type="button" @click="finishJourney"><span>忆</span><small>结束</small></button>
          </nav>
        </div>
      </section>

      <CompanionCollectionSheet
        v-if="collectionOpen"
        :companions="catalog.companions"
        :unlocked-ids="tripState.unlockedCompanionIds"
        :active-id="tripState.activeCompanionId"
        :badge-zone-ids="tripState.badgeZoneIds"
        @close="collectionOpen = false"
        @select="selectCompanion"
      />

      <ParkServiceDrawer
        v-if="servicesOpen"
        :services="parkServices"
        :selected-id="selectedService?.id ?? null"
        :current-position="tripState.currentPosition"
        @close="servicesOpen = false"
        @select="selectService"
        @fatigue="reportFatigue"
      />

      <ZoneUnlockSheet
        v-if="pendingUnlock"
        :companion="pendingUnlock.companion"
        :active-companion="pendingUnlock.activeCompanion"
        :zone="pendingUnlock.zone"
        :already-known="pendingUnlock.alreadyKnown"
        @close="pendingUnlock = null"
      />

      <ParkEventCard
        v-if="tripState.activeEventId"
        :event-id="tripState.activeEventId"
        @resolve="resolveEvent(tripState.activeEventId!, $event)"
      />
    </template>

  </main>
</template>

<style scoped>
.inpark-frame { min-height: 100dvh; }
.park-state-screen { display: grid; width: min(100%,480px); min-height: 100dvh; margin: 0 auto; place-content: center; place-items: center; gap: 8px; background: var(--paper); color: var(--ink); text-align: center; }
.park-state-screen > span { display: grid; width: 72px; height: 72px; margin-bottom: 8px; place-items: center; border-radius: 24px; background: var(--forest); color: #f1c77d; font-family: var(--font-display); font-size: 16px; font-weight: 900; }
.park-state-screen p { margin: 0; color: var(--muted); font-size: 9px; }
.park-shell { display: flex; flex-direction: column; width: min(100%,480px); height: 100dvh; min-height: 100dvh; margin: 0 auto; overflow: hidden; background: var(--paper); }
.park-header { position: relative; flex: 0 0 auto; padding: calc(64px + env(safe-area-inset-top)) 18px 14px; background: radial-gradient(circle at 88% 16%, color-mix(in srgb, var(--agent-accent) 22%, transparent), transparent 26%), linear-gradient(150deg,#08271f,#16483a); color: #fff; }
.park-title { display: grid; gap: 4px; padding-right: 58px; }
.park-title span { color: #eac37d; font-size: 9px; font-weight: 900; letter-spacing: .12em; }
.park-title h1 { margin: 0; font-family: var(--font-display); font-size: 21px; }
.park-header > button { position: absolute; top: calc(66px + env(safe-area-inset-top)); right: 17px; min-width: 44px; min-height: 34px; padding: 7px 8px; border: 1px solid rgba(255,255,255,.16); border-radius: 9px; background: rgba(255,255,255,.08); color: rgba(255,255,255,.72); font-size: 10px; }
.route-progress { display: grid; grid-template-columns: 1fr auto; align-items: center; margin-top: 11px; gap: 8px; }
.route-progress > span { height: 4px; overflow: hidden; border-radius: 999px; background: rgba(255,255,255,.13); }
.route-progress i { display: block; height: 100%; border-radius: inherit; background: #f1c77d; transition: width 260ms ease; }
.route-progress small { color: rgba(255,255,255,.66); font-size: 10px; }
.park-header > p { margin: 8px 0 0; color: #9de0b8; font-size: 10px; }
.park-content { position: relative; flex: 1 1 auto; min-height: 0; overflow: hidden; }
.park-map-stage { position: absolute; inset: 0; padding: 0 0 calc(126px + env(safe-area-inset-bottom)); }
.drawer-open .park-map-stage { padding-bottom: min(54dvh, 430px); }
.park-map-stage :deep(.map-shell) { display: grid; height: 100%; grid-template-rows: auto minmax(0,1fr) auto; }
.park-map-stage :deep(.map-shell) { border-right: 0; border-left: 0; border-radius: 0; box-shadow: none; }
.park-map-stage :deep(.map-toolbar) { padding-right: 18px; padding-left: 18px; }
.park-map-stage :deep(.map-viewport) { min-height: 0; aspect-ratio: auto; }
.park-drawer { position: fixed; z-index: 40; bottom: 0; left: 50%; width: min(100%,480px); height: min(56dvh, 470px); padding: 9px 12px calc(82px + env(safe-area-inset-bottom)); border: 1px solid rgba(36,58,47,.1); border-bottom: 0; border-radius: 28px 28px 0 0; background: rgba(251,247,238,.96); box-shadow: 0 -24px 54px rgba(7,31,24,.18); transform: translate3d(-50%, calc(100% - 112px - env(safe-area-inset-bottom)), 0); transition: transform 280ms var(--ease-out), height 280ms var(--ease-out); backdrop-filter: blur(18px); }
.drawer-open .park-drawer { transform: translate3d(-50%, 0, 0); }
.drawer-handle { display: grid; width: 100%; min-height: 44px; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 8px; border: 0; background: transparent; color: var(--forest); }
.drawer-handle i { justify-self: end; width: 42px; height: 5px; border-radius: 999px; background: #cfc7b6; }
.drawer-handle span { color: #273f36; font-size: 11px; font-weight: 900; }
.drawer-handle strong { justify-self: start; color: #bd5c3f; font-size: 18px; line-height: 1; }
.park-drawer-scroll { height: calc(100% - 44px); padding: 0 0 14px; overflow-y: auto; overscroll-behavior: contain; scrollbar-width: thin; scrollbar-color: #c9b79a transparent; }
.park-drawer-scroll::-webkit-scrollbar { width: 8px; }
.park-drawer-scroll::-webkit-scrollbar-thumb { border: 2px solid transparent; border-radius: 999px; background: #c9b79a; background-clip: content-box; }
.quick-status-row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.location-error { position: absolute; z-index: 8; right: 18px; bottom: calc(126px + env(safe-area-inset-bottom)); left: 18px; margin: 0; padding: 8px 10px; border-radius: 10px; background: #fff0e8; color: #a43f2d; font-size: 9px; box-shadow: 0 10px 24px rgba(90,44,30,.12); }
.quick-status-row button { display: grid; min-height: 62px; padding: 11px; gap: 2px; border: 1px solid var(--line); border-radius: 13px; background: var(--surface); color: inherit; text-align: left; }
.quick-status-row span { color: var(--accent-dark); font-size: 9px; font-weight: 900; }
.quick-status-row strong { overflow: hidden; color: var(--ink); font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.park-drawer :deep(.agent-chat) { margin-top: 8px; box-shadow: none; }
.park-drawer :deep(.messages) { max-height: min(20dvh, 150px); min-height: 80px; }
.park-bottom-nav { position: fixed; z-index: 50; right: 0; bottom: 0; left: 0; display: grid; grid-template-columns: repeat(4,1fr); width: min(100%,480px); margin: 0 auto; padding: 7px 12px max(7px, env(safe-area-inset-bottom)); border-top: 1px solid var(--line); background: rgba(251,250,245,.94); box-shadow: 0 -12px 32px rgba(7,31,24,.12); backdrop-filter: blur(16px); }
.park-bottom-nav button { display: grid; min-height: 50px; padding: 4px; place-items: center; gap: 2px; border: 0; border-radius: 11px; background: transparent; color: var(--muted); }
.park-bottom-nav span { display: grid; width: 27px; height: 27px; place-items: center; border-radius: 8px; background: #e8ece6; font-size: 10px; font-weight: 900; }
.park-bottom-nav small { font-size: 9px; font-weight: 800; }
.park-bottom-nav button.active { background: var(--forest-soft); color: var(--forest); }
.park-bottom-nav button.active span { background: var(--forest); color: #f1c77d; }
</style>
