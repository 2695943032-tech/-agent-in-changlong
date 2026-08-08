<script setup lang="ts">
import type { AnimalId, AnimalPoi, GeoPoint } from '../../../shared/types/pretrip'
import type { ParkNavigationRoute, ParkService } from '../../../shared/types/park'
import ParkRasterMap from './ParkRasterMap.vue'

const props = defineProps<{
  open: boolean
  title: string
  animals: readonly AnimalPoi[]
  routeZoneIds: readonly AnimalId[]
  position: GeoPoint | null
  services?: readonly ParkService[]
  navigationRoute?: ParkNavigationRoute | null
}>()

const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <Transition name="map-sheet">
    <section v-if="props.open" class="map-sheet" role="dialog" aria-modal="true" aria-label="园区地图">
      <button class="sheet-grab" type="button" aria-label="收起地图" @click="emit('close')"><i /></button>
      <header class="sheet-header">
        <span>CHIMELONG · LIVE MAP</span>
        <strong>{{ props.title }}</strong>
        <button type="button" @click="emit('close')">收起</button>
      </header>
      <div class="sheet-map">
        <ParkRasterMap
          :animals="props.animals"
          :route-zone-ids="props.routeZoneIds"
          :current-position="props.position"
          :services="props.services ?? []"
          :show-services="Boolean(props.services?.length)"
          :navigation-route="props.navigationRoute ?? null"
          interactive
        />
      </div>
      <footer v-if="props.navigationRoute" class="sheet-route">
        <span>正在前往</span><strong>{{ props.navigationRoute.target.name }}</strong>
        <small>{{ props.navigationRoute.distanceMeters }}m · 约 {{ props.navigationRoute.walkingMinutes }} 分钟</small>
      </footer>
    </section>
  </Transition>
</template>

<style scoped>
.map-sheet { position: fixed; z-index: 100; right: 50%; bottom: 8px; width: min(100% - 12px, 468px); height: min(96dvh, 850px); display: grid; grid-template-rows: 22px auto minmax(0, 1fr) auto; overflow: hidden; border: 1px solid rgba(22, 82, 67, .14); border-radius: 28px; background: #f8fbf7; box-shadow: 0 -22px 60px rgba(21, 58, 48, .28); transform: translateX(50%); }
.sheet-grab { display: grid; place-items: end center; border: 0; background: #f8fbf7; }.sheet-grab i { width: 44px; height: 5px; border-radius: 999px; background: #c7d2ca; }
.sheet-header { display: grid; grid-template-columns: 1fr auto; align-items: center; padding: 9px 16px 13px; gap: 3px; border-bottom: 1px solid #e3ebe4; }.sheet-header span { grid-column: 1; color: #5f8b74; font-size: 9px; font-weight: 900; letter-spacing: .11em; }.sheet-header strong { color: #173f34; font-size: 16px; }.sheet-header button { grid-column: 2; grid-row: 1 / span 2; min-height: 34px; padding: 0 10px; border: 1px solid #d5e1d8; border-radius: 10px; background: #fff; color: #245b48; font-size: 11px; font-weight: 800; }
.sheet-map { min-height: 0; padding: 10px; }.sheet-map :deep(.raster-map) { height: 100%; }.sheet-route { display: grid; padding: 14px 18px calc(14px + env(safe-area-inset-bottom)); gap: 3px; border-top: 1px solid #e3ebe4; background: #fff; }.sheet-route span { color: #66917b; font-size: 10px; font-weight: 800; }.sheet-route strong { color: #174b3b; font-size: 14px; }.sheet-route small { color: #748379; font-size: 11px; }
.map-sheet-enter-active,.map-sheet-leave-active { transition: transform 460ms cubic-bezier(.2,.9,.2,1), opacity 260ms ease; }.map-sheet-enter-from,.map-sheet-leave-to { opacity: 0; transform: translate(50%, calc(100% + 20px)) scale(.98); }
@media (prefers-reduced-motion: reduce) { .map-sheet-enter-active,.map-sheet-leave-active { transition: none; } }
</style>
