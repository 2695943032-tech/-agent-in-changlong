<script setup lang="ts">
import type { Companion } from '../../../shared/types/pretrip'
import type { JourneyTicket } from '../../../shared/types/journey'

const props = defineProps<{
  ticket: JourneyTicket
  companion: Companion
  photoUrl?: string | null
  exportMode?: boolean
}>()

const ticketStyle = computed(() => ({
  '--ticket-accent': props.companion.accent,
  '--cover-x': `${props.ticket.coverTransform.x}%`,
  '--cover-y': `${props.ticket.coverTransform.y}%`,
  '--cover-scale': String(props.ticket.coverTransform.scale),
}))

const distanceLabel = computed(() => `${(props.ticket.statsSnapshot.walkingDistanceMeters / 1000).toFixed(1)} km`)
</script>

<template>
  <article class="ticket" :class="[`template-${ticket.template}`, { exporting: exportMode }]" :style="ticketStyle">
    <section class="ticket-visual">
      <div class="cover-wrap">
        <img v-if="photoUrl" class="cover-photo" :src="photoUrl" alt="票根封面照片">
        <div v-else class="cover-fallback"><i /><img :src="companion.chatCharacterImage" :alt="`${companion.name}伙伴插画`"></div>
      </div>
      <div class="visual-copy">
        <span>{{ ticket.subtitle ?? '动物园探索纪念票' }}</span>
        <h3>{{ ticket.title }}</h3>
        <p v-if="ticket.showMessage && ticket.message">{{ ticket.message }}</p>
      </div>
      <div class="companion-seal"><img :src="companion.chatCharacterImage" :alt="companion.name"><span>{{ companion.name }}<br>旅行印章</span></div>
    </section>

    <div class="tear-line"><i /><i /><i /><i /><i /><i /></div>

    <aside class="ticket-stub">
      <span class="zoo-label">CHIMELONG<br>JOURNEY</span>
      <div class="date"><small>VISIT DATE</small><strong>{{ ticket.visitDate.replaceAll('-', '.') }}</strong></div>
      <dl>
        <div><dt>伙伴</dt><dd>{{ companion.name }}</dd></div>
        <div><dt>到访</dt><dd>{{ ticket.statsSnapshot.visitedZoneCount }} 个展区</dd></div>
        <div><dt>徽章</dt><dd>{{ ticket.statsSnapshot.earnedBadgeCount }} 枚</dd></div>
        <div><dt>步行</dt><dd>{{ distanceLabel }}</dd></div>
      </dl>
      <div class="barcode" aria-hidden="true"><i v-for="index in 18" :key="index" :style="{ width: `${index % 4 === 0 ? 3 : index % 3 === 0 ? 2 : 1}px` }" /></div>
      <code>{{ ticket.ticketNumber }}</code>
    </aside>
  </article>
</template>

