<script setup lang="ts">
import type { DynamicEventId } from '../../../shared/types/park'

defineProps<{
  eventId: DynamicEventId
}>()

const emit = defineEmits<{
  resolve: [accepted: boolean]
}>()
</script>

<template>
  <div class="event-backdrop">
    <section class="event-card">
      <span>{{ eventId === 'queue-surge' ? '实时客流变化' : '体力状态反馈' }}</span>
      <h2>{{ eventId === 'queue-surge' ? '下一站排队突然增加了' : '要把休息放进行程吗？' }}</h2>
      <p v-if="eventId === 'queue-surge'">奇遇伙伴发现下一站等待时间升至42分钟，建议先去附近低拥挤展区，稍后再回来。</p>
      <p v-else>河畔休息点步行约2分钟。加入后不会删除动物站点，只会把后续时间顺延。</p>
      <div>
        <button type="button" @click="emit('resolve', true)">{{ eventId === 'queue-surge' ? '接受改线，少排队' : '加入休息点' }}</button>
        <button type="button" @click="emit('resolve', false)">{{ eventId === 'queue-surge' ? '保持原计划' : '暂时继续走' }}</button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.event-backdrop { position: fixed; z-index: 75; inset: 0; display: grid; align-items: end; padding: 18px; background: rgba(8,30,24,.42); backdrop-filter: blur(6px); }
.event-card { width: min(100%, 430px); margin: 0 auto max(6px, env(safe-area-inset-bottom)); padding: 20px; border: 1px solid #ead1a4; border-radius: 18px; background: #fff9ec; box-shadow: 0 22px 60px rgba(8,30,24,.28); animation: event-up 300ms var(--ease-out); }
.event-card > span { color: #a96719; font-size: 10px; font-weight: 900; letter-spacing: .1em; }
.event-card h2 { margin: 6px 0; color: var(--ink); font-family: var(--font-display); font-size: 22px; }
.event-card p { margin: 0; color: var(--muted); font-size: 12px; line-height: 1.65; }
.event-card div { display: grid; grid-template-columns: 1.35fr 1fr; margin-top: 14px; gap: 8px; }
.event-card button { min-height: 46px; padding: 12px 8px; border-radius: 10px; font-size: 11px; font-weight: 900; }
.event-card button:first-child { border: 0; background: var(--forest); color: #fff; }
.event-card button:last-child { border: 1px solid var(--line); background: #fff; color: var(--forest); }
@keyframes event-up { from { opacity: 0; transform: translateY(45px); } }
@media (prefers-reduced-motion: reduce) { .event-card { animation: none; } }
</style>
