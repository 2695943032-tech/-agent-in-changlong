<script setup lang="ts">
import { computed } from 'vue'
import type { AnimalId, AnimalPoi, GeoPoint } from '../../../shared/types/pretrip'
import type { ParkNavigationRoute, ParkService } from '../../../shared/types/park'
import { parkMapMeta } from '#shared/data/parkGeometry.generated'
import { parkLiveLandmarks, parkLiveRoads } from '#shared/data/parkLiveData.generated'
import { routePath } from '#shared/utils/parkGeo'

const props = withDefaults(defineProps<{
  animals: readonly AnimalPoi[]
  routeZoneIds?: readonly AnimalId[]
  completedZoneIds?: readonly AnimalId[]
  currentPosition?: GeoPoint | null
  currentZoneId?: AnimalId | null
  interactive?: boolean
  showGeofences?: boolean
  services?: readonly ParkService[]
  showServices?: boolean
  navigationRoute?: ParkNavigationRoute | null
  actualRouteZoneIds?: readonly AnimalId[]
}>(), {
  routeZoneIds: () => [],
  completedZoneIds: () => [],
  currentPosition: null,
  currentZoneId: null,
  interactive: false,
  showGeofences: false,
  services: () => [],
  showServices: false,
  navigationRoute: null,
  actualRouteZoneIds: () => [],
})

const emit = defineEmits<{
  selectZone: [zone: AnimalPoi]
  selectService: [service: ParkService]
}>()

const tileSize = 256
// Use the detailed local tile set instead of the coarse full-park level.
// Keep the complete overview layer until the detail viewport is regenerated
// with matching source bounds.
const detailMode = computed(() => false)
const tileZoom = computed(() => detailMode.value ? 7 : 5)
const tileColumns = computed(() => detailMode.value ? 62 : 16)
const tileRows = computed(() => detailMode.value ? 78 : 20)
const stageWidth = computed(() => tileColumns.value * tileSize)
const stageHeight = computed(() => tileRows.value * tileSize)
const mapViewBox = computed(() => {
  const insetX = 120
  const insetY = 140
  return `${insetX} ${insetY} ${stageWidth.value - insetX * 2} ${stageHeight.value - insetY * 2}`
})
const sourcePixelDegrees = 0.000001
const sourcePixelDivisor = computed(() => detailMode.value ? 1 : 4)
const topLeftLongitude = 113.30305172543962
const topLeftLatitude = 23.01306960279202

const tiles = computed(() => {
  const columns = tileColumns.value
  const rows = tileRows.value
  if (!detailMode.value) return Array.from({ length: columns * rows }, (_, index) => ({ x: index % columns, y: Math.floor(index / columns) }))
  const viewport = mapViewport.value?.getBoundingClientRect()
  const visibleWidth = columns / zoom.value
  const visibleHeight = rows / zoom.value
  const offsetX = viewport ? pan.x / viewport.width * columns / zoom.value : 0
  const offsetY = viewport ? pan.y / viewport.height * rows / zoom.value : 0
  const startX = Math.max(0, Math.floor((columns - visibleWidth) / 2 - offsetX) - 2)
  const endX = Math.min(columns, Math.ceil(startX + visibleWidth) + 4)
  const startY = Math.max(0, Math.floor((rows - visibleHeight) / 2 - offsetY) - 2)
  const endY = Math.min(rows, Math.ceil(startY + visibleHeight) + 4)
  const result = [] as Array<{ x: number, y: number }>
  for (let y = startY; y < endY; y++) for (let x = startX; x < endX; x++) result.push({ x, y })
  return result
})

function geoToRasterPoint(point: GeoPoint) {
  return {
    x: (point.longitude - topLeftLongitude) / sourcePixelDegrees / sourcePixelDivisor.value,
    y: (topLeftLatitude - point.latitude) / sourcePixelDegrees / sourcePixelDivisor.value,
  }
}

function vectorToRasterPoint([x, y]: readonly [number, number]) {
  const { bounds, viewWidth, viewHeight } = parkMapMeta
  return geoToRasterPoint({
    longitude: bounds.minLon + x / viewWidth * (bounds.maxLon - bounds.minLon),
    latitude: bounds.maxLat - y / viewHeight * (bounds.maxLat - bounds.minLat),
  })
}

function pointsAttribute(points: readonly (readonly [number, number])[]) {
  return points.map(point => {
    const projected = vectorToRasterPoint(point)
    return `${projected.x},${projected.y}`
  }).join(' ')
}

