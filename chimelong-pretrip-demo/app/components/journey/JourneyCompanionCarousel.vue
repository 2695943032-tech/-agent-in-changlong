<script setup lang="ts">
import type { Companion } from '../../../shared/types/pretrip'

const props = defineProps<{ companions: Companion[] }>()
const activeIndex = shallowRef(0)
let rotationTimer: ReturnType<typeof setInterval> | undefined

const activeCompanion = computed(() => props.companions[activeIndex.value] ?? props.companions[0])
const displayName = computed(() => activeCompanion.value
  ? `${activeCompanion.value.species.replace('伙伴', '')}${activeCompanion.value.name}`
  : '奇遇伙伴')
const activeNumber = computed(() => String(activeIndex.value + 1).padStart(2, '0'))

function startRotation() {
  if (rotationTimer) clearInterval(rotationTimer)
  rotationTimer = setInterval(() => {
    if (props.companions.length < 2) return
    activeIndex.value = (activeIndex.value + 1) % props.companions.length
  }, 3000)
}

function selectCompanion(index: number) {
  activeIndex.value = index
  startRotation()
}

onMounted(() => {
  for (const companion of props.companions) {
    const image = new Image()
    image.src = companion.selectionImage
  }
  startRotation()
})

onBeforeUnmount(() => {
  if (rotationTimer) clearInterval(rotationTimer)
})
</script>

<template>
  <div
    v-if="activeCompanion"
    class="hero-preview"
    :style="{ '--active-accent': activeCompanion.accent }"
    role="region"
    aria-roledescription="carousel"
    aria-label="六位动物伙伴轮播"
  >
    <div class="preview-coordinate"><span>6 COMPANIONS</span><span>3 SEC / PARTNER</span></div>
    <div class="preview-frame">
      <Transition name="companion-swap" mode="out-in">
        <figure :key="activeCompanion.id" class="companion-portrait">
          <img :src="activeCompanion.selectionImage" :alt="`${displayName}奇遇伙伴形象`">
          <figcaption>
            <small>LIVE · {{ activeNumber }} / {{ String(companions.length).padStart(2, '0') }}</small>
            <strong>{{ displayName }}</strong>
          </figcaption>
        </figure>
      </Transition>
      <span class="frame-corner corner-a" /><span class="frame-corner corner-b" />
    </div>
    <div class="preview-orbit" aria-hidden="true"><i /><i /><i /></div>
    <div class="preview-note">
      <span>MEET YOUR COMPANION</span>
      <strong>{{ activeCompanion.personality }}</strong>
    </div>
    <div class="carousel-indicators" aria-label="选择动物伙伴">
      <button
        v-for="(companion, index) in companions"
        :key="companion.id"
        type="button"
        :class="{ active: index === activeIndex }"
        :aria-label="`查看${companion.species}${companion.name}`"
        :aria-current="index === activeIndex ? 'true' : undefined"
        @click="selectCompanion(index)"
      ><i /></button>
    </div>
  </div>
</template>

