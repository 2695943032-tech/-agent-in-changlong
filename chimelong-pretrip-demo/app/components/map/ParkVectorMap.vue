<script setup lang="ts">
import type { AnimalId, AnimalPoi, GeoPoint } from '../../../shared/types/pretrip'
import type { ParkNavigationRoute, ParkService } from '../../../shared/types/park'
import { parkMapAreas, parkMapMeta, parkMapRoads } from '#shared/data/parkGeometry.generated'
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

const boundary = computed(() => parkMapAreas.find(area => area.kind === 'boundary'))
const filledAreas = computed(() => parkMapAreas.filter(area => area.kind !== 'boundary'))
const routeSegments = computed(() => {
  const nodes = ['entrance', ...props.routeZoneIds]
  return nodes.slice(0, -1).map((from, index) => ({
    id: `${from}:${nodes[index + 1]}`,
    points: routePath(from!, nodes[index + 1]!).map(point => point.join(',')).join(' '),
  }))
})
const navigationPoints = computed(() => props.navigationRoute?.path.map(point => `${point.x},${point.y}`).join(' ') ?? '')
const actualRouteSegments = computed(() => {
  const nodes = ['entrance', ...props.actualRouteZoneIds]
  return nodes.slice(0, -1).map((from, index) => ({
    id: `actual-${from}:${nodes[index + 1]}`,
    points: routePath(from!, nodes[index + 1]!).map(point => point.join(',')).join(' '),
  }))
})

const positionPoint = computed(() => {
  if (!props.currentPosition) return null
  const { bounds, viewWidth, viewHeight, lonScale } = parkMapMeta
  return {
    x: (props.currentPosition.longitude - bounds.minLon) * lonScale
      / ((bounds.maxLon - bounds.minLon) * lonScale) * viewWidth,
    y: (bounds.maxLat - props.currentPosition.latitude)
      / (bounds.maxLat - bounds.minLat) * viewHeight,
  }
})

const fenceRadius = 50 / 1178 * parkMapMeta.viewWidth

function selectZone(zone: AnimalPoi) {
  if (props.interactive) emit('selectZone', zone)
}

function selectService(service: ParkService) {
  if (props.interactive) emit('selectService', service)
}

const serviceGlyphs: Record<ParkService['serviceKind'], string> = {
  dining: '餐', restroom: '厕', family: '亲', medical: '医', rest: '歇', show: '演', photo: '拍', retail: '店',
}
</script>

<template>
  <div class="vector-map" :class="{ interactive }">
    <svg
      :viewBox="`0 0 ${parkMapMeta.viewWidth} ${parkMapMeta.viewHeight}`"
      role="img"
      aria-label="长隆野生动物世界园区矢量导览地图"
    >
      <defs>
        <pattern id="park-grain" width="18" height="18" patternUnits="userSpaceOnUse">
          <circle cx="3" cy="4" r="1" fill="#2e5c4a" opacity=".08" />
        </pattern>
        <filter id="route-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#9d3f2d" flood-opacity=".2" />
        </filter>
      </defs>

      <rect width="1000" height="951" fill="#f3efe3" />
      <path
        v-for="(area, index) in filledAreas"
        :key="`area-${index}`"
        :d="area.path"
        class="area"
        :class="`area-${area.kind}`"
      />
      <path v-if="boundary" :d="boundary.path" class="park-boundary" />
      <path
        v-for="(road, index) in parkMapRoads"
        :key="`road-${index}`"
        :d="road.path"
        class="road"
        :class="`road-${road.kind}`"
      />
      <rect width="1000" height="951" fill="url(#park-grain)" pointer-events="none" />

      <g v-if="showGeofences" class="geofences">
        <circle
          v-for="zone in animals"
          :key="`fence-${zone.id}`"
          :cx="zone.x / 100 * parkMapMeta.viewWidth"
          :cy="zone.y / 100 * parkMapMeta.viewHeight"
          :r="fenceRadius"
          :class="{ active: currentZoneId === zone.id }"
        />
      </g>

      <g class="route-layer">
        <polyline
          v-for="segment in routeSegments"
          :key="segment.id"
          :points="segment.points"
          class="plan-halo"
        />
        <polyline
          v-for="segment in routeSegments"
          :key="`line-${segment.id}`"
          :points="segment.points"
          class="plan-line"
        />
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
          :transform="`translate(${service.x / 100 * parkMapMeta.viewWidth} ${service.y / 100 * parkMapMeta.viewHeight})`"
          :role="interactive ? 'button' : undefined"
          :tabindex="interactive ? 0 : undefined"
          :aria-label="interactive ? `导航到${service.name}` : undefined"
          @click.stop="selectService(service)"
          @keydown.enter.stop="selectService(service)"
        >
          <rect x="-15" y="-15" width="30" height="30" rx="9" />
          <text y="5" text-anchor="middle">{{ serviceGlyphs[service.serviceKind] }}</text>
        </g>
      </g>

      <g class="zone-layer">
        <g
          v-for="(zone, index) in animals"
          :key="zone.id"
          class="zone"
          :class="{
            current: currentZoneId === zone.id,
            completed: completedZoneIds.includes(zone.id),
            planned: routeZoneIds.includes(zone.id),
          }"
          :transform="`translate(${zone.x / 100 * parkMapMeta.viewWidth} ${zone.y / 100 * parkMapMeta.viewHeight})`"
          :role="interactive ? 'button' : undefined"
          :tabindex="interactive ? 0 : undefined"
          :aria-label="interactive ? `模拟前往${zone.name}` : undefined"
          @click.stop="selectZone(zone)"
          @keydown.enter.stop="selectZone(zone)"
        >
          <circle r="21" class="zone-ring" />
          <circle r="15" class="zone-core" />
          <text y="5" text-anchor="middle">{{ routeZoneIds.includes(zone.id) ? routeZoneIds.indexOf(zone.id) + 1 : index + 1 }}</text>
          <text y="42" text-anchor="middle" class="zone-name">{{ zone.name }}</text>
        </g>
      </g>

      <g v-if="positionPoint" class="my-position" :transform="`translate(${positionPoint.x} ${positionPoint.y})`">
        <circle r="28" class="position-pulse" />
        <path d="M0-21c-12 0-21 9-21 21 0 16 21 35 21 35S21 16 21 0C21-12 12-21 0-21Z" />
        <circle cy="-1" r="7" />
      </g>
    </svg>
  </div>