function geographicPointsAttribute(points: readonly (readonly [number, number])[]) {
  return points.map(([longitude, latitude]) => {
    const projected = geoToRasterPoint({ longitude, latitude })
    return `${projected.x},${projected.y}`
  }).join(' ')
}

// The raster tiles already contain the visitor-facing paths. Hide the imported
// perimeter/service network, which adds distracting roads outside the park.
const surveyedRoads: Array<{ id: string, kind: string, points: string }> = []
const visibleLandmarks = parkLiveLandmarks.filter(landmark => landmark.name !== '珑翠花园')

const routeSegments = computed(() => {
  const nodes = ['entrance', ...props.routeZoneIds]
  return nodes.slice(0, -1).map((from, index) => ({
    id: `${from}:${nodes[index + 1]}`,
    points: pointsAttribute(routePath(from!, nodes[index + 1]!)),
  }))
})

const actualRouteSegments = computed(() => {
  const nodes = ['entrance', ...props.actualRouteZoneIds]
  return nodes.slice(0, -1).map((from, index) => ({
    id: `actual-${from}:${nodes[index + 1]}`,
    points: pointsAttribute(routePath(from!, nodes[index + 1]!)),
  }))
})

const navigationPoints = computed(() => props.navigationRoute?.path.map(point => {
  const projected = vectorToRasterPoint([point.x, point.y])
  return `${projected.x},${projected.y}`
}).join(' ') ?? '')

