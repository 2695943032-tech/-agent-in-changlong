<script setup lang="ts">
import type { Companion } from '../../../shared/types/pretrip'
import type { JourneyRecord } from '../../../shared/types/journey'
import { buildJourneyTicket } from '../../utils/journeyRecord'
import JourneyTicketPreview from '../journey-ticket/JourneyTicketPreview.vue'

const props = defineProps<{ journey: JourneyRecord, companion: Companion }>()
const emit = defineEmits<{ close: [] }>()
const slide = shallowRef(0)
const ticket = computed(() => props.journey.ticket ?? buildJourneyTicket(props.journey))
const slides = computed(() => [
  { kicker: props.journey.visitDate.replaceAll('-', '.'), title: `和${props.companion.name}出发的这一天`, text: '脚步从入口开始，新的朋友正在地图上等你。' },
  { kicker: 'FOOTPRINTS', title: `${props.journey.actualJourney.visitedZoneIds.length} 个展区 · ${(props.journey.actualJourney.walkingDistanceMeters / 1000).toFixed(1)} 公里`, text: '每一次路线改变，都成为旅程真实发生过的证据。' },
  { kicker: 'BADGES & MOMENTS', title: `完成 ${props.journey.actualJourney.completedTaskIds.length} 个任务，收下 ${props.journey.actualJourney.badgeZoneIds.length} 枚徽章`, text: '认真看过这个世界，就会留下属于自己的答案。' },
  { kicker: `${props.companion.name}的留言`, title: ticket.value.message ?? '下一次，也一起出发。', text: '动物伙伴已经把今天收进回忆星册。' },
])
let timer: ReturnType<typeof setInterval> | undefined

onMounted(() => { timer = setInterval(() => { slide.value = (slide.value + 1) % 5 }, 3500) })
onBeforeUnmount(() => { if (timer) clearInterval(timer) })
</script>

<template>
  <div class="reel-backdrop">
    <section class="reel" :style="{ '--reel-accent': companion.accent }">
      <button class="close" type="button" aria-label="关闭回忆短片" @click="emit('close')">×</button>
      <div class="progress"><i v-for="index in 5" :key="index" :class="{ active: index - 1 <= slide }" /></div>
      <Transition name="reel-slide" mode="out-in">
        <article v-if="slide < 4" :key="slide" class="reel-copy">
          <span>{{ slides[slide]!.kicker }}</span><h2>{{ slides[slide]!.title }}</h2><p>{{ slides[slide]!.text }}</p>
          <img :src="companion.chatCharacterImage" :alt="companion.name">
        </article>
        <article v-else key="ticket" class="reel-ticket"><span>FINAL MEMORY</span><JourneyTicketPreview :ticket="ticket" :companion="companion" /><h2>下一次，也一起出发</h2><i>{{ companion.name }} · 旅行印章</i></article>
      </Transition>
      <button class="next" type="button" @click="slide = (slide + 1) % 5">{{ slide === 4 ? '重新播放' : '下一幕' }} →</button>
    </section>
  </div>
</template>

<style scoped>
.reel-backdrop { position: fixed; z-index: 100; inset: 0; display: grid; place-items: center; background: #071a15; }.reel { position: relative; width: min(100%,480px); height: 100dvh; overflow: hidden; background: radial-gradient(circle at 75% 15%,color-mix(in srgb,var(--reel-accent) 22%,transparent),transparent 28%),linear-gradient(160deg,#102e26,#081a16); color: #fff; }.close { position: absolute; z-index: 5; top: max(14px,env(safe-area-inset-top)); right: 16px; display: grid; width: 39px; height: 39px; place-items: center; border: 1px solid rgba(255,255,255,.16); border-radius: 50%; background: rgba(255,255,255,.07); color: #fff; font-size: 21px; }.progress { position: absolute; z-index: 5; top: max(18px,env(safe-area-inset-top)); right: 64px; left: 18px; display: grid; grid-template-columns: repeat(5,1fr); gap: 4px; }.progress i { height: 2px; background: rgba(255,255,255,.18); }.progress i.active { background: #e2bd69; }
.reel-copy,.reel-ticket { position: absolute; inset: 0; display: grid; align-content: center; padding: 50px 28px 90px; }.reel-copy > span,.reel-ticket > span { color: #e2bd69; font-size: 9px; font-weight: 900; letter-spacing: .15em; }.reel-copy h2 { position: relative; z-index: 2; max-width: 360px; margin: 14px 0 12px; font-family: var(--font-display); font-size: 39px; line-height: 1.15; }.reel-copy p { position: relative; z-index: 2; max-width: 300px; margin: 0; color: rgba(255,255,255,.62); font-size: 11px; line-height: 1.7; }.reel-copy img { position: absolute; right: -80px; bottom: 35px; width: 360px; height: 440px; object-fit: contain; object-position: bottom; opacity: .48; filter: drop-shadow(0 30px 30px rgba(0,0,0,.32)); }.reel-ticket { gap: 20px; }.reel-ticket h2 { margin: 0; font-family: var(--font-display); font-size: 30px; text-align: center; }.reel-ticket > i { justify-self: center; padding: 12px; border: 3px double #e2bd69; border-radius: 50%; color: #e2bd69; font-size: 9px; font-style: normal; transform: rotate(-8deg); animation: reel-stamp .55s var(--ease-out); }.next { position: absolute; z-index: 6; right: 22px; bottom: max(20px,env(safe-area-inset-bottom)); padding: 11px 14px; border: 1px solid rgba(255,255,255,.15); border-radius: 13px 4px 13px 4px; background: rgba(255,255,255,.07); color: #fff; font-size: 9px; font-weight: 900; }.reel-slide-enter-active,.reel-slide-leave-active { transition: opacity .45s ease,transform .55s var(--ease-out); }.reel-slide-enter-from { opacity: 0; transform: translateY(22px); }.reel-slide-leave-to { opacity: 0; transform: translateY(-18px); }@keyframes reel-stamp { from { opacity: 0; transform: scale(1.8) rotate(0); } to { opacity: 1; transform: rotate(-8deg); } }
</style>
