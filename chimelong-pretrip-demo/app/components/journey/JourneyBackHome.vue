<script setup lang="ts">
defineProps<{
  stage: string
  light?: boolean
}>()
</script>

<template>
  <nav class="journey-back" :class="{ light }" aria-label="全周期旅程导航">
    <NuxtLink class="back-link" to="/" aria-label="返回全周期首页">←</NuxtLink>
    <span><small>CHIMELONG JOURNEY</small><strong>{{ stage }}</strong></span>
    <NuxtLink class="stage-menu" to="/">全旅程</NuxtLink>
  </nav>
</template>

<style scoped>
.journey-back {
  position: absolute;
  z-index: 40;
  top: 0;
  left: 50%;
  display: grid;
  grid-template-columns: 40px 1fr auto;
  align-items: center;
  width: min(100%, 480px);
  min-height: calc(64px + env(safe-area-inset-top));
  padding: max(10px, env(safe-area-inset-top)) 18px 8px;
  gap: 10px;
  border: 0;
  border-bottom: 1px solid rgba(255, 255, 255, .12);
  border-radius: 0;
  background: linear-gradient(180deg, rgba(5, 29, 23, .82), rgba(5, 29, 23, .18));
  box-shadow: none;
  color: #fff;
  transform: translateX(-50%);
  backdrop-filter: blur(8px);
}

.back-link {
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border: 1px solid rgba(255,255,255,.2);
  border-radius: 12px;
  background: rgba(255,255,255,.08);
  color: #fff;
  font-size: 18px;
  text-decoration: none;
}

.journey-back > span {
  display: grid;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.journey-back small {
  color: var(--accent);
  font-size: 8px;
  font-weight: 800;
  letter-spacing: .13em;
}

.journey-back strong {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: .04em;
}

.stage-menu {
  min-height: 40px;
  padding: 11px 4px 9px 10px;
  color: rgba(255,255,255,.7);
  font-size: 11px;
  font-weight: 800;
  text-decoration: none;
}

.journey-back.light {
  border-color: rgba(255, 255, 255, 0.12);
  background: linear-gradient(180deg, rgba(18, 12, 42, .82), rgba(18, 12, 42, .14));
  color: #fff;
}

.journey-back.light .stage-menu {
  color: rgba(255, 255, 255, 0.7);
}
</style>
