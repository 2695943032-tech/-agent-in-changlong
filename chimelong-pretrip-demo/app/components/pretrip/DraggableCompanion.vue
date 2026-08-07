<script setup lang="ts">
import type { Companion } from '../../../shared/types/pretrip'

type DockSide = 'left' | 'right'
type MascotAction = 'clicked' | 'cheer' | 'nod' | 'twirl' | 'settling' | null

const props = defineProps<{
  companion: Companion
  reactionKey: number
  enableSwitch?: boolean
}>()

const emit = defineEmits<{
  activate: []
  switchRequest: []
}>()

const mascotButton = useTemplateRef<HTMLButtonElement>('mascotButton')
const position = reactive({ x: 0, y: 112 })
const dockSide = shallowRef<DockSide>('right')
const action = shallowRef<MascotAction>(null)
const dragTilt = shallowRef(0)
const isDragging = shallowRef(false)

let resizeObserver: ResizeObserver | undefined
let actionTimer: ReturnType<typeof setTimeout> | undefined
let actionRequest = 0
let suppressClickUntil = 0
let tapTimer: ReturnType<typeof setTimeout> | undefined
let dragState: {
  pointerId: number
  clientX: number
  clientY: number
  originX: number
  originY: number
  moved: boolean
} | null = null

const mascotStyle = computed(() => ({
  '--mascot-x': `${position.x}px`,
  '--mascot-y': `${position.y}px`,
  '--drag-tilt': `${dragTilt.value}deg`,
}))

const isFlipped = computed(() => {
  const artworkGripsLeft = props.companion.id === 'tiger'
  return artworkGripsLeft
    ? dockSide.value === 'right'
    : dockSide.value === 'left'
})

function getStage(): HTMLElement | null {
  return mascotButton.value?.offsetParent instanceof HTMLElement
    ? mascotButton.value.offsetParent
    : null
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}

function dock(side: DockSide, animate = true) {
  const stage = getStage()
  const button = mascotButton.value
  if (!stage || !button) return

  dockSide.value = side
  const width = button.offsetWidth
  position.x = side === 'right'
    ? stage.clientWidth - width * 0.72
    : -width * 0.28
  position.y = clamp(position.y, 76, Math.max(76, stage.clientHeight - button.offsetHeight - 16))
  dragTilt.value = 0
  if (animate) void playAction('settling', 430)
}

async function playAction(nextAction: Exclude<MascotAction, null>, duration = 760) {
  const request = ++actionRequest
  if (actionTimer) clearTimeout(actionTimer)
  action.value = null
  await nextTick()
  if (request !== actionRequest) return

  action.value = nextAction
  actionTimer = setTimeout(() => {
    if (request === actionRequest) action.value = null
  }, duration)
}

function resetDock() {
  position.y = 112
  dock('right', false)
}

function onPointerDown(event: PointerEvent) {
  if (event.button !== 0) return
  mascotButton.value?.setPointerCapture(event.pointerId)
  dragState = {
    pointerId: event.pointerId,
    clientX: event.clientX,
    clientY: event.clientY,
    originX: position.x,
    originY: position.y,
    moved: false,
  }
  actionRequest += 1
  if (actionTimer) clearTimeout(actionTimer)
  action.value = null
}

function onPointerMove(event: PointerEvent) {
  if (!dragState || event.pointerId !== dragState.pointerId) return
  const deltaX = event.clientX - dragState.clientX
  const deltaY = event.clientY - dragState.clientY

  if (!dragState.moved && Math.hypot(deltaX, deltaY) < 6) return
  dragState.moved = true
  isDragging.value = true
  action.value = null

  const stage = getStage()
  const button = mascotButton.value
  if (!stage || !button) return

  position.x = clamp(
    dragState.originX + deltaX,
    -button.offsetWidth * 0.22,
    stage.clientWidth - button.offsetWidth * 0.78,
  )
  position.y = clamp(
    dragState.originY + deltaY,
    70,
    Math.max(70, stage.clientHeight - button.offsetHeight - 12),
  )
  dragTilt.value = clamp(deltaX * 0.12, -13, 13)
}

function finishPointer(event: PointerEvent) {
  if (!dragState || event.pointerId !== dragState.pointerId) return
  const wasDragged = dragState.moved
  dragState = null
  isDragging.value = false

  if (mascotButton.value?.hasPointerCapture(event.pointerId)) {
    mascotButton.value.releasePointerCapture(event.pointerId)
  }

  if (!wasDragged) return

  suppressClickUntil = Date.now() + 300
  const stage = getStage()
  const button = mascotButton.value
  const center = position.x + (button?.offsetWidth ?? 0) / 2
  dock(center < (stage?.clientWidth ?? 0) / 2 ? 'left' : 'right')
}

