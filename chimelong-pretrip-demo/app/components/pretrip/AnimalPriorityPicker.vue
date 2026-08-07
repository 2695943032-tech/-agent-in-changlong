<script setup lang="ts">
import type { AnimalId, AnimalPoi } from '../../../shared/types/pretrip'

defineProps<{
  animals: AnimalPoi[]
}>()

const model = defineModel<AnimalId[]>({ required: true })

function rankOf(id: AnimalId): number {
  const index = model.value.indexOf(id)
  return index < 0 ? 0 : index + 1
}

function toggle(id: AnimalId) {
  const current = model.value.indexOf(id)
  model.value = current >= 0
    ? model.value.filter(item => item !== id)
    : [...model.value, id]
}
</script>

<template>
  <div class="priority-picker">
    <div class="priority-hint">
      <strong>点击顺序就是优先级</strong>
      <span>排序决定时间不足时先保留谁，不等于实际游览先后。</span>
    </div>

    <div class="animal-grid">
      <button
        v-for="animal in animals"
        :key="animal.id"
        class="animal-option"
        :class="{ selected: rankOf(animal.id) > 0 }"
        type="button"
        :aria-pressed="rankOf(animal.id) > 0"
        @click="toggle(animal.id)"
      >
        <span v-if="rankOf(animal.id)" class="rank-badge">{{ rankOf(animal.id) }}</span>
        <strong>{{ animal.name }}</strong>
        <small>{{ animal.description }}</small>
      </button>
    </div>
  </div>
</template>

<style scoped>
.priority-picker {
  display: grid;
  gap: 12px;
}

.priority-hint {
  display: grid;
  padding: 11px 12px;
  gap: 3px;
  border-radius: 11px;
  background: var(--forest-soft);
}

.priority-hint strong {
  color: var(--forest);
  font-size: 12px;
}

.priority-hint span {
  color: #587067;
  font-size: 10px;
  line-height: 1.45;
}

.animal-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.animal-option {
  position: relative;
  display: grid;
  min-height: 84px;
  padding: 13px;
  gap: 4px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--surface-strong);
  color: var(--ink);
  text-align: left;
}

.animal-option.selected {
  border-color: var(--accent);
  background: var(--accent-soft);
  box-shadow: inset 0 0 0 1px var(--accent);
}

.animal-option strong {
  font-family: var(--font-display);
  font-size: 16px;
}

.animal-option small {
  overflow: hidden;
  color: var(--muted);
  font-size: 10px;
  line-height: 1.45;
}

.rank-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  display: grid;
  width: 22px;
  height: 22px;
  place-items: center;
  border-radius: 7px;
  background: var(--forest);
  color: #fff;
  font-size: 10px;
  font-weight: 900;
}
</style>
