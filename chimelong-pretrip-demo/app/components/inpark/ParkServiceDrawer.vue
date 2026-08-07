<script setup lang="ts">
import type { GeoPoint } from '../../../shared/types/pretrip'
import type { ParkService, ServiceKind } from '../../../shared/types/park'
import { parkMapPoints } from '#shared/data/parkGeometry.generated'
import { navigationRouteFromPosition } from '#shared/utils/parkGeo'

const props = defineProps<{
  services: ParkService[]
  selectedId: string | null
  currentPosition: GeoPoint | null
}>()

const emit = defineEmits<{
  close: []
  select: [service: ParkService]
  fatigue: []
}>()

const labels: Record<ServiceKind, string> = {
  dining: '餐饮', restroom: '洗手间', family: '亲子', medical: '医务', rest: '休息', show: '演出', photo: '拍照', retail: '限定',
}

const serviceRows = computed(() => {
  const start = props.currentPosition ?? parkMapPoints.entrance
  return props.services.map((service) => {
    try {
      const route = navigationRouteFromPosition(start, service)
      return { service, distance: `${route.distanceMeters}m · ${route.walkingMinutes}分钟` }
    }
    catch {
      return { service, distance: '路线待定位' }
    }
  }).toSorted((a, b) => {
    const aValue = Number.parseInt(a.distance)
    const bValue = Number.parseInt(b.distance)
    return (Number.isFinite(aValue) ? aValue : 99999) - (Number.isFinite(bValue) ? bValue : 99999)
  })
})
</script>

<template>
  <div class="service-backdrop" @click.self="emit('close')">
    <section class="service-drawer" role="dialog" aria-modal="true" aria-label="附近服务">
      <header><div><span>NEARBY SERVICES</span><strong>附近需要什么？</strong></div><button type="button" @click="emit('close')">×</button></header>
      <button class="fatigue-call" type="button" @click="emit('fatigue')"><span>有点累了</span><strong>让伙伴帮我插入休息点 →</strong></button>
      <div class="service-list">
        <button
          v-for="row in serviceRows"
          :key="row.service.id"
          :class="{ selected: selectedId === row.service.id }"
          type="button"
          @click="emit('select', row.service)"
        >
          <span>{{ labels[row.service.serviceKind] }}</span>
          <div><strong>{{ row.service.name }}</strong><small>{{ row.service.detail }}</small></div>
          <i>{{ row.distance }}</i>
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.service-backdrop { position: fixed; z-index: 65; inset: 0; display: grid; align-items: end; background: rgba(8,30,24,.45); backdrop-filter: blur(5px); }
.service-drawer { width: min(100%, 480px); max-height: 82dvh; margin: 0 auto; padding: 21px 17px max(24px, env(safe-area-inset-bottom)); overflow-y: auto; border-radius: 20px 20px 0 0; background: var(--paper); box-shadow: 0 -18px 45px rgba(8,30,24,.22); }
.service-drawer header { display: flex; align-items: center; justify-content: space-between; }
.service-drawer header div { display: grid; gap: 3px; }
.service-drawer header span { color: var(--accent-dark); font-size: 9px; font-weight: 900; letter-spacing: .12em; }
.service-drawer header strong { color: var(--ink); font-family: var(--font-display); font-size: 22px; }
.service-drawer header button { display: grid; width: 40px; height: 40px; place-items: center; border: 1px solid var(--line); border-radius: 10px; background: #fff; color: var(--forest); font-size: 20px; }
.fatigue-call { display: grid; width: 100%; min-height: 64px; margin: 14px 0 11px; padding: 12px 14px; gap: 2px; border: 0; border-radius: 13px; background: var(--forest); color: #fff; text-align: left; }
.fatigue-call span { color: #f1c77d; font-size: 9px; font-weight: 900; }
.fatigue-call strong { font-size: 12px; }
.service-list { display: grid; gap: 8px; }
.service-list > button { display: grid; grid-template-columns: 42px 1fr auto; align-items: center; min-height: 66px; padding: 10px; gap: 9px; border: 1px solid var(--line); border-radius: 13px; background: var(--surface); color: inherit; text-align: left; }
.service-list > button > span { display: grid; width: 42px; height: 42px; place-items: center; border-radius: 10px; background: var(--forest-soft); color: var(--forest); font-size: 10px; font-weight: 900; }
.service-list div { display: grid; gap: 2px; }
.service-list strong { color: var(--ink); font-size: 12px; }
.service-list small { color: var(--muted); font-size: 10px; }
.service-list i { color: var(--accent-dark); font-size: 10px; font-style: normal; }
.service-list button.selected { border-color: #6fa083; background: #eef8f1; }
</style>
