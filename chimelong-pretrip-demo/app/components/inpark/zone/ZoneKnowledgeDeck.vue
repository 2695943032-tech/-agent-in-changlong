<script setup lang="ts">
import type { ZoneExperienceConfig } from '../../../../shared/data/zoneExperience'

defineProps<{ zone: ZoneExperienceConfig }>()
</script>

<template>
  <section class="knowledge-deck" aria-labelledby="zone-knowledge-title">
    <header><span>FIELD NOTES · 现场档案</span><h2 id="zone-knowledge-title">今天在这里，可以知道更多</h2></header>
    <div class="knowledge-grid">
      <article class="food"><i>01</i><span>今日食谱</span><p>{{ zone.dailyFood }}</p></article>
      <article class="habit"><i>02</i><span>生活习性</span><p>{{ zone.lifeHabits }}</p></article>
      <article class="nearby"><i>03</i><span>顺路建议</span><p>{{ zone.recommendations }}</p></article>
    </div>
  </section>
</template>

<style scoped>
.knowledge-deck { padding: 4px 0; }
.knowledge-deck header { padding: 0 3px 12px; }
.knowledge-deck header span { color: var(--zone-accent); font-size: 8px; font-weight: 900; letter-spacing: .12em; }
.knowledge-deck h2 { margin: 5px 0 0; color: var(--zone-ink); font-family: var(--font-display); font-size: 21px; line-height: 1.3; }
.knowledge-grid { display: grid; grid-template-columns: 1.05fr .95fr; gap: 8px; }
.knowledge-grid article { position: relative; min-height: 148px; padding: 16px 14px; overflow: hidden; border-radius: 18px 7px 18px 7px; background: var(--zone-soft); }
.knowledge-grid article:nth-child(2) { border-radius: 7px 18px 7px 18px; background: color-mix(in srgb,var(--zone-accent) 12%,#fff); }
.knowledge-grid article:nth-child(3) { grid-column: 1 / -1; min-height: 100px; border: 1px solid color-mix(in srgb,var(--zone-accent) 24%,transparent); background: rgba(255,255,255,.78); }
.knowledge-grid i { position: absolute; top: 9px; right: 11px; color: color-mix(in srgb,var(--zone-accent) 32%,transparent); font-family: ui-monospace,monospace; font-size: 28px; font-style: normal; font-weight: 900; }
.knowledge-grid span { position: relative; color: var(--zone-accent); font-size: 9px; font-weight: 900; }
.knowledge-grid p { position: relative; margin: 18px 0 0; color: var(--zone-ink); font-size: 11px; line-height: 1.72; }
.nearby p { margin-top: 9px; }
</style>

