<script setup lang="ts">
import type { AnimalId, CatalogResponse, CompanionId } from '../../shared/types/pretrip'
import type { AnimalLiveStatus, LostChildReport, OperationsPatch, OperationsState } from '../../shared/types/operations'
import ParkRasterMap from '../components/map/ParkRasterMap.vue'

const { data: catalog } = await useFetch<CatalogResponse>('/api/catalog', { key: 'admin-catalog' })
const operations = shallowRef<OperationsState | null>(null)
const loading = shallowRef(true)
const statuses: AnimalLiveStatus[] = ['营业中', '进食中', '睡觉中']
const reportStatuses: LostChildReport['status'][] = ['待处理', '协查中', '已找到']
let pollTimer: ReturnType<typeof setInterval> | undefined

const animalNames = computed(() => Object.fromEntries((catalog.value?.animals ?? []).map(animal => [animal.id, animal.name])) as Record<AnimalId, string>)
const companionNames = computed(() => Object.fromEntries((catalog.value?.companions ?? []).map(companion => [companion.id, companion.name])) as Record<CompanionId, string>)
const heatByZone = computed(() => operations.value ? Object.fromEntries(Object.entries(operations.value.zones).map(([id, zone]) => [id, zone.heat])) : {})

async function refresh() {
  try { operations.value = await $fetch<OperationsState>('/api/admin/state') }
  finally { loading.value = false }
}

async function patchState(patch: OperationsPatch) {
  operations.value = await $fetch<OperationsState>('/api/admin/state', { method: 'PATCH', body: patch })
}

function updateZoneStatus(id: AnimalId, event: Event) {
  void patchState({ zone: { id, status: (event.target as HTMLSelectElement).value as AnimalLiveStatus } })
}

function updateStock(id: CompanionId, event: Event) {
  void patchState({ stock: { id, quantity: Number((event.target as HTMLInputElement).value) || 0 } })
}

function updateReport(id: string, status: LostChildReport['status']) {
  void patchState({ report: { id, status } })
}

onMounted(() => {
  void refresh()
  pollTimer = setInterval(refresh, 3000)
})
onBeforeUnmount(() => { if (pollTimer) clearInterval(pollTimer) })
</script>

<template>
  <main class="admin-shell">
    <header class="admin-header">
      <div><small>CHIMELONG AGENT OPERATIONS</small><h1>园区智能运营后台</h1><p>热力、动物状态、周边库存与儿童走失协查</p></div>
      <div class="live"><i></i><span>实时同步</span><small>{{ operations ? new Date(operations.updatedAt).toLocaleTimeString('zh-CN') : '连接中' }}</small></div>
    </header>

    <div v-if="operations?.lastStockChange?.source === 'demo-order'" class="stock-change-notice">
      <strong>收到新的演示订单</strong>
      <span>{{ companionNames[operations.lastStockChange.id] }}限定周边库存 {{ operations.lastStockChange.delta }}</span>
      <time>{{ new Date(operations.lastStockChange.createdAt).toLocaleTimeString('zh-CN') }}</time>
    </div>

    <section v-if="loading" class="loading">正在连接园区运营数据…</section>
    <template v-else-if="operations && catalog">
      <section class="overview-grid">
        <article class="heat-panel panel">
          <header><div><small>REAL-TIME HEATMAP</small><h2>园区客流热力图</h2></div><span>每 3 秒刷新</span></header>
          <div class="admin-map"><ParkRasterMap :animals="catalog.animals" :heat-by-zone="heatByZone" :initial-zoom="1.38" :min-zoom="1.38" /></div>
          <div class="heat-legend"><span>舒适</span><i></i><span>繁忙</span></div>
        </article>

        <article class="zone-panel panel">
          <header><div><small>ANIMAL LIVE STATUS</small><h2>动物实时状态</h2></div></header>
          <div class="zone-list">
            <label v-for="(zone, id) in operations.zones" :key="id">
              <span><strong>{{ animalNames[id] }}</strong><small>热度 {{ zone.heat }}%</small></span>
              <select :value="zone.status" @change="updateZoneStatus(id, $event)"><option v-for="status in statuses" :key="status">{{ status }}</option></select>
            </label>
          </div>
        </article>
      </section>

      <section class="lower-grid">
        <article class="panel inventory-panel">
          <header><div><small>MERCH INVENTORY</small><h2>纪念礼品库存</h2></div><span>库存为 0 时前端显示售罄</span></header>
          <div class="stock-grid">
            <label v-for="(quantity, id) in operations.merchStock" :key="id" :class="{ soldout: quantity === 0 }">
              <span><strong>{{ companionNames[id] }}限定周边</strong><small>{{ quantity === 0 ? '已售罄' : '可售库存' }}</small></span>
              <input type="number" min="0" :value="quantity" @change="updateStock(id, $event)">
            </label>
          </div>
        </article>

        <article class="panel lost-panel">
          <header><div><small>CHILD SAFETY DESK</small><h2>儿童防走失播报</h2></div><b v-if="operations.lostChildReports.length">{{ operations.lostChildReports.length }}</b></header>
          <div v-if="operations.lostChildReports.length" class="report-list">
            <article v-for="report in operations.lostChildReports" :key="report.id">
              <header><strong>{{ report.name }}</strong><time>{{ new Date(report.createdAt).toLocaleString('zh-CN') }}</time></header>
              <p><b>样貌特征：</b>{{ report.appearance }}</p><p><b>走丢地点：</b>{{ report.location }}</p><p><b>家长电话：</b><a :href="`tel:${report.guardianPhone}`">{{ report.guardianPhone }}</a></p>
              <div><button v-for="status in reportStatuses" :key="status" :class="{ active: report.status === status }" @click="updateReport(report.id, status)">{{ status }}</button></div>
            </article>
          </div>
          <div v-else class="empty-reports">暂无儿童走失信息</div>
        </article>
      </section>
    </template>
  </main>