<style scoped>
.hero-preview { position: relative; width: min(100%,450px); align-self: center; justify-self: center; }
.preview-coordinate { display: flex; justify-content: space-between; margin-bottom: 9px; color: rgba(242,237,223,.33); font-family: ui-monospace,Consolas,monospace; font-size: 7px; letter-spacing: .12em; }
.preview-frame { position: relative; aspect-ratio: .89; padding: 18px; border: 1px solid rgba(242,237,223,.14); background: rgba(255,255,255,.022); box-shadow: 0 34px 80px rgba(0,0,0,.28); }
.companion-portrait { position: relative; height: 100%; margin: 0; overflow: hidden; background: #eee9dc; }
.companion-portrait::after { position: absolute; inset: 0; background: linear-gradient(180deg,transparent 56%,rgba(7,27,21,.72)); content: ''; }
.companion-portrait img { width: 100%; height: 100%; object-fit: cover; transition: transform 1.2s cubic-bezier(.16,1,.3,1); }
.hero-preview:hover .companion-portrait img { transform: scale(1.035); }
.companion-portrait figcaption { position: absolute; z-index: 2; right: 22px; bottom: 20px; left: 22px; display: flex; align-items: end; justify-content: space-between; gap: 12px; color: #fff; }
.companion-portrait figcaption small { color: color-mix(in srgb,var(--active-accent) 76%,#fff); font-size: 8px; font-weight: 900; letter-spacing: .16em; white-space: nowrap; }
.companion-portrait figcaption strong { font-family: var(--font-display); font-size: 20px; letter-spacing: .08em; text-align: right; }
.frame-corner { position: absolute; width: 22px; height: 22px; border-color: var(--active-accent); transition: border-color 500ms ease; }
.corner-a { top: 8px; left: 8px; border-top: 1px solid; border-left: 1px solid; }
.corner-b { right: 8px; bottom: 8px; border-right: 1px solid; border-bottom: 1px solid; }
.preview-orbit { position: absolute; z-index: -1; inset: -36px -58px; border: 1px solid rgba(242,237,223,.09); border-radius: 50%; transform: rotate(-12deg); }
.preview-orbit i { position: absolute; width: 8px; height: 8px; border: 1px solid var(--active-accent); border-radius: 50%; background: #071b15; transition: border-color 500ms ease; }
.preview-orbit i:nth-child(1) { top: 18%; right: 2%; }
.preview-orbit i:nth-child(2) { bottom: 8%; left: 20%; }
.preview-orbit i:nth-child(3) { top: 2%; left: 29%; }
.preview-note { position: absolute; right: -22px; bottom: -28px; display: grid; width: min(250px,72%); min-height: 62px; padding: 14px 18px; align-content: center; gap: 4px; border-left: 2px solid var(--active-accent); background: #102a21; box-shadow: 0 18px 45px rgba(0,0,0,.25); transition: border-color 500ms ease; }
.preview-note span { color: var(--active-accent); font-family: ui-monospace,Consolas,monospace; font-size: 7px; letter-spacing: .14em; }
.preview-note strong { display: -webkit-box; overflow: hidden; font-family: var(--font-display); font-size: 12px; letter-spacing: .04em; line-height: 1.45; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.carousel-indicators { position: absolute; z-index: 4; bottom: -17px; left: 16px; display: flex; align-items: center; gap: 7px; }
.carousel-indicators button { display: grid; width: 13px; height: 13px; padding: 0; place-items: center; border: 0; background: transparent; }
.carousel-indicators i { width: 4px; height: 4px; border-radius: 99px; background: rgba(242,237,223,.32); transition: width 420ms cubic-bezier(.16,1,.3,1),background 300ms ease,box-shadow 300ms ease; }
.carousel-indicators button.active i { width: 13px; background: var(--active-accent); box-shadow: 0 0 0 3px color-mix(in srgb,var(--active-accent) 14%,transparent); }
.carousel-indicators button:focus-visible { outline: 1px solid var(--active-accent); outline-offset: 2px; }
.companion-swap-enter-active,.companion-swap-leave-active { transition: opacity 430ms ease,transform 650ms cubic-bezier(.16,1,.3,1),filter 430ms ease; }
.companion-swap-enter-from { opacity: 0; filter: blur(8px); transform: translateX(18px) scale(.985); }
.companion-swap-leave-to { opacity: 0; filter: blur(6px); transform: translateX(-12px) scale(1.01); }

@media screen {
  .hero-preview { width: calc(100% - 22px); }
  .preview-frame { padding: 12px; }
  .preview-note { right: -11px; bottom: -22px; width: min(225px,72%); padding: 12px 14px; }
  .preview-orbit { inset: -25px -30px; }
  .carousel-indicators { bottom: -13px; left: 11px; }
}

@media (prefers-reduced-motion: reduce) {
  .companion-swap-enter-active,.companion-swap-leave-active { transition-duration: .01ms; }
  .companion-portrait img,.carousel-indicators i { transition-duration: .01ms; }
}
</style>
