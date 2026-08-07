<script setup lang="ts">
defineProps<{
  to: string
  label: string
  meta?: string
}>()
</script>

<template>
  <NuxtLink class="shimmer-link" :to="to">
    <span class="border-trail" aria-hidden="true" />
    <span class="shimmer-surface" aria-hidden="true" />
    <span class="shimmer-copy">
      <small v-if="meta">{{ meta }}</small>
      <strong>{{ label }}</strong>
    </span>
    <span class="shimmer-arrow" aria-hidden="true">↗</span>
  </NuxtLink>
</template>

<style scoped>
.shimmer-link {
  position: relative;
  display: inline-flex;
  min-width: 208px;
  min-height: 62px;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px 10px 21px;
  overflow: hidden;
  gap: 24px;
  border: 1px solid rgba(238, 210, 148, .42);
  border-radius: 4px;
  background: #d9ae58;
  box-shadow: 0 18px 48px rgba(0, 0, 0, .24);
  color: #10261f;
  text-decoration: none;
  transition: transform 440ms cubic-bezier(.16, 1, .3, 1), box-shadow 440ms cubic-bezier(.16, 1, .3, 1);
}

.shimmer-surface {
  position: absolute;
  inset: 0;
  background: linear-gradient(108deg, transparent 25%, rgba(255,255,255,.46) 45%, transparent 64%);
  transform: translateX(-120%);
  animation: shimmer-pass 4.6s ease-in-out infinite;
}

.border-trail {
  position: absolute;
  z-index: 2;
  top: -1px;
  left: -30%;
  width: 28%;
  height: 1px;
  background: linear-gradient(90deg, transparent, #fff4c8, transparent);
  filter: drop-shadow(0 0 5px rgba(255, 238, 177, .75));
  animation: border-travel 3.8s linear infinite;
}

.shimmer-copy { position: relative; z-index: 3; display: grid; gap: 2px; }
.shimmer-copy small { font-size: 8px; font-weight: 800; letter-spacing: .12em; opacity: .62; }
.shimmer-copy strong { font-size: 13px; letter-spacing: .04em; }
.shimmer-arrow { position: relative; z-index: 3; display: grid; width: 38px; height: 38px; place-items: center; border: 1px solid rgba(16,38,31,.18); border-radius: 50%; font-size: 17px; transition: transform 440ms cubic-bezier(.16, 1, .3, 1), background 240ms ease; }

.shimmer-link:hover { box-shadow: 0 24px 62px rgba(0,0,0,.3); transform: translateY(-3px); }
.shimmer-link:hover .shimmer-arrow { background: rgba(255,255,255,.35); transform: rotate(45deg); }
.shimmer-link:active { transform: translateY(-1px) scale(.985); }
.shimmer-link:focus-visible { outline: 3px solid rgba(239, 210, 145, .38); outline-offset: 4px; }

@keyframes shimmer-pass {
  0%, 48% { transform: translateX(-120%); }
  72%, 100% { transform: translateX(150%); }
}

@keyframes border-travel {
  0% { top: -1px; left: -30%; transform: rotate(0); }
  38% { top: -1px; left: 102%; transform: rotate(0); }
  39% { top: 0; left: 100%; transform: rotate(90deg); transform-origin: left; }
  55% { top: 100%; left: 100%; transform: rotate(90deg); transform-origin: left; }
  56% { top: 100%; left: 100%; transform: rotate(180deg); transform-origin: left; }
  94% { top: 100%; left: -30%; transform: rotate(180deg); transform-origin: left; }
  100% { top: -1px; left: -30%; transform: rotate(180deg); }
}

@media (prefers-reduced-motion: reduce) {
  .shimmer-surface,
  .border-trail { animation: none; }
  .shimmer-link,
  .shimmer-arrow { transition-duration: .01ms; }
}
</style>