</template>

<style scoped>
:global(body) { margin: 0; background: #edf1ec; color: #163d33; font-family: Inter, "Microsoft YaHei", sans-serif; }
.admin-shell { min-height: 100vh; padding: 28px; overflow-x: hidden; }.admin-header { display: flex; align-items: end; justify-content: space-between; max-width: 1480px; margin: 0 auto 20px; }.admin-header small,.panel header small { color: #9a6824; font-size: 10px; font-weight: 900; letter-spacing: .12em; }.admin-header h1 { margin: 4px 0; font-size: 30px; }.admin-header p { margin: 0; color: #6d7d76; }.live { display: grid; grid-template-columns: 9px auto; align-items: center; gap: 2px 7px; }.live i { width: 9px; height: 9px; border-radius: 50%; background: #39a562; box-shadow: 0 0 0 6px #d9edde; }.live small { grid-column: 2; color: #819089; }.loading { display: grid; min-height: 60vh; place-items: center; }.overview-grid,.lower-grid { display: grid; grid-template-columns: minmax(0, 1fr); max-width: 1480px; margin: 0 auto 18px; gap: 18px; }.panel { min-width: 0; overflow: hidden; border: 1px solid #d7dfd5; border-radius: 20px; background: #fff; box-shadow: 0 12px 34px rgba(31,65,53,.07); }.panel > header { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px; border-bottom: 1px solid #e4e9e2; }.panel h2 { margin: 3px 0 0; font-size: 18px; }.panel > header > span { color: #7c8b84; font-size: 11px; }.admin-map { width: 100%; height: 520px; overflow: hidden; }.heat-legend { display: flex; padding: 10px 20px 15px; align-items: center; justify-content: flex-end; gap: 8px; color: #77867f; font-size: 10px; }.heat-legend i { width: 130px; height: 8px; border-radius: 99px; background: linear-gradient(90deg,#8dc982,#f1bf3b,#e8432f); }.zone-list { display: grid; padding: 12px; gap: 8px; }.zone-list label,.stock-grid label { display: flex; padding: 12px; align-items: center; justify-content: space-between; gap: 10px; border-radius: 12px; background: #f4f7f2; }.zone-list label > span,.stock-grid label > span { display: grid; gap: 3px; }.zone-list strong,.stock-grid strong { font-size: 13px; }.zone-list small,.stock-grid small { color: #809088; font-size: 10px; }.zone-list select { min-width: 96px; height: 34px; border: 1px solid #cad6c8; border-radius: 9px; background: #fff; color: #285b48; }.stock-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); padding: 14px; gap: 9px; }.stock-grid label.soldout { background: #fff0ec; }.stock-grid label.soldout small { color: #bc4d36; }.stock-grid input { width: 70px; height: 34px; border: 1px solid #ccd5c9; border-radius: 8px; text-align: center; }.lost-panel > header b { display: grid; min-width: 25px; height: 25px; place-items: center; border-radius: 99px; background: #b54630; color: #fff; font-size: 11px; }.report-list { display: grid; max-height: 360px; padding: 14px; overflow-y: auto; gap: 9px; }.report-list > article { padding: 12px; border: 1px solid #e2d4cc; border-radius: 12px; background: #fffaf7; }.report-list article header { display: flex; justify-content: space-between; }.report-list time { color: #8e7b70; font-size: 9px; }.report-list p { margin: 7px 0; color: #604f47; font-size: 11px; }.report-list button { margin-right: 5px; padding: 5px 8px; border: 1px solid #d8c9c0; border-radius: 7px; background: #fff; color: #80675c; font-size: 9px; }.report-list button.active { border-color: #325f4d; background: #325f4d; color: #fff; }.empty-reports { display: grid; min-height: 230px; place-items: center; color: #89968f; font-size: 12px; }
.stock-change-notice { display: flex; max-width: 1440px; margin: -8px auto 18px; padding: 11px 16px; align-items: center; gap: 10px; border: 1px solid #b9d8bf; border-radius: 12px; background: #eaf6e9; color: #285b3d; box-shadow: 0 8px 22px rgba(45, 91, 61, .08); }.stock-change-notice strong { font-size: 12px; }.stock-change-notice span { font-size: 11px; }.stock-change-notice time { margin-left: auto; color: #6d8375; font-size: 10px; }
@media (min-width: 1180px) { .overview-grid { grid-template-columns: minmax(0, 1.7fr) minmax(340px, .8fr); }.lower-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 900px) { .admin-shell { padding: 14px; }.admin-header { align-items: start; }.admin-header h1 { font-size: 22px; }.admin-map { height: 430px; }.stock-grid { grid-template-columns: 1fr; } }
</style>
