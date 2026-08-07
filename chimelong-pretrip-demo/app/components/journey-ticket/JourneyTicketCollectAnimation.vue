<script setup lang="ts">
import type { Companion } from '../../../shared/types/pretrip'
import type { JourneyRecord } from '../../../shared/types/journey'
import JourneyTicketPreview from './JourneyTicketPreview.vue'

const props = defineProps<{ record: JourneyRecord, companion: Companion }>()

const animationDone = shallowRef(false)
const ticket = computed(() => props.record.ticket!)
const selectedPhoto = computed(() => props.record.media.find(item => item.id === ticket.value.coverPhotoId))
const { objectUrl: photoUrl } = useJourneyMedia(() => selectedPhoto.value?.storageKey)

onMounted(() => {
  window.setTimeout(() => {
    animationDone.value = true
  }, 3600)
})
</script>

<template>
  <section class="collect-scene" :style="{ '--memory-accent': companion.accent }">
    <div class="sparkles" aria-hidden="true">
      <i v-for="index in 18" :key="index" :style="{ '--x': `${(index * 37) % 100}%`, '--delay': `${index * 110}ms`, '--size': `${4 + (index % 5)}px` }" />
    </div>

    <div class="album-backdrop" :class="{ revealed: animationDone }">
      <header>
        <button type="button" aria-label="返回票根册" @click="navigateTo('/posttrip/tickets')">←</button>
        <div>
          <span>TICKET ARCHIVE</span>
          <h1>奇遇票根册</h1>
        </div>
        <small>新入册</small>
      </header>

      <div class="album-page">
        <span>今日空位</span>
        <div class="ticket-slot" :class="{ filled: animationDone }">
          <JourneyTicketPreview v-if="animationDone" :ticket="ticket" :companion="companion" :photo-url="photoUrl" />
          <p v-else>等待票根落位</p>
        </div>
      </div>
    </div>

    <div class="floating-ticket" aria-label="正在加入票根册的票根">
      <JourneyTicketPreview :ticket="ticket" :companion="companion" :photo-url="photoUrl" />
    </div>

    <footer class="collect-copy" :class="{ ready: animationDone }">
      <span>{{ animationDone ? 'COLLECTED' : 'ADDING TO ARCHIVE' }}</span>
      <h2>{{ animationDone ? '已经放进票根册' : '正在把奇遇收好' }}</h2>
      <p>{{ animationDone ? '这张票以后可以在票根册里继续查看。' : '票根会落到空白位置，成为今天的正式收藏。' }}</p>
      <button v-if="animationDone" type="button" @click="navigateTo('/posttrip/tickets')">查看票根册</button>
    </footer>
  </section>
</template>