function onPointerCancel(event: PointerEvent) {
  if (!dragState || event.pointerId !== dragState.pointerId) return
  dragState = null
  isDragging.value = false
  dock(dockSide.value)
}

function onClick(event: MouseEvent) {
  if (Date.now() < suppressClickUntil) {
    event.preventDefault()
    return
  }
  if (!props.enableSwitch) {
    void playAction('clicked')
    emit('activate')
    return
  }

  if (tapTimer) {
    clearTimeout(tapTimer)
    tapTimer = undefined
    void playAction('twirl', 900)
    emit('switchRequest')
    return
  }

  tapTimer = setTimeout(() => {
    tapTimer = undefined
    void playAction('clicked')
    emit('activate')
  }, 260)
}

watch(() => props.reactionKey, (value, previous) => {
  if (value === previous) return
  const reactions = ['cheer', 'nod', 'twirl'] as const
  void playAction(reactions[value % reactions.length]!, 920)
})

watch(() => props.companion.id, async () => {
  await nextTick()
  resetDock()
})

onMounted(async () => {
  await nextTick()
  resetDock()
  const stage = getStage()
  if (!stage) return
  resizeObserver = new ResizeObserver(() => dock(dockSide.value, false))
  resizeObserver.observe(stage)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  if (actionTimer) clearTimeout(actionTimer)
  if (tapTimer) clearTimeout(tapTimer)
})
</script>

<template>
  <button
    ref="mascotButton"
    class="draggable-companion"
    :class="[
      `dock-${dockSide}`,
      action ? `action-${action}` : '',
      { dragging: isDragging, 'is-flipped': isFlipped },
    ]"
    :style="mascotStyle"
    type="button"
    :aria-label="enableSwitch ? `${companion.name}，单击互动，双击切换伙伴，按住可拖动` : `${companion.name}，点击互动，按住可拖动到聊天框另一侧`"
    @click="onClick"
    @dragstart.prevent
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="finishPointer"
    @pointercancel="onPointerCancel"
  >
    <span class="companion-tip">{{ isDragging ? '揪住衣领 · 拖动中' : enableSwitch ? '单击聊聊 · 双击换伙伴' : '点我 · 拖动' }}</span>
    <span class="companion-flipper">
      <span class="companion-actor">
        <img
          class="companion-image companion-image-docked"
          :src="companion.chatCharacterImage"
          :alt="`${companion.name}扒在聊天框侧边`"
        >
        <img
          class="companion-image companion-image-dragging"
          :src="companion.dragCharacterImage"
          :alt="`${companion.name}被轻轻揪住衣领悬空`"
        >
        <i class="spark spark-one" />
        <i class="spark spark-two" />
        <i class="spark spark-three" />
      </span>
    </span>
  </button>
</template>

