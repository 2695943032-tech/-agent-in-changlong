<script setup lang="ts">
import type { AnimalId, AnimalPoi, GeoPoint } from '../../../shared/types/pretrip'
import type { ParkNavigationRoute, ParkNavigationTarget, ParkService, TripMode } from '../../../shared/types/park'
import ParkRasterMap from '../map/ParkRasterMap.vue'

const props = defineProps<{
  animals: AnimalPoi[]
  routeZoneIds: readonly AnimalId[]
  completedZoneIds: readonly AnimalId[]
  currentZoneId: AnimalId | null
  currentPosition: GeoPoint | null
  currentZoneDistanceMeters: number | null
  mode: TripMode
  services: ParkService[]
  navigationRoute: ParkNavigationRoute | null
}>()

const emit = defineEmits<{
  navigate: [target: ParkNavigationTarget]
  simulateArrival: [position: GeoPoint]
  locate: []
}>()

const viewport = useTemplateRef<HTMLElement>('viewport')
const transform = reactive({ scale: 1, x: 0, y: 0 })
const pointers = new Map<number, { x: number, y: number }>()
let previousCentroid: { x: number, y: number } | null = null
let previousDistance = 0

const mapStyle = computed(() => ({
  transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale})`,
}))

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value))
}

function clampPosition() {
  const stage = viewport.value
  if (!stage) return
  transform.x = clamp(transform.x, Math.min(0, stage.clientWidth - stage.clientWidth * transform.scale), 0)
  transform.y = clamp(transform.y, Math.min(0, stage.clientHeight - stage.clientHeight * transform.scale), 0)
}

function applyScale(value: number, centerX?: number, centerY?: number) {
  const stage = viewport.value
  if (!stage) return
  const next = clamp(value, 1, 3.5)
  const ratio = next / transform.scale
  const x = centerX ?? stage.clientWidth / 2
  const y = centerY ?? stage.clientHeight / 2
  transform.x = x - (x - transform.x) * ratio
  transform.y = y - (y - transform.y) * ratio
  transform.scale = next
  clampPosition()
}

function centroid(values: Array<{ x: number, y: number }>) {
  return {
    x: values.reduce((sum, item) => sum + item.x, 0) / values.length,
    y: values.reduce((sum, item) => sum + item.y, 0) / values.length,
  }
}

function pointerDistance(values: Array<{ x: number, y: number }>) {
  return values.length < 2 ? 0 : Math.hypot(values[0]!.x - values[1]!.x, values[0]!.y - values[1]!.y)
}

function snapshot() {
  const values = [...pointers.values()]
  previousCentroid = values.length ? centroid(values) : null
  previousDistance = pointerDistance(values)
}

function onPointerDown(event: PointerEvent) {
  if (!(event.currentTarget instanceof HTMLElement)) return
  if (event.target instanceof Element && event.target.closest('.zone, .service-marker')) return
  event.currentTarget.setPointerCapture(event.pointerId)
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
  snapshot()
}

function onPointerMove(event: PointerEvent) {
  if (!pointers.has(event.pointerId) || !previousCentroid) return
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
  const values = [...pointers.values()]
  const next = centroid(values)
  transform.x += next.x - previousCentroid.x
  transform.y += next.y - previousCentroid.y
  if (values.length > 1 && previousDistance > 0) {
    const rect = viewport.value?.getBoundingClientRect()
    const distance = pointerDistance(values)
    if (rect) applyScale(transform.scale * distance / previousDistance, next.x - rect.left, next.y - rect.top)
    previousDistance = distance
  }
  previousCentroid = next
  clampPosition()
}

function finishPointer(event: PointerEvent) {
  pointers.delete(event.pointerId)
  snapshot()
}

function onWheel(event: WheelEvent) {
  event.preventDefault()
  const rect = viewport.value?.getBoundingClientRect()
  if (rect) applyScale(transform.scale + (event.deltaY > 0 ? -.24 : .24), event.clientX - rect.left, event.clientY - rect.top)
}

function resetView() {
  Object.assign(transform, { scale: 1, x: 0, y: 0 })
}

function selectZone(zone: AnimalPoi) {
  emit('simulateArrival', { longitude: zone.longitude, latitude: zone.latitude })
}

function selectService(service: ParkService) {
  emit('navigate', service)
}
</script>

<template>
  <section class="map-shell">
    <header class="map-toolbar">
      <div>
        <span>LIVE GIS · 50M GEOFENCE</span>
        <strong>{{ navigationRoute ? `正在前往 · ${navigationRoute.target.name}` : currentZoneId ? `已进入${animals.find(item => item.id === currentZoneId)?.name ?? '展区'}围栏` : '点击动物标记，模拟抵达展区' }}</strong>
      </div>
      <button type="button" @click="emit('locate')">◎ 实时定位</button>
    </header>

    <div
      ref="viewport"
      class="map-viewport"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="finishPointer"
      @pointercancel="finishPointer"
      @wheel="onWheel"
    >
      <div class="map-canvas" :style="mapStyle">
        <ParkRasterMap
          :animals="animals"
          :route-zone-ids="mode === 'follow' ? routeZoneIds : []"
          :completed-zone-ids="completedZoneIds"
          :current-position="currentPosition"
          :current-zone-id="currentZoneId"
          :services="services"
          :navigation-route="navigationRoute"
          interactive
          show-geofences
          show-services
          @select-zone="selectZone"
          @select-service="selectService"
        />
      </div>
    </div>

    <Transition name="route-card">
      <aside v-if="navigationRoute" class="route-card" aria-live="polite">
        <div><span>红线导航中</span><strong>{{ navigationRoute.target.name }}</strong></div>
        <p><b>{{ navigationRoute.distanceMeters }}m</b><small>约 {{ navigationRoute.walkingMinutes }} 分钟</small></p>
        <button
          v-if="navigationRoute.target.kind === 'animal'"
          type="button"
          @click="emit('simulateArrival', { longitude: navigationRoute.target.longitude, latitude: navigationRoute.target.latitude })"
        >演示抵达</button>
      </aside>
    </Transition>

    <div class="map-legend">
      <span><i class="route" />实时最短路线</span>
      <span><i class="fence" />50 米触发区</span>
      <strong v-if="currentZoneDistanceMeters !== null">距围栏中心 {{ Math.round(currentZoneDistanceMeters) }}m</strong>
      <strong v-else>双指缩放 · 单指拖动</strong>
    </div>

    <div class="zoom-controls" aria-label="地图缩放控制">
      <button type="button" aria-label="放大地图" @click="applyScale(transform.scale + .4)">＋</button>
      <button type="button" aria-label="缩小地图" @click="applyScale(transform.scale - .4)">−</button>
      <button type="button" aria-label="重置地图" @click="resetView">⌂</button>
    </div>
  </section>
</template>

<style scoped>
.map-shell { position: relative; overflow: hidden; border: 1px solid #d9d1c1; border-radius: 22px; background: #f8f4e9; box-shadow: 0 16px 40px rgba(20,58,46,.1); }
.map-toolbar { display: flex; align-items: center; justify-content: space-between; padding: 14px 15px 12px; gap: 10px; }
.map-toolbar div { display: grid; gap: 3px; }
.map-toolbar span { color: #b44d36; font-size: 9px; font-weight: 900; letter-spacing: .12em; }
.map-toolbar strong { color: #173f34; font-size: 12px; }
.map-toolbar button { padding: 8px 10px; border: 1px solid #d6cbb8; border-radius: 99px; background: #fffaf0; color: #174b3b; font-size: 9px; font-weight: 900; }
.map-viewport { position: relative; aspect-ratio: 4096 / 5120; overflow: hidden; background: #e6e1d3; cursor: grab; touch-action: none; }
.map-viewport:active { cursor: grabbing; }
.map-canvas { position: absolute; inset: 0; width: 100%; height: 100%; transform-origin: 0 0; will-change: transform; }
.map-legend { display: flex; align-items: center; padding: 10px 14px; gap: 11px; color: #64756d; font-size: 8px; }
.map-legend span { display: flex; align-items: center; gap: 4px; }
.map-legend strong { margin-left: auto; color: #173f34; font-size: 8px; }
.map-legend i { display: inline-block; width: 15px; height: 4px; border-radius: 99px; }
.map-legend .route { background: #c95237; }
.map-legend .fence { height: 10px; border: 1px dashed #c5974e; background: rgba(211,155,69,.1); }
.route-card { position: absolute; z-index: 7; left: 10px; right: 52px; bottom: 45px; display: grid; grid-template-columns: 1fr auto auto; align-items: center; min-height: 58px; padding: 10px 11px; gap: 10px; border: 1px solid rgba(130,46,34,.16); border-radius: 15px; background: rgba(255,250,240,.96); box-shadow: 0 12px 30px rgba(74,36,25,.16); backdrop-filter: blur(14px); }
.route-card div { display: grid; gap: 1px; }
.route-card span { color: #bd4b37; font-size: 8px; font-weight: 900; }
.route-card strong { max-width: 120px; overflow: hidden; color: #173f34; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.route-card p { display: grid; margin: 0; text-align: right; }
.route-card b { color: #bd4b37; font-size: 12px; }
.route-card small { color: #6e7a74; font-size: 7px; }
.route-card button { min-height: 34px; padding: 0 9px; border: 0; border-radius: 10px; background: #174b3b; color: #fff; font-size: 8px; font-weight: 900; }
.route-card-enter-active,.route-card-leave-active { transition: opacity .25s var(--ease-out), transform .25s var(--ease-out); }
.route-card-enter-from,.route-card-leave-to { opacity: 0; transform: translateY(10px) scale(.98); }
.zoom-controls { position: absolute; z-index: 8; right: 10px; bottom: 45px; display: grid; overflow: hidden; border: 1px solid rgba(18,60,50,.12); border-radius: 13px; background: rgba(255,250,240,.94); box-shadow: 0 8px 22px rgba(20,52,42,.14); backdrop-filter: blur(10px); }
.zoom-controls button { width: 34px; height: 33px; border: 0; background: transparent; color: #174b3b; font-size: 15px; font-weight: 900; }
.zoom-controls button + button { border-top: 1px solid #e1d9c9; }
</style>