</template>

<style scoped>
.vector-map { width: 100%; height: 100%; overflow: hidden; background: #f3efe3; }
.vector-map svg { display: block; width: 100%; height: 100%; }
.area { fill: #e7e2d5; stroke: #d5cebd; stroke-width: 2; }
.area-vegetation { fill: #cbd9bb; stroke: #aebf9e; }
.area-water { fill: #9acdcc; stroke: #6eaead; }
.area-building { fill: #ead7bd; stroke: #c9a887; }
.area-habitat { fill: #dce3ca; stroke: #aebb9a; }
.park-boundary { fill: none; stroke: #275446; stroke-width: 8; stroke-linejoin: round; }
.road { fill: none; stroke-linecap: round; stroke-linejoin: round; }
.road-service,.road-unclassified { stroke: #c8bda7; stroke-width: 10; }
.road-footway,.road-pedestrian,.road-path { stroke: #fffaf0; stroke-width: 7; }
.geofences circle { fill: rgba(211,155,69,.11); stroke: #c5974e; stroke-width: 3; stroke-dasharray: 9 8; }
.geofences circle.active { fill: rgba(205,91,57,.17); stroke: #c14e36; stroke-width: 5; }
.plan-halo,.plan-line,.navigation-halo,.navigation-line,.actual-halo,.actual-line { fill: none; stroke-linecap: round; stroke-linejoin: round; }
.plan-halo { stroke: rgba(255,247,232,.82); stroke-width: 13; }
.plan-line { stroke: #b88a45; stroke-width: 5; stroke-dasharray: 3 15; }
.navigation-halo { stroke: #fff7ee; stroke-width: 17; }
.navigation-line { stroke: #e34b36; stroke-width: 8; animation: route-draw .55s var(--ease-out) both; }
.actual-halo { stroke: rgba(255,250,240,.86); stroke-width: 12; }
.actual-line { stroke: #2e7d68; stroke-width: 6; }
.service-marker { cursor: pointer; outline: none; }
.service-marker rect { fill: #fffaf0; stroke: #174b3b; stroke-width: 3; }
.service-marker text { fill: #174b3b; font-size: 12px; font-weight: 900; pointer-events: none; }
.service-marker.demo rect { stroke-dasharray: 4 3; }
.service-marker.target rect { fill: #e34b36; stroke: #fffaf0; stroke-width: 5; }
.service-marker.target text { fill: #fff; }
.zone { cursor: default; outline: none; }
.interactive .zone { cursor: pointer; }
.zone-ring { fill: #fffaf0; stroke: #174b3b; stroke-width: 4; }
.zone-core { fill: #174b3b; }
.zone.planned .zone-core { fill: #c95237; }
.zone.completed .zone-core { fill: #4f8569; }
.zone.current .zone-ring { stroke: #e1a84d; stroke-width: 7; }
.zone text { fill: #fff; font-size: 15px; font-weight: 900; pointer-events: none; }
.zone .zone-name { paint-order: stroke; fill: #173f34; stroke: #fffaf0; stroke-width: 7px; stroke-linejoin: round; font-size: 18px; }
.my-position path { fill: #ef5b3d; stroke: #fff; stroke-width: 5; }
.my-position > circle:not(.position-pulse) { fill: #fff; }
.position-pulse { fill: rgba(239,91,61,.16); animation: position-pulse 1.6s ease-in-out infinite; }
@keyframes position-pulse { 50% { r: 43px; opacity: .2; } }
@keyframes route-draw { from { opacity: 0; stroke-dasharray: 0 2000; } to { opacity: 1; stroke-dasharray: 2000 0; } }
@media (prefers-reduced-motion: reduce) { .position-pulse { animation: none; } }
</style>
