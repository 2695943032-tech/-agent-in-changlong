<script setup lang="ts">
import type { AnimalId, CatalogResponse, PlanStop } from '../../../shared/types/pretrip'
import ParkVectorMap from '../map/ParkVectorMap.vue'

const props = defineProps<{ stops: PlanStop[] }>()
const { data: catalog } = await useFetch<CatalogResponse>('/api/catalog', { key: 'route-map-catalog-v2' })
const animalRoute = computed(() => props.stops.filter(stop => stop.kind === 'animal').map(stop => stop.poiId as AnimalId))
</script>

<template>
  <div class="map-card">
    <header>
      <div><span>REAL WALK NETWORK</span><strong>园区路网计算路线</strong></div>
      <small>{{ stops.length }} 个行程节点</small>
    </header>
    <div v-if="catalog" class="map-stage">
      <ParkVectorMap :animals="catalog.animals" :route-zone-ids="animalRoute" />
    </div>
    <footer><span>Dijkstra 最短路</span><span>OSM 园区数据</span><strong>可无损放大</strong></footer>
  </div>
</template>

<style scoped>
.map-card { overflow: hidden; border: 1px solid #d9d1c1; border-radius: 20px; background: #fffaf0; box-shadow: 0 16px 36px rgba(22,63,51,.08); }
header,footer { display: flex; align-items: center; justify-content: space-between; padding: 13px 15px; gap: 10px; }
header div { display: grid; gap: 3px; }
header span { color: #b44d36; font-size: 9px; font-weight: 900; letter-spacing: .12em; }
header strong { color: #173f34; font-size: 13px; }
header small { color: #6b786f; font-size: 9px; }
.map-stage { aspect-ratio: 1 / 1.02; overflow: hidden; border-block: 1px solid #e2dacb; }
footer { justify-content: flex-start; padding-block: 10px; color: #68766e; font-size: 8px; }
footer span { padding: 4px 7px; border: 1px solid #ded5c4; border-radius: 99px; }
footer strong { margin-left: auto; color: #174b3b; font-size: 8px; }
</style>