<style scoped>
.collect-scene { position: relative; width: 100%; max-width: 480px; height: 100dvh; margin: 0 auto; overflow: hidden; background: #0f251d; color: #fff; isolation: isolate; }
.collect-scene::before { position: absolute; z-index: 1; inset: 0; background: radial-gradient(circle at 50% 36%,color-mix(in srgb,var(--memory-accent) 26%,transparent),transparent 27%),rgba(5,18,14,.72); content: ''; animation: scene-dim 3.6s var(--ease-out) forwards; }
.sparkles { position: absolute; z-index: 7; inset: 0; overflow: hidden; pointer-events: none; }
.sparkles i { position: absolute; top: -20px; left: var(--x); width: var(--size); height: calc(var(--size) * 2.8); border-radius: 99px; background: linear-gradient(#fff8c5,#d9a849); box-shadow: 0 0 14px rgba(255,228,135,.8); animation: ribbon-fall 2.9s ease-in var(--delay) infinite; }
.album-backdrop { position: absolute; z-index: 2; inset: 0; opacity: .18; transform: scale(.96); transition: opacity .9s ease, transform .9s var(--ease-out); }
.album-backdrop.revealed { opacity: 1; transform: scale(1); }
.album-backdrop header { display: grid; grid-template-columns: 42px 1fr auto; align-items: center; padding: max(15px,env(safe-area-inset-top)) 16px 14px; gap: 10px; border-bottom: 1px solid rgba(255,255,255,.1); background: rgba(246,239,224,.9); color: #26362f; }
.album-backdrop button { display: grid; width: 40px; height: 40px; place-items: center; border: 1px solid rgba(45,55,48,.14); border-radius: 14px 5px 14px 5px; background: #fff; color: #26362f; font-weight: 900; }
.album-backdrop header span { color: var(--memory-accent); font-size: 8px; font-weight: 900; letter-spacing: .1em; }
.album-backdrop h1 { margin: 0; font-family: var(--font-display); font-size: 20px; }
.album-backdrop small { color: var(--memory-accent); font-weight: 900; }
.album-page { position: absolute; right: 14px; bottom: clamp(202px,25dvh,230px); left: 14px; display: grid; padding: 17px; gap: 10px; border-radius: 22px 8px 22px 8px; background: rgba(255,250,241,.92); box-shadow: 0 28px 58px rgba(0,0,0,.22); }
.album-page > span { color: #9a523e; font-size: 8px; font-weight: 900; letter-spacing: .1em; }
.ticket-slot { display: grid; min-height: 150px; place-items: center; padding: 10px; border: 1px dashed rgba(37,54,46,.28); border-radius: 18px 6px 18px 6px; background: #eee8dc; }
.ticket-slot.filled { border-style: solid; border-color: rgba(37,54,46,.1); background: rgba(255,255,255,.78); }
.ticket-slot p { margin: 0; color: #8a8579; font-size: 10px; }
.ticket-slot :deep(.ticket) { box-shadow: 0 14px 28px rgba(29,43,36,.15); }
.floating-ticket { position: absolute; z-index: 6; top: 78px; right: 18px; left: 18px; filter: drop-shadow(0 28px 34px rgba(0,0,0,.38)); transform-origin: center; animation: ticket-into-book 3.65s var(--ease-out) forwards; }
.collect-copy { position: absolute; z-index: 8; right: 20px; bottom: max(24px,env(safe-area-inset-bottom)); left: 20px; text-align: center; transition: transform .45s var(--ease-out), opacity .45s ease; }
.collect-copy span { color: #f1c96c; font-size: 8px; font-weight: 900; letter-spacing: .16em; }
.collect-copy h2 { margin: 6px 0 4px; font-family: var(--font-display); font-size: 27px; }
.collect-copy p { margin: 0 auto; max-width: 300px; color: rgba(255,255,255,.7); font-size: 10px; line-height: 1.65; }
.collect-copy button { width: 100%; min-height: 48px; margin-top: 13px; border: 0; border-radius: 15px 5px 15px 5px; background: #f5d37c; color: #173027; font-size: 11px; font-weight: 900; box-shadow: 0 14px 28px rgba(0,0,0,.24); }
.collect-copy.ready { transform: translateY(-4px); }
@keyframes ticket-into-book {
  0% { opacity: 0; transform: translateY(-92px) scale(.9) rotate(-2deg); }
  18% { opacity: 1; transform: translateY(8px) scale(1) rotate(0); }
  48% { transform: translateY(92px) scale(.96) rotate(1deg); }
  72% { opacity: 1; transform: translateY(calc(100dvh - 452px)) scale(.78) rotate(-1deg); }
  100% { opacity: 0; transform: translateY(calc(100dvh - 408px)) scale(.7) rotate(0); }
}
@keyframes ribbon-fall {
  0% { opacity: 0; transform: translateY(-20px) rotate(0); }
  18% { opacity: 1; }
  100% { opacity: 0; transform: translateY(100dvh) rotate(260deg); }
}
@keyframes scene-dim {
  0%,58% { background-color: rgba(5,18,14,.76); }
  100% { background-color: rgba(5,18,14,.28); }
}
</style>
