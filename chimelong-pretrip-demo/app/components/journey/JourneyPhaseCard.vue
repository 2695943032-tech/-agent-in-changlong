<script setup lang="ts">
import type { JourneyPhase } from './types'

const props = defineProps<{
  phase: JourneyPhase
  active: boolean
}>()

const emit = defineEmits<{
  activate: [phaseId: JourneyPhase['id']]
}>()

const cardStyle = computed(() => ({
  '--phase-accent': props.phase.accent,
  '--phase-soft': props.phase.accentSoft,
}))
</script>

<template>
  <NuxtLink
    class="phase-card"
    :class="{ active }"
    :style="cardStyle"
    :to="phase.to"
    @mouseenter="emit('activate', phase.id)"
    @focusin="emit('activate', phase.id)"
  >
    <span class="active-plane" aria-hidden="true" />
    <span class="phase-index">{{ phase.index }}</span>
    <span class="phase-main">
      <small>{{ phase.eyebrow }} · {{ phase.englishTitle }}</small>
      <strong>{{ phase.title }}</strong>
      <p>{{ phase.description }}</p>
    </span>
    <span class="phase-status">
      <i />
      {{ phase.status }}
    </span>
    <span class="phase-arrow" aria-hidden="true">→</span>
  </NuxtLink>
</template>

<style scoped>
.phase-card {
  position: relative;
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) auto 32px;
  min-height: 128px;
  align-items: center;
  padding: 20px 18px;
  overflow: hidden;
  gap: 16px;
  border-top: 1px solid rgba(226, 211, 174, .17);
  color: rgba(250, 247, 237, .78);
  text-decoration: none;
  transition: color 380ms ease, transform 520ms cubic-bezier(.16, 1, .3, 1), border-color 380ms ease;
}

.active-plane {
  position: absolute;
  inset: 7px 0;
  border: 1px solid color-mix(in srgb, var(--phase-accent) 38%, transparent);
  border-radius: 3px;
  background: linear-gradient(102deg, color-mix(in srgb, var(--phase-accent) 14%, rgba(255,255,255,.02)), transparent 70%);
  opacity: 0;
  transform: scaleX(.96);
  transition: opacity 380ms ease, transform 520ms cubic-bezier(.16, 1, .3, 1);
}

.phase-index,
.phase-main,
.phase-status,
.phase-arrow { position: relative; z-index: 2; }

.phase-index { color: var(--phase-accent); font-family: ui-monospace, "SFMono-Regular", Consolas, monospace; font-size: 11px; letter-spacing: .12em; }
.phase-main { display: grid; gap: 3px; }
.phase-main small { color: color-mix(in srgb, var(--phase-accent) 76%, #fff); font-size: 8px; font-weight: 800; letter-spacing: .13em; text-transform: uppercase; }
.phase-main strong { font-family: var(--font-display); font-size: clamp(25px, 3vw, 35px); font-weight: 700; letter-spacing: .06em; }
.phase-main p { max-width: 470px; margin: 4px 0 0; color: rgba(250,247,237,.47); font-size: 10px; line-height: 1.7; transition: color 380ms ease; }
.phase-status { display: inline-flex; align-items: center; gap: 7px; color: rgba(250,247,237,.48); font-size: 9px; white-space: nowrap; }
.phase-status i { width: 5px; height: 5px; border-radius: 50%; background: var(--phase-accent); box-shadow: 0 0 0 4px color-mix(in srgb, var(--phase-accent) 12%, transparent); }
.phase-arrow { display: grid; width: 30px; height: 30px; place-items: center; border: 1px solid rgba(250,247,237,.13); border-radius: 50%; transition: background 320ms ease, color 320ms ease, transform 520ms cubic-bezier(.16, 1, .3, 1); }

.phase-card.active { border-color: transparent; color: #fffaf0; transform: translateX(8px); }
.phase-card.active .active-plane { opacity: 1; transform: scaleX(1); }
.phase-card.active .phase-main p { color: rgba(250,247,237,.68); }
.phase-card.active .phase-arrow { background: var(--phase-accent); color: #10261f; transform: translateX(2px); }
.phase-card:focus-visible { outline: 2px solid var(--phase-accent); outline-offset: -4px; }
.phase-card:active { transform: translateX(5px) scale(.992); }

@media (max-width: 680px) {
  .phase-card { grid-template-columns: 35px minmax(0,1fr) 28px; min-height: 134px; padding: 18px 6px; gap: 10px; }
  .phase-status { grid-column: 2; justify-self: start; }
  .phase-arrow { grid-column: 3; grid-row: 1 / span 2; }
  .phase-main strong { font-size: 25px; }
  .phase-main p { font-size: 9px; }
  .phase-card.active { transform: translateX(4px); }
}

@media (prefers-reduced-motion: reduce) {
  .phase-card,
  .active-plane,
  .phase-arrow { transition-duration: .01ms; }
}
</style>