<style scoped>
.draggable-companion {
  --mascot-size: clamp(112px, 29vw, 132px);
  position: absolute;
  z-index: 6;
  top: 0;
  left: 0;
  width: var(--mascot-size);
  height: var(--mascot-size);
  padding: 0;
  border: 0;
  outline: 0;
  background: transparent;
  cursor: grab;
  touch-action: none;
  transform: translate3d(var(--mascot-x), var(--mascot-y), 0);
  transition: transform 360ms cubic-bezier(0.22, 0.86, 0.25, 1.18);
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.draggable-companion.dragging {
  cursor: grabbing;
  transition: none;
}

.draggable-companion:focus-visible {
  filter: drop-shadow(0 0 0.45rem color-mix(in srgb, var(--agent-accent) 70%, transparent));
}

.companion-flipper,
.companion-actor,
.companion-actor img {
  display: block;
  width: 100%;
  height: 100%;
}

.companion-flipper {
  transform: scaleX(1);
  transition: transform 240ms ease;
}

.is-flipped .companion-flipper {
  transform: scaleX(-1);
}

.companion-actor {
  position: relative;
  transform-origin: 72% 52%;
  filter: drop-shadow(0 10px 12px rgba(20, 47, 39, 0.18));
}

.companion-image {
  position: absolute;
  inset: 0;
  object-fit: contain;
  opacity: 1;
  pointer-events: none;
  transition: opacity 100ms ease;
  -webkit-user-drag: none;
}

.companion-image-dragging {
  opacity: 0;
  transform-origin: 50% 8%;
}

.dragging .companion-image-docked {
  opacity: 0;
}

.dragging .companion-image-dragging {
  opacity: 1;
  animation: collar-dangle 520ms ease-in-out infinite alternate;
}

.dragging .companion-actor {
  filter: drop-shadow(0 16px 17px rgba(20, 47, 39, 0.24));
  transform: rotate(var(--drag-tilt)) scale(1.07);
}

.companion-tip {
  position: absolute;
  z-index: 2;
  top: 7px;
  left: 50%;
  padding: 5px 8px;
  border: 1px solid rgba(255, 255, 255, 0.7);
  border-radius: 999px;
  background: rgba(13, 52, 43, 0.82);
  box-shadow: 0 5px 14px rgba(20, 47, 39, 0.16);
  color: #fff;
  font-size: 7px;
  font-weight: 800;
  opacity: 0;
  pointer-events: none;
  transform: translate(-50%, 5px);
  transition: opacity 160ms ease, transform 160ms ease;
  white-space: nowrap;
  backdrop-filter: blur(8px);
}

.draggable-companion:hover .companion-tip,
.draggable-companion:focus-visible .companion-tip,
.action-clicked .companion-tip,
.dragging .companion-tip {
  opacity: 1;
  transform: translate(-50%, 0);
}

.spark {
  position: absolute;
  width: 9px;
  height: 9px;
  opacity: 0;
  pointer-events: none;
}

.spark::before,
.spark::after {
  position: absolute;
  inset: 4px 0;
  border-radius: 999px;
  background: var(--agent-accent);
  content: '';
}

.spark::after {
  transform: rotate(90deg);
}

.spark-one { top: 10%; left: 14%; }
.spark-two { top: 23%; right: 4%; transform: scale(0.75); }
.spark-three { right: 13%; bottom: 8%; transform: scale(0.55); }

.action-clicked .companion-actor { animation: mascot-wave 720ms cubic-bezier(0.2, 0.82, 0.2, 1); }
.action-cheer .companion-actor { animation: mascot-cheer 900ms cubic-bezier(0.17, 0.82, 0.22, 1); }
.action-nod .companion-actor { animation: mascot-nod 820ms ease-in-out; }
.action-twirl .companion-actor { animation: mascot-twirl 900ms cubic-bezier(0.2, 0.72, 0.22, 1); }
.action-settling .companion-actor { animation: mascot-settle 420ms ease-out; }

.action-cheer .spark,
.action-twirl .spark {
  animation: sparkle-pop 720ms ease-out both;
}

.action-cheer .spark-two,
.action-twirl .spark-two { animation-delay: 80ms; }
.action-cheer .spark-three,
.action-twirl .spark-three { animation-delay: 150ms; }

@keyframes mascot-wave {
  0%, 100% { transform: rotate(0) scale(1); }
  24% { transform: rotate(-9deg) scale(1.06); }
  48% { transform: rotate(7deg) translateY(-7px) scale(1.08); }
  72% { transform: rotate(-4deg) scale(1.03); }
}

@keyframes mascot-cheer {
  0%, 100% { transform: translateY(0) scale(1); }
  28% { transform: translateY(-18px) rotate(-6deg) scale(1.08); }
  52% { transform: translateY(2px) rotate(4deg) scale(0.98); }
  72% { transform: translateY(-7px) scale(1.04); }
}

@keyframes mascot-nod {
  0%, 100% { transform: rotate(0) scale(1); }
  22%, 58% { transform: rotate(7deg) translateY(5px) scale(0.98); }
  40%, 76% { transform: rotate(-3deg) translateY(-2px) scale(1.03); }
}

@keyframes mascot-twirl {
  0%, 100% { transform: rotate(0) scale(1); }
  25% { transform: rotate(-12deg) scale(1.06); }
  55% { transform: rotate(14deg) translateY(-10px) scale(1.1); }
  78% { transform: rotate(-5deg) scale(1.02); }
}

@keyframes mascot-settle {
  0% { transform: scale(1.06) rotate(var(--drag-tilt)); }
  55% { transform: scale(0.96) rotate(-3deg); }
  100% { transform: scale(1) rotate(0); }
}

@keyframes collar-dangle {
  from { transform: translateY(-2px) rotate(-2.2deg); }
  to { transform: translateY(3px) rotate(2.2deg); }
}

@keyframes sparkle-pop {
  0% { opacity: 0; translate: 0 8px; scale: 0.3; }
  36% { opacity: 1; translate: 0 -4px; scale: 1.25; }
  100% { opacity: 0; translate: 0 -15px; scale: 0.55; }
}

@media (prefers-reduced-motion: reduce) {
  .draggable-companion,
  .companion-flipper,
  .companion-tip {
    transition-duration: 0.01ms;
  }

  .companion-actor,
  .spark {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}
</style>
