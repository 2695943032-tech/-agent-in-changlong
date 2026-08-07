<script setup lang="ts">
import type { Companion } from '../../../shared/types/pretrip'
import type { ParkZoneContent } from '../../../shared/types/park'

defineProps<{
  companion: Companion
  zone: ParkZoneContent | null
  taskCompleted: boolean
  taskChoices: string[]
  expanded: boolean
  feedback: string
}>()

const emit = defineEmits<{
  toggle: []
  showCollection: []
  answerTask: [choice: string]
}>()
</script>

<template>
  <section class="companion-panel" :style="{ '--agent-accent': companion.accent }">
    <header>
      <button class="avatar-button" type="button" @click="emit('toggle')">
        <img :src="companion.selectionImage" :alt="companion.name">
      </button>
      <div><span>{{ zone?.kicker ?? '全程奇遇伙伴' }}</span><strong>{{ companion.name }}正在陪你</strong></div>
      <button class="collection-button" type="button" @click="emit('showCollection')">切换</button>
    </header>

    <div v-if="expanded" class="panel-content">
      <p class="companion-message">{{ zone?.welcome ?? '点击地图上的动物区域，我们就出发。每一次抵达都会解锁新的伙伴和观察任务。' }}</p>
      <div v-if="zone" class="knowledge-card"><span>现场小知识</span><p>{{ zone.fact }}</p></div>
      <div v-if="zone" class="task-card" :class="{ completed: taskCompleted }">
        <span>{{ taskCompleted ? '任务完成 · 徽章已收藏' : zone.task.title }}</span>
        <strong>{{ taskCompleted ? zone.task.successMessage : zone.task.prompt }}</strong>
        <div v-if="!taskCompleted" class="task-choices">
          <button v-for="choice in taskChoices" :key="choice" type="button" @click="emit('answerTask', choice)">{{ choice }}</button>
        </div>
        <small v-if="feedback">{{ feedback }}</small>
      </div>
    </div>
  </section>
</template>

<style scoped>
.companion-panel { border: 1px solid color-mix(in srgb, var(--agent-accent) 28%, var(--line)); border-radius: 16px; background: var(--surface); box-shadow: none; }
.companion-panel header { display: grid; grid-template-columns: 48px 1fr auto; align-items: center; padding: 10px; gap: 9px; }
.avatar-button { width: 48px; height: 48px; padding: 0; overflow: hidden; border: 2px solid color-mix(in srgb, var(--agent-accent) 42%, #fff); border-radius: 15px; background: #fff; }
.avatar-button img { width: 100%; height: 100%; object-fit: cover; }
.companion-panel header div { display: grid; gap: 2px; }
.companion-panel header span { color: var(--agent-accent); font-size: 9px; font-weight: 900; letter-spacing: .08em; }
.companion-panel header strong { color: var(--ink); font-family: var(--font-display); font-size: 15px; }
.collection-button { min-width: 44px; min-height: 38px; padding: 8px 9px; border: 1px solid var(--line); border-radius: 9px; background: #fff; color: var(--forest); font-size: 10px; font-weight: 900; }
.panel-content { display: grid; padding: 0 11px 11px; gap: 8px; }
.companion-message { margin: 0; padding: 11px 12px; border-radius: 5px 12px 12px 12px; background: var(--forest); color: #fff; font-size: 11px; line-height: 1.65; }
.knowledge-card { padding: 9px 10px; border-radius: 13px; background: color-mix(in srgb, var(--agent-accent) 9%, #fff); }
.knowledge-card span { color: var(--agent-accent); font-size: 9px; font-weight: 900; }
.knowledge-card p { margin: 3px 0 0; color: var(--muted); font-size: 11px; line-height: 1.55; }
.task-card { display: grid; padding: 10px; gap: 6px; border: 1px solid color-mix(in srgb, var(--agent-accent) 24%, var(--line)); border-radius: 14px; }
.task-card > span { color: var(--agent-accent); font-size: 9px; font-weight: 900; }
.task-card > strong { color: var(--ink); font-size: 11px; line-height: 1.5; }
.task-choices { display: flex; flex-wrap: wrap; gap: 5px; }
.task-choices button { min-height: 38px; padding: 7px 9px; border: 1px solid var(--line); border-radius: 8px; background: #fff; color: var(--forest); font-size: 10px; font-weight: 800; }
.task-card > small { color: var(--accent-dark); font-size: 10px; }
.task-card.completed { border-color: #a9ceb6; background: #eef8f1; }
</style>
