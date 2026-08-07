<script setup lang="ts">
import type { Companion } from '../../../shared/types/pretrip'
import type { JourneyRecord } from '../../../shared/types/journey'
import { readJourneyBlob } from '../../services/journeyMediaStorage'
import { downloadTicketBlob, renderHorizontalTicket, renderStoryTicket, shareTicketBlob } from '../../services/journeyTicketExport'
import { buildTicketShareCaption } from '../../utils/journeyRecord'
import JourneyTicketPreview from './JourneyTicketPreview.vue'

const props = defineProps<{ journey: JourneyRecord, companion: Companion }>()
const ticket = computed(() => props.journey.ticket!)
const selectedPhoto = computed(() => props.journey.media.find(item => item.id === ticket.value.coverPhotoId))
const { objectUrl: photoUrl } = useJourneyMedia(() => selectedPhoto.value?.storageKey)
const { objectUrl: audioUrl } = useJourneyMedia(() => ticket.value.audio?.storageKey)
const feedback = shallowRef('')
const working = shallowRef(false)

async function exportImage(kind: 'horizontal' | 'story', share = false) {
  working.value = true
  try {
    const photoBlob = selectedPhoto.value ? await readJourneyBlob(selectedPhoto.value.storageKey) : undefined
    const blob = kind === 'horizontal' ? await renderHorizontalTicket(ticket.value, props.companion, photoBlob) : await renderStoryTicket(ticket.value, props.companion, photoBlob)
    const filename = `奇遇票根-${ticket.value.visitDate}-${kind === 'story' ? '故事图' : '横向'}.png`
    if (share && await shareTicketBlob(blob, filename, buildTicketShareCaption(ticket.value))) feedback.value = '系统分享面板已经打开。'
    else {
      downloadTicketBlob(blob, filename)
      feedback.value = '票根图片已经生成。'
    }
  }
  catch (cause) {
    feedback.value = cause instanceof Error ? cause.message : '导出失败，请稍后再试。'
  }
  finally { working.value = false }
}
</script>

<template>
  <article class="ticket-detail">
    <header><button type="button" @click="navigateTo('/posttrip/tickets')">←</button><div><span>TICKET DETAIL</span><h1>我的奇遇票根</h1></div><NuxtLink to="/posttrip/ticket">编辑</NuxtLink></header>
    <div class="detail-preview"><JourneyTicketPreview :ticket="ticket" :companion="companion" :photo-url="photoUrl" /></div>
    <section class="detail-info"><span>{{ journey.visitDate }}</span><h2>{{ ticket.title }}</h2><p>{{ ticket.message }}</p><dl><div><dt>票根编号</dt><dd>{{ ticket.ticketNumber }}</dd></div><div><dt>主要伙伴</dt><dd>{{ companion.name }}</dd></div><div><dt>生成日期</dt><dd>{{ ticket.createdAt.slice(0,10) }}</dd></div></dl></section>
    <section v-if="ticket.audio" class="ticket-sound"><span>TRAVEL SOUND</span><h3>包含一段旅行声音</h3><p>声音只在应用内播放，静态分享图片不会携带音频。</p><audio v-if="audioUrl" :src="audioUrl" controls /></section>
    <section class="detail-actions"><button type="button" :disabled="working" @click="exportImage('horizontal')">保存横向票根</button><button type="button" :disabled="working" @click="exportImage('story')">保存故事图</button><button class="share" type="button" :disabled="working" @click="exportImage('story',true)">系统分享</button></section>
    <p v-if="feedback" class="feedback">{{ feedback }}</p>
  </article>
</template>

<style scoped>
.ticket-detail { width: min(100%,480px); min-height: 100dvh; margin: 0 auto; padding-bottom: 30px; background: radial-gradient(circle at 80% 0,color-mix(in srgb,v-bind('companion.accent') 15%,transparent),transparent 24%),#eee9df; }.ticket-detail > header { display: grid; grid-template-columns: 42px 1fr auto; align-items: center; padding: max(14px,env(safe-area-inset-top)) 16px 14px; gap: 10px; }.ticket-detail header button { width: 40px; height: 40px; border: 1px solid rgba(45,55,48,.14); border-radius: 14px 5px 14px 5px; background: #fff; }.ticket-detail header div { display: grid; gap: 1px; }.ticket-detail header span { color: #a95942; font-size: 8px; font-weight: 900; }.ticket-detail header h1 { margin: 0; font-family: var(--font-display); font-size: 19px; }.ticket-detail header a { color: #a95942; font-size: 9px; font-weight: 900; text-decoration: none; }.detail-preview { padding: 18px 14px; background: #253b32; }.detail-info,.ticket-sound,.detail-actions { margin: 12px 14px 0; padding: 17px; border-radius: 20px 7px 20px 7px; background: rgba(255,255,255,.76); }.detail-info > span,.ticket-sound > span { color: #a95942; font-size: 8px; font-weight: 900; letter-spacing: .1em; }.detail-info h2 { margin: 5px 0; font-family: var(--font-display); font-size: 22px; }.detail-info p,.ticket-sound p { margin: 0; color: #717871; font-size: 9px; line-height: 1.65; }.detail-info dl { display: grid; margin: 15px 0 0; gap: 7px; }.detail-info dl div { display: flex; justify-content: space-between; padding-top: 7px; border-top: 1px solid rgba(45,55,48,.1); font-size: 9px; }.detail-info dt { color: #777e78; }.detail-info dd { margin: 0; font-weight: 900; }.ticket-sound h3 { margin: 4px 0; font-family: var(--font-display); font-size: 18px; }.ticket-sound audio { width: 100%; margin-top: 12px; }.detail-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; }.detail-actions button { min-height: 43px; border: 1px solid rgba(45,55,48,.12); border-radius: 11px 4px 11px 4px; background: #f5efe4; color: #34463e; font-size: 9px; font-weight: 900; }.detail-actions .share { grid-column: 1/-1; border: 0; background: #253b32; color: #fff; }.feedback { margin: 12px 20px 0; color: #a95942; font-size: 9px; text-align: center; }
</style>
