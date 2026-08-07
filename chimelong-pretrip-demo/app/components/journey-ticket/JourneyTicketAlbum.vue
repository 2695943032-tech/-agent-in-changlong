<script setup lang="ts">
import type { CatalogResponse } from '../../../shared/types/pretrip'
import type { JourneyRecord } from '../../../shared/types/journey'
import { buildTicketShareCaption } from '../../utils/journeyRecord'
import JourneyTicketAlbumPreview from './JourneyTicketAlbumPreview.vue'

defineProps<{ records: JourneyRecord[], catalog: CatalogResponse }>()
const emit = defineEmits<{ delete: [journeyId: string] }>()
const pendingDelete = shallowRef<JourneyRecord | null>(null)
const feedback = shallowRef('')

async function copy(record: JourneyRecord) {
  if (!record.ticket) return
  try {
    await navigator.clipboard.writeText(buildTicketShareCaption(record.ticket))
    feedback.value = '票根文案已经复制。'
  }
  catch {
    feedback.value = '当前浏览器无法自动复制。'
  }
}
</script>

<template>
  <section class="album">
    <header class="album-header"><button type="button" @click="navigateTo('/posttrip')">←</button><div><span>TICKET ARCHIVE</span><h1>奇遇票根册</h1><p>每段旅程，只留一张主票根</p></div><small>{{ records.filter(item => item.ticket).length }} 张</small></header>
    <div v-if="records.some(item => item.ticket)" class="ticket-list">
      <article v-for="record in records.filter(item => item.ticket)" :key="record.id" class="album-card">
        <NuxtLink :to="`/posttrip/tickets/${record.ticket!.id}`" class="ticket-link">
          <JourneyTicketAlbumPreview :record="record" :companion="catalog.companions.find(item => item.id === record.ticket!.companionId)!" />
        </NuxtLink>
        <div class="ticket-meta"><span><small>{{ record.visitDate }}</small><strong>{{ record.zooName }}</strong><code>{{ record.ticket!.ticketNumber }}</code></span><div><NuxtLink to="/posttrip/ticket">编辑</NuxtLink><button type="button" @click="copy(record)">复制文案</button><button class="delete" type="button" @click="pendingDelete = record">删除</button></div></div>
      </article>
    </div>
    <div v-else class="album-empty"><i>◇</i><h2>票根册还是空的</h2><p>完成一次动物园奇遇后，动物伙伴会为你留下第一张票。</p><NuxtLink to="/inpark">开始一段园中奇遇</NuxtLink></div>
    <p v-if="feedback" class="album-feedback">{{ feedback }}</p>

    <Transition name="confirm">
      <div v-if="pendingDelete" class="confirm-backdrop" @click.self="pendingDelete = null"><section><span>DELETE TICKET</span><h2>从票根册移除这张票？</h2><p>旅程记录仍会保留，但票根的文字、样式和声音关联会被删除。</p><div><button type="button" @click="pendingDelete = null">取消</button><button class="danger" type="button" @click="emit('delete',pendingDelete.id); pendingDelete = null">确认删除</button></div></section></div>
    </Transition>
  </section>
</template>

<style scoped>
.album { width: min(100%,480px); min-height: 100dvh; margin: 0 auto; background: radial-gradient(circle at 80% 0,rgba(175,111,82,.16),transparent 25%),#eee9df; }.album-header { display: grid; grid-template-columns: 42px 1fr auto; align-items: center; padding: max(14px,env(safe-area-inset-top)) 16px 15px; gap: 10px; border-bottom: 1px solid rgba(45,55,48,.11); background: rgba(248,244,236,.86); backdrop-filter: blur(16px); }.album-header button { width: 40px; height: 40px; border: 1px solid rgba(45,55,48,.14); border-radius: 14px 5px 14px 5px; background: #fff; }.album-header div { display: grid; gap: 1px; }.album-header span { color: #a95942; font-size: 8px; font-weight: 900; letter-spacing: .1em; }.album-header h1 { margin: 0; font-family: var(--font-display); font-size: 20px; }.album-header p { margin: 0; color: #7a7e78; font-size: 8px; }.album-header > small { color: #a95942; font: 900 11px ui-monospace,monospace; }
.ticket-list { display: grid; padding: 18px 14px 38px; gap: 16px; }.album-card { padding: 10px; border-radius: 22px 8px 22px 8px; background: rgba(255,255,255,.76); box-shadow: 0 15px 32px rgba(38,51,43,.09); }.ticket-link { display: block; text-decoration: none; }.ticket-meta { display: grid; grid-template-columns: 1fr auto; padding: 11px 3px 2px; gap: 8px; }.ticket-meta > span { display: grid; gap: 1px; }.ticket-meta small { color: #a95942; font-size: 8px; font-weight: 900; }.ticket-meta strong { font-size: 10px; }.ticket-meta code { color: #7c817c; font-size: 6px; }.ticket-meta > div { display: flex; align-items: end; gap: 4px; }.ticket-meta a,.ticket-meta button { padding: 6px; border: 1px solid rgba(45,55,48,.11); border-radius: 8px 3px 8px 3px; background: transparent; color: #47534d; font-size: 7px; text-decoration: none; }.ticket-meta .delete { color: #a14d3e; }
.album-empty { display: grid; min-height: calc(100dvh - 92px); padding: 34px; place-content: center; place-items: center; text-align: center; }.album-empty i { display: grid; width: 88px; height: 88px; place-items: center; border: 1px dashed #a95942; border-radius: 50%; color: #a95942; font-size: 34px; font-style: normal; }.album-empty h2 { margin: 20px 0 4px; font-family: var(--font-display); font-size: 25px; }.album-empty p { max-width: 260px; margin: 0 0 18px; color: #737a74; font-size: 10px; line-height: 1.65; }.album-empty a { padding: 11px 15px; border-radius: 13px 4px 13px 4px; background: #263c33; color: #fff; font-size: 9px; text-decoration: none; }.album-feedback { position: fixed; z-index: 30; right: 20px; bottom: 20px; left: 20px; max-width: 440px; margin: auto; padding: 9px; border-radius: 99px; background: #263c33; color: #fff; font-size: 8px; text-align: center; }
.confirm-backdrop { position: fixed; z-index: 60; inset: 0; display: grid; padding: 18px; place-items: end center; background: rgba(14,28,22,.56); backdrop-filter: blur(8px); }.confirm-backdrop section { width: min(100%,440px); padding: 20px; border-radius: 25px 8px 25px 8px; background: #fffaf0; }.confirm-backdrop span { color: #a95942; font-size: 8px; font-weight: 900; letter-spacing: .1em; }.confirm-backdrop h2 { margin: 6px 0; font-family: var(--font-display); font-size: 21px; }.confirm-backdrop p { margin: 0; color: #6f766f; font-size: 9px; line-height: 1.6; }.confirm-backdrop div { display: grid; grid-template-columns: 1fr 1fr; margin-top: 16px; gap: 7px; }.confirm-backdrop button { min-height: 42px; border: 1px solid rgba(45,55,48,.12); border-radius: 11px 4px 11px 4px; background: #f4efe5; }.confirm-backdrop .danger { border: 0; background: #a14d3e; color: #fff; }.confirm-enter-active,.confirm-leave-active { transition: opacity .24s ease; }.confirm-enter-from,.confirm-leave-to { opacity: 0; }
</style>