<style scoped>
.ticket { position: relative; display: grid; grid-template-columns: minmax(0,1.65fr) 8px minmax(0,.72fr); width: 100%; min-width: 0; max-width: 100%; aspect-ratio: 2.42/1; overflow: hidden; border-radius: 18px 6px 18px 6px; background: #f8f0de; color: #1d3028; box-shadow: 0 22px 46px rgba(29,43,36,.2); isolation: isolate; }
.ticket::before { position: absolute; z-index: 4; inset: 0; pointer-events: none; background: repeating-linear-gradient(95deg,rgba(82,59,34,.025) 0 1px,transparent 1px 4px); content: ''; mix-blend-mode: multiply; }
.ticket-visual { position: relative; min-width: 0; overflow: hidden; }
.cover-wrap { position: absolute; inset: 0; overflow: hidden; }
.cover-photo { width: 100%; height: 100%; object-fit: cover; object-position: var(--cover-x) var(--cover-y); transform: scale(var(--cover-scale)); }
.cover-fallback { position: absolute; inset: 0; overflow: hidden; background: radial-gradient(circle at 20% 16%,rgba(255,255,255,.28),transparent 28%),linear-gradient(145deg,color-mix(in srgb,var(--ticket-accent) 72%,#203b31),#15362d); }
.cover-fallback > i { position: absolute; inset: 12px; border: 1px solid rgba(255,255,255,.15); border-radius: 50%; }
.cover-fallback img { position: absolute; right: -6%; bottom: -28%; width: 68%; height: 118%; object-fit: contain; filter: drop-shadow(0 12px 14px rgba(0,0,0,.22)); }
.cover-wrap::after { position: absolute; inset: 0; background: linear-gradient(90deg,rgba(12,30,23,.75),rgba(12,30,23,.14) 68%,transparent); content: ''; }
.visual-copy { position: relative; z-index: 2; display: grid; width: 67%; height: 100%; align-content: end; padding: 13px 10px 14px 14px; }
.visual-copy span { color: #f4cf76; font-size: clamp(5px,1.7vw,8px); font-weight: 900; letter-spacing: .08em; }
.visual-copy h3 { margin: 4px 0 3px; color: #fff9e9; font-family: var(--font-display); font-size: clamp(13px,4.3vw,22px); line-height: 1.12; text-wrap: balance; }
.visual-copy p { display: -webkit-box; margin: 2px 0 0; overflow: hidden; color: rgba(255,255,255,.72); font-size: clamp(5px,1.8vw,8px); line-height: 1.35; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.companion-seal { position: absolute; z-index: 3; right: 7px; bottom: 7px; display: grid; width: 44px; height: 44px; place-items: center; border: 1px solid rgba(255,255,255,.46); border-radius: 50%; background: color-mix(in srgb,var(--ticket-accent) 72%,rgba(255,255,255,.2)); transform: rotate(-8deg); }
.companion-seal img { position: absolute; bottom: 13px; width: 34px; height: 34px; object-fit: contain; }
.companion-seal span { position: absolute; bottom: 5px; color: #fff; font-size: 4px; font-weight: 900; line-height: 1.1; text-align: center; }
.tear-line { position: relative; z-index: 3; display: flex; flex-direction: column; align-items: center; justify-content: space-evenly; background: #f8f0de; }
.tear-line::before { position: absolute; inset: -10px auto; border-left: 1px dashed rgba(43,59,52,.36); content: ''; }
.tear-line i { position: relative; width: 3px; height: 3px; border-radius: 50%; background: rgba(43,59,52,.32); }
.ticket-stub { position: relative; display: grid; align-content: space-between; min-width: 0; padding: 10px 9px 8px; background: radial-gradient(circle at 80% 0,color-mix(in srgb,var(--ticket-accent) 18%,transparent),transparent 35%),#f8f0de; }
.zoo-label { color: var(--ticket-accent); font: 900 clamp(5px,1.5vw,7px)/1.1 ui-monospace,monospace; letter-spacing: .08em; }
.date { display: grid; gap: 1px; }.date small,dt { color: #7c847e; font-size: clamp(4px,1.15vw,5px); }.date strong { font: 900 clamp(7px,2.2vw,11px) ui-monospace,monospace; }
dl { display: grid; margin: 0; gap: 2px; }dl div { display: flex; justify-content: space-between; gap: 4px; }dd { margin: 0; font-size: clamp(4px,1.35vw,6px); font-weight: 800; white-space: nowrap; }
.barcode { display: flex; height: 15px; align-items: stretch; justify-content: center; gap: 1px; overflow: hidden; }.barcode i { background: #26362f; }
code { overflow: hidden; color: #5f6b65; font-size: clamp(4px,1.15vw,5px); text-align: center; text-overflow: ellipsis; white-space: nowrap; }
.template-companion .ticket-visual { background: var(--ticket-accent); }.template-companion .cover-wrap { inset: 22% 4% 4% 44%; border-radius: 50% 9px 9px 50%; }.template-companion .cover-wrap::after { display: none; }.template-companion .visual-copy { width: 58%; align-content: start; padding-top: 14px; }.template-companion .visual-copy h3 { color: #fff; }.template-companion .companion-seal { right: auto; left: 12px; bottom: 10px; width: 52px; height: 52px; }
.template-expedition { background: #e7ddc7; }.template-expedition .cover-wrap { inset: 9px 42% 9px 9px; border: 1px solid rgba(36,54,46,.28); }.template-expedition .visual-copy { width: 48%; margin-left: 52%; align-content: center; padding: 10px; }.template-expedition .visual-copy h3 { color: #26362f; }.template-expedition .visual-copy span,.template-expedition .visual-copy p { color: #6d4f2b; }.template-expedition .companion-seal { display: none; }
.template-stamp { grid-template-columns: 1fr; aspect-ratio: .72/1; max-width: 62%; margin: 0 auto; border-radius: 3px; outline: 7px dotted #f8f0de; outline-offset: -3px; }.template-stamp .ticket-visual { min-height: 70%; }.template-stamp .tear-line { display: none; }.template-stamp .ticket-stub { grid-template-columns: 1fr 1fr; min-height: 30%; padding: 8px 12px; }.template-stamp .ticket-stub dl,.template-stamp .ticket-stub .barcode { display: none; }.template-stamp .ticket-stub code { grid-column: 1/-1; }.template-stamp .visual-copy { width: 90%; }.template-stamp .companion-seal { width: 52px; height: 52px; }
.exporting { box-shadow: none; }
</style>