const positionPoint = computed(() => props.currentPosition ? geoToRasterPoint(props.currentPosition) : null)
const mapViewport = useTemplateRef<HTMLElement>('mapViewport')
const zoom = shallowRef(1.15)
const pan = reactive({ x: 0, y: 0 })
let pinch: { distance: number, zoom: number } | null = null
let drag: { x: number, y: number, panX: number, panY: number } | null = null
const mapTransform = computed(() => ({ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom.value})` }))
function pointDistance(a: Touch, b: Touch) { return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) }
function constrainPan() {
  const rect = mapViewport.value?.getBoundingClientRect()
  if (!rect) return
  if (zoom.value < 1.3) {
    pan.x = 0
    pan.y = 0
    return
  }
  const maxX = rect.width * (zoom.value - 1) / 2
  const maxY = rect.height * (zoom.value - 1) / 2
  pan.x = Math.max(-maxX, Math.min(maxX, pan.x))
  pan.y = Math.max(-maxY, Math.min(maxY, pan.y))
}
function setZoom(next: number) { zoom.value = Math.max(1.15, next); constrainPan() }
function onWheel(event: WheelEvent) { event.preventDefault(); setZoom(zoom.value * (event.deltaY > 0 ? .88 : 1.14)) }
function onPointerDown(event: PointerEvent) { drag = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y }; mapViewport.value?.setPointerCapture(event.pointerId) }
function onPointerMove(event: PointerEvent) { if (!drag || zoom.value < 1.3) return; pan.x = drag.panX + event.clientX - drag.x; pan.y = drag.panY + event.clientY - drag.y; constrainPan() }
function onPointerUp() { drag = null }
function onTouchStart(event: TouchEvent) { if (event.touches.length === 2) pinch = { distance: pointDistance(event.touches[0]!, event.touches[1]!), zoom: zoom.value } }
function onTouchMove(event: TouchEvent) { if (!pinch || event.touches.length !== 2) return; event.preventDefault(); setZoom(pinch.zoom * pointDistance(event.touches[0]!, event.touches[1]!) / pinch.distance) }
function onTouchEnd() { pinch = null }

function fenceRadius(latitude: number, meters: number) {
  const latitudeMetersPerPixel = sourcePixelDegrees * 111320 / sourcePixelDivisor.value
  const longitudeMetersPerPixel = latitudeMetersPerPixel * Math.cos(latitude * Math.PI / 180)
  return { rx: meters / longitudeMetersPerPixel, ry: meters / latitudeMetersPerPixel }
}

function selectZone(zone: AnimalPoi) {
  if (props.interactive) emit('selectZone', zone)
}

function selectService(service: ParkService) {
  if (props.interactive) emit('selectService', service)
}

const serviceGlyphs: Record<ParkService['serviceKind'], string> = {
  dining: '食', restroom: '卫', family: '亲', medical: '医', rest: '休', show: '演', photo: '拍', retail: '购',
}
</script>

<template>
  <div ref="mapViewport" class="raster-map" :class="{ interactive }" @wheel="onWheel" @pointerdown="onPointerDown" @pointermove="onPointerMove" @pointerup="onPointerUp" @pointercancel="onPointerUp" @touchstart="onTouchStart" @touchmove="onTouchMove" @touchend="onTouchEnd">
    <svg
      class="map-stage"
      :style="mapTransform"
      :viewBox="mapViewBox"
      role="img"
      aria-label="长隆野生动物世界园区地图"
    >
      <image
        v-for="tile in tiles"
        :key="`${tileZoom}-${tile.x}-${tile.y}`"
        class="map-tile"
        :href="`/maps/chimelong/${tileZoom}/${tile.x}/${tile.y}.webp`"
        :x="tile.x * tileSize"
        :y="tile.y * tileSize"
        :width="tileSize"
        :height="tileSize"
        preserveAspectRatio="none"
      />
      <defs>
        <filter id="route-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="8" stdDeviation="8" flood-color="#9d3f2d" flood-opacity=".25" />
        </filter>
      </defs>

      <g class="surveyed-road-layer" aria-label="GeoJSON 园区路网">
        <polyline
          v-for="road in surveyedRoads"
          :key="road.id"
          :points="road.points"
          :class="`surveyed-road ${road.kind}`"
        />
      </g>

        <g v-if="showGeofences" class="geofences">
          <ellipse
            v-for="zone in animals"
            :key="`fence-${zone.id}`"
            :cx="geoToRasterPoint(zone).x"
            :cy="geoToRasterPoint(zone).y"
            :rx="fenceRadius(zone.latitude, zone.geofenceRadiusMeters).rx"
            :ry="fenceRadius(zone.latitude, zone.geofenceRadiusMeters).ry"
            :class="{ active: currentZoneId === zone.id }"
          />
        </g>

        <g class="route-layer">
          <polyline v-for="segment in routeSegments" :key="segment.id" :points="segment.points" class="plan-halo" />
          <polyline v-for="segment in routeSegments" :key="`line-${segment.id}`" :points="segment.points" class="plan-line" />
        </g>
        <g v-if="navigationPoints" class="navigation-layer" filter="url(#route-glow)">
          <polyline :points="navigationPoints" class="navigation-halo" />
          <polyline :points="navigationPoints" class="navigation-line" />
        </g>
        <g v-if="actualRouteSegments.length" class="actual-route-layer">
          <polyline v-for="segment in actualRouteSegments" :key="segment.id" :points="segment.points" class="actual-halo" />
          <polyline v-for="segment in actualRouteSegments" :key="`line-${segment.id}`" :points="segment.points" class="actual-line" />
        </g>

        <g v-if="showServices" class="service-layer">
          <g
            v-for="service in services"
            :key="service.id"
            class="service-marker"
            :class="{ target: navigationRoute?.target.id === service.id, demo: service.source === 'demo' }"
            :transform="`translate(${geoToRasterPoint(service).x} ${geoToRasterPoint(service).y})`"
            :role="interactive ? 'button' : undefined"
            :tabindex="interactive ? 0 : undefined"
            :aria-label="interactive ? `导航到${service.name}` : undefined"
            @click.stop="selectService(service)"
            @keydown.enter.stop="selectService(service)"
          >
            <rect x="-46" y="-46" width="92" height="92" rx="28" />
            <text y="16" text-anchor="middle">{{ serviceGlyphs[service.serviceKind] }}</text>
          </g>
        </g>

        <g class="landmark-layer" aria-label="GeoJSON 园区兴趣点">
          <g
            v-for="landmark in visibleLandmarks"
            :key="landmark.id"
            class="landmark"
            :transform="`translate(${geoToRasterPoint(landmark).x} ${geoToRasterPoint(landmark).y})`"
          >
            <circle r="18" />
            <text y="-28" text-anchor="middle">{{ landmark.name }}</text>
          </g>
        </g>

        <g class="zone-layer">
          <g
            v-for="(zone, index) in animals"
            :key="zone.id"
            class="zone"
            :class="{ current: currentZoneId === zone.id, completed: completedZoneIds.includes(zone.id), planned: routeZoneIds.includes(zone.id) }"
            :transform="`translate(${geoToRasterPoint(zone).x} ${geoToRasterPoint(zone).y})`"
            :role="interactive ? 'button' : undefined"
            :tabindex="interactive ? 0 : undefined"
            :aria-label="interactive ? `模拟前往${zone.name}` : undefined"
            @pointerdown.stop
            @click.stop="selectZone(zone)"
            @keydown.enter.stop="selectZone(zone)"
          >
            <!-- The visible marker stays compact; this transparent circle makes the label area easy to tap. -->
            <circle r="170" class="zone-hit-area" />
            <circle r="64" class="zone-ring" />
            <circle r="46" class="zone-core" />
            <text y="16" text-anchor="middle">{{ routeZoneIds.includes(zone.id) ? routeZoneIds.indexOf(zone.id) + 1 : index + 1 }}</text>
            <text y="124" text-anchor="middle" class="zone-name">{{ zone.name }}</text>
          </g>
        </g>

        <g v-if="positionPoint" class="my-position" :transform="`translate(${positionPoint.x} ${positionPoint.y})`">
          <circle r="84" class="position-pulse" />
          <path d="M0-63c-36 0-63 27-63 63 0 48 63 105 63 105S63 48 63 0C63-36 36-63 0-63Z" />
          <circle cy="-3" r="21" />
        </g>
    </svg>
  </div>
</template>

<style scoped>
.raster-map { width: 100%; height: 100%; overflow: hidden; background: #8bb579; touch-action: none; cursor: grab; }
.map-stage { display: block; width: 100%; height: 100%; overflow: hidden; transform-origin: center; transition: transform 80ms linear; background: #8bb579; }
.raster-map:active { cursor: grabbing; }
.map-tile { pointer-events: none; }
.surveyed-road { fill: none; stroke-linecap: round; stroke-linejoin: round; pointer-events: none; }
.surveyed-road.footway,.surveyed-road.pedestrian,.surveyed-road.path,.surveyed-road.steps { stroke: rgba(255,255,255,.82); stroke-width: 12; }
.surveyed-road.service,.surveyed-road.unclassified { stroke: rgba(124,96,53,.46); stroke-width: 15; }
.landmark { pointer-events: none; }
.landmark circle { fill: #fffaf0; stroke: #496b4d; stroke-width: 6; }
.landmark text { paint-order: stroke; fill: #173f34; stroke: rgba(255,250,240,.92); stroke-width: 10px; stroke-linejoin: round; font-size: 32px; font-weight: 800; }
.geofences ellipse { fill: rgba(211,155,69,.11); stroke: #c5974e; stroke-width: 10; stroke-dasharray: 30 25; }
.geofences ellipse.active { fill: rgba(205,91,57,.17); stroke: #c14e36; stroke-width: 16; }
.plan-halo,.plan-line,.navigation-halo,.navigation-line,.actual-halo,.actual-line { fill: none; stroke-linecap: round; stroke-linejoin: round; }
.plan-halo { stroke: rgba(255,247,232,.86); stroke-width: 40; }
.plan-line { stroke: #b88a45; stroke-width: 16; stroke-dasharray: 12 48; }
.navigation-halo { stroke: #fff7ee; stroke-width: 52; }
.navigation-line { stroke: #e34b36; stroke-width: 24; animation: route-draw .55s var(--ease-out) both; }
.actual-halo { stroke: rgba(255,250,240,.88); stroke-width: 36; }
.actual-line { stroke: #2e7d68; stroke-width: 20; }
.service-marker { cursor: pointer; outline: none; }
.service-marker rect { fill: #fffaf0; stroke: #174b3b; stroke-width: 9; }
.service-marker text { fill: #174b3b; font-size: 37px; font-weight: 900; pointer-events: none; }
.service-marker.demo rect { stroke-dasharray: 12 9; }
.service-marker.target rect { fill: #e34b36; stroke: #fffaf0; stroke-width: 14; }
.service-marker.target text { fill: #fff; }
.zone { cursor: default; outline: none; }
.interactive .zone { cursor: pointer; }
.zone-hit-area { fill: transparent; stroke: transparent; pointer-events: all; }
.zone-ring { fill: #fffaf0; stroke: #174b3b; stroke-width: 12; }
.zone-core { fill: #174b3b; }
.zone.planned .zone-core { fill: #c95237; }
.zone.completed .zone-core { fill: #4f8569; }
.zone.current .zone-ring { stroke: #e1a84d; stroke-width: 21; }
.zone text { fill: #fff; font-size: 45px; font-weight: 900; pointer-events: none; }
.zone .zone-name { paint-order: stroke; fill: #173f34; stroke: #fffaf0; stroke-width: 20px; stroke-linejoin: round; font-size: 52px; }
.my-position path { fill: #ef5b3d; stroke: #fff; stroke-width: 15; }
.my-position > circle:not(.position-pulse) { fill: #fff; }
.position-pulse { fill: rgba(239,91,61,.16); animation: position-pulse 1.6s ease-in-out infinite; }
@keyframes position-pulse { 50% { r: 129px; opacity: .2; } }
@keyframes route-draw { from { opacity: 0; stroke-dasharray: 0 8000; } to { opacity: 1; stroke-dasharray: 8000 0; } }
@media (prefers-reduced-motion: reduce) { .position-pulse { animation: none; } }
</style>
