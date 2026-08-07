<script setup lang="ts">
import type { JourneyEvent } from '../../../shared/types/journey'

const props = defineProps<{ events: JourneyEvent[] }>()
const expanded = shallowRef(false)
const previewLimit = 5

const orderedEntries = computed(() => props.events
  .toSorted((a, b) => a.occurredAt.localeCompare(b.occurredAt))
  .map((event, index) => ({ event, number: index + 1 })))

const hasMore = computed(() => orderedEntries.value.length > previewLimit)
const hiddenCount = computed(() => Math.max(0, orderedEntries.value.length - previewLimit))
const visibleEntries = computed(() => {
  if (expanded.value || !hasMore.value) return orderedEntries.value
  return [...orderedEntries.value.slice(0, 3), ...orderedEntries.value.slice(-2)]
})

function toggle() {
  expanded.value = !expanded.value
}
</script>

<template>
  <div id="journey-event-list" class="timeline">
    <template v-for="(entry, index) in visibleEntries" :key="entry.event.id">
      <div v-if="!expanded && hasMore && index === 3" class="timeline-omitted">
        <span>{{ hiddenCount }} 个过程已收起</span>
      </div>
      <article>
        <time>{{ new Date(entry.event.occurredAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) }}</time>
        <i>{{ String(entry.number).padStart(2, '0') }}</i>
        <div>
          <strong>{{ entry.event.title }}</strong>
          <p v-if="entry.event.detail">{{ entry.event.detail }}</p>
        </div>
      </article>
    </template>
  </div>
  <button
    v-if="hasMore"
    class="timeline-toggle"
    type="button"
    :aria-expanded="expanded"
    aria-controls="journey-event-list"
    @click="toggle"
  >
    <span>{{ expanded ? '收回关键节点' : `展开全部 ${orderedEntries.length} 条` }}</span>
    <i :class="{ expanded }">⌄</i>
  </button>
</template>

<style scoped>
.timeline { display: grid; margin-top: 23px; }
.timeline article { display: grid; grid-template-columns: 45px 29px 1fr; min-height: 72px; gap: 8px; }
.timeline time { padding-top: 2px; color: #7c817c; font: 700 8px ui-monospace,monospace; }
.timeline article > i { position: relative; display: grid; width: 25px; height: 25px; place-items: center; border: 1px solid #a85c43; border-radius: 50%; color: #a85c43; font: 900 7px ui-monospace,monospace; font-style: normal; }
.timeline article > i::after { position: absolute; top: 25px; bottom: -47px; border-left: 1px dashed rgba(168,92,67,.35); content: ''; }
.timeline article:last-child > i::after { display: none; }
.timeline article div { padding-bottom: 15px; }
.timeline strong { font-size: 11px; }
.timeline p { margin: 4px 0 0; color: #717871; font-size: 8px; line-height: 1.55; }
.timeline-omitted { display: grid; grid-template-columns: 45px 29px 1fr; min-height: 42px; gap: 8px; }
.timeline-omitted::before { content: ''; }
.timeline-omitted span { grid-column: 3; align-self: start; justify-self: start; padding: 5px 9px; border: 1px dashed rgba(168,92,67,.25); border-radius: 99px; color: #8a8179; font-size: 8px; }
.timeline-toggle { display: flex; width: 100%; min-height: 42px; align-items: center; justify-content: center; gap: 7px; border: 1px solid rgba(168,92,67,.2); border-radius: 13px 4px; background: rgba(255,250,240,.72); color: #8f503e; font-size: 9px; font-weight: 900; }
.timeline-toggle i { font-size: 15px; font-style: normal; transition: transform .22s ease; }
.timeline-toggle i.expanded { transform: rotate(180deg); }
</style>
