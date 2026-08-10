<script setup lang="ts">
const router = useRouter()
const { active, label, startFogTransition, finishFogTransition } = useFogTransition()

function labelForPath(path: string): string {
  if (path === '/pretrip') return '奇遇启程 · 正在展开'
  if (path.startsWith('/posttrip')) return '收拢回忆 · 正在成册'
  if (path === '/') return '回到旅程 · 再次相遇'
  return '下一段奇遇 · 正在展开'
}

let removeBeforeGuard: (() => void) | undefined
let removeErrorGuard: (() => void) | undefined

onMounted(() => {
  removeBeforeGuard = router.beforeEach(async (to, from) => {
    if (to.fullPath === from.fullPath) return true
    await startFogTransition({ label: labelForPath(to.path) })
    return true
  })
  removeErrorGuard = router.onError(finishFogTransition)
})

onBeforeUnmount(() => {
  removeBeforeGuard?.()
  removeErrorGuard?.()
  finishFogTransition()
})
</script>

<template>
  <Transition name="journey-fog">
    <div v-if="active" class="journey-fog" role="status" aria-live="polite" aria-atomic="true">
      <i /><i /><i /><i />
      <span>{{ label }}</span>
    </div>
  </Transition>
</template>

<style scoped>
.journey-fog {
  position: fixed;
  z-index: 1000;
  inset: 0;
  overflow: hidden;
  background: rgba(226, 239, 232, 0.72);
  backdrop-filter: blur(10px);
}

.journey-fog i {
  position: absolute;
  width: min(78vw, 620px);
  height: min(32vw, 250px);
  min-height: 130px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  filter: blur(25px);
  animation: cloud-drift 1.35s ease-in-out both;
}

.journey-fog i:nth-child(1) { top: 12%; left: -18%; }
.journey-fog i:nth-child(2) { top: 34%; right: -22%; animation-delay: 90ms; }
.journey-fog i:nth-child(3) { bottom: 20%; left: -15%; animation-delay: 160ms; }
.journey-fog i:nth-child(4) { right: -20%; bottom: 2%; animation-delay: 220ms; }

.journey-fog span {
  position: absolute;
  top: 50%;
  left: 50%;
  color: var(--forest);
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 900;
  transform: translate(-50%, -50%);
  white-space: nowrap;
  animation: fog-label 1.35s ease both;
}

.journey-fog-enter-active,
.journey-fog-leave-active { transition: opacity 220ms ease; }
.journey-fog-enter-from,
.journey-fog-leave-to { opacity: 0; }

@keyframes cloud-drift {
  0% { opacity: 0; transform: translateX(-20%) scale(0.8); }
  35% { opacity: 1; transform: translateX(0) scale(1.05); }
  100% { opacity: 0; transform: translateX(28%) scale(1.2); }
}

@keyframes fog-label {
  0%, 100% { opacity: 0; letter-spacing: 0.2em; }
  38%, 65% { opacity: 1; letter-spacing: 0.08em; }
}

@media (prefers-reduced-motion: reduce) {
  .journey-fog i,
  .journey-fog span { animation-duration: 0.01ms; }
}
</style>
