<script setup lang="ts">
import type { PlanStop } from '../../../shared/types/pretrip'

defineProps<{
  stops: PlanStop[]
}>()
</script>

<template>
  <section class="timeline-section" aria-labelledby="timeline-title">
    <div class="section-heading"><span>你的时间轴</span><h3 id="timeline-title">每一站都有距离和理由</h3></div>
    <ol class="timeline-list">
      <li v-for="(stop, index) in stops" :key="stop.id" class="timeline-item">
        <div class="timeline-rail"><span>{{ index + 1 }}</span><i v-if="index < stops.length - 1" /></div>
        <article class="stop-card">
          <div class="stop-topline"><span>{{ stop.startTime }}—{{ stop.endTime }}</span><small>{{ stop.distanceMeters }}米 · 步行{{ stop.travelMinutes }}分 · 等待{{ stop.queueMinutes }}分</small></div>
          <div class="stop-title"><strong>{{ stop.name }}</strong><em v-if="stop.priorityRank">优先级 #{{ stop.priorityRank }}</em><em v-else>用餐</em></div>
          <p>{{ stop.reason }}</p>
        </article>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.timeline-section { margin-top: 25px; }
.section-heading span { color: var(--accent-dark); font-size: 10px; font-weight: 900; letter-spacing: 0.1em; }
.section-heading h3 { margin: 4px 0 15px; color: var(--ink); font-family: var(--font-display); font-size: 22px; }
.timeline-list { margin: 0; padding: 0; list-style: none; }
.timeline-item { display: grid; grid-template-columns: 29px 1fr; gap: 9px; }
.timeline-rail { display: flex; align-items: center; flex-direction: column; }
.timeline-rail span { z-index: 1; display: grid; width: 26px; height: 26px; place-items: center; border-radius: 50%; background: var(--forest); color: #fff; font-size: 9px; font-weight: 900; }
.timeline-rail i { width: 1px; flex: 1; min-height: 18px; background: repeating-linear-gradient(to bottom, var(--accent) 0 4px, transparent 4px 8px); }
.stop-card { margin-bottom: 11px; padding: 14px; border: 1px solid var(--line); border-radius: 13px; background: var(--surface); }
.stop-topline { display: flex; align-items: center; justify-content: space-between; gap: 7px; }
.stop-topline > span { color: var(--accent-dark); font-size: 11px; font-weight: 900; }
.stop-topline small { color: var(--muted); font-size: 9px; text-align: right; }
.stop-title { display: flex; align-items: center; margin-top: 8px; gap: 6px; }
.stop-title strong { color: var(--ink); font-size: 15px; }
.stop-title em { padding: 3px 5px; border-radius: 6px; background: var(--forest-soft); color: var(--forest); font-size: 9px; font-style: normal; font-weight: 800; }
.stop-card p { margin: 6px 0 0; color: var(--muted); font-size: 11px; line-height: 1.6; }
</style>
