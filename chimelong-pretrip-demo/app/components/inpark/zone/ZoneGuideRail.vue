<script setup lang="ts">
import type { Companion } from '../../../../shared/types/pretrip'

defineProps<{
  primary: Companion
  zoneGuide: Companion
}>()
</script>

<template>
  <aside class="guide-rail" :class="{ single: primary.id === zoneGuide.id }" aria-label="本区域奇遇向导">
    <article class="guide primary-guide">
      <img :src="primary.chatCharacterImage" :alt="`${primary.name}，全程奇遇伙伴`">
      <div><span>全程伙伴</span><strong>{{ primary.name }}</strong><small>{{ primary.personality }}</small></div>
    </article>
    <article v-if="primary.id !== zoneGuide.id" class="guide zone-guide">
      <img :src="zoneGuide.chatCharacterImage" :alt="`${zoneGuide.name}，当前园区向导`">
      <div><span>区域向导</span><strong>{{ zoneGuide.name }}</strong><small>刚刚在这里与你相遇</small></div>
    </article>
  </aside>
</template>

<style scoped>
.guide-rail { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 8px; }
.guide-rail.single { grid-template-columns: 1fr; }
.guide { position: relative; display: grid; grid-template-columns: 58px 1fr; align-items: center; min-height: 78px; padding: 8px 10px 8px 5px; gap: 7px; overflow: hidden; border: 1px solid color-mix(in srgb,var(--zone-accent) 30%,transparent); border-radius: 18px 8px 18px 8px; background: rgba(255,255,255,.82); box-shadow: 0 12px 28px color-mix(in srgb,var(--zone-ink) 10%,transparent); backdrop-filter: blur(14px); }
.guide::after { position: absolute; right: -18px; bottom: -27px; width: 62px; height: 62px; border: 1px solid color-mix(in srgb,var(--zone-accent) 24%,transparent); border-radius: 50%; content: ''; }
.guide img { align-self: end; width: 58px; height: 66px; object-fit: contain; object-position: bottom; filter: drop-shadow(0 6px 7px rgba(29,41,33,.14)); }
.guide div { display: grid; min-width: 0; gap: 1px; }
.guide span { color: var(--zone-accent); font-size: 8px; font-weight: 900; letter-spacing: .08em; }
.guide strong { color: var(--zone-ink); font-family: var(--font-display); font-size: 16px; }
.guide small { overflow: hidden; color: color-mix(in srgb,var(--zone-ink) 65%,transparent); font-size: 8px; text-overflow: ellipsis; white-space: nowrap; }
.zone-guide { border-radius: 8px 18px 8px 18px; }
</style>

