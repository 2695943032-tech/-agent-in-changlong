<script setup lang="ts">
import type { DiningChoice, Restaurant, RestaurantId } from '../../../shared/types/pretrip'

defineProps<{
  restaurants: Restaurant[]
  recommendedId: RestaurantId | null
}>()

const model = defineModel<DiningChoice>({ required: true })
const emit = defineEmits<{
  interact: []
}>()
const wantsDining = computed(() => model.value !== 'none' && model.value !== null)

function enableDining() {
  if (!wantsDining.value) model.value = 'panda'
  emit('interact')
}

function selectDining(choice: DiningChoice) {
  model.value = choice
  emit('interact')
}
</script>

<template>
  <div class="dining-picker">
    <div class="dining-intent">
      <button type="button" :class="{ selected: wantsDining }" @click="enableDining">需要园内用餐</button>
      <button type="button" :class="{ selected: model === 'none' }" @click="selectDining('none')">这次不安排</button>
    </div>

    <div v-if="wantsDining" class="restaurant-list">
      <button
        v-for="restaurant in restaurants"
        :key="restaurant.id"
        class="restaurant-card"
        :class="{ selected: model === restaurant.id }"
        type="button"
        :aria-pressed="model === restaurant.id"
        @click="selectDining(restaurant.id)"
      >
        <span class="cuisine-mark">{{ restaurant.emoji }}</span>
        <span class="restaurant-copy">
          <span class="restaurant-topline">
            <strong>{{ restaurant.name }}</strong>
            <em v-if="recommendedId === restaurant.id">Agent推荐 · 更顺路</em>
          </span>
          <small>{{ restaurant.cuisine }}</small>
          <span>{{ restaurant.description }}</span>
        </span>
        <span class="radio-dot" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.dining-picker {
  display: grid;
  gap: 12px;
}

.dining-intent {
  display: grid;
  grid-template-columns: 1fr 1fr;
  padding: 4px;
  gap: 4px;
  border-radius: 12px;
  background: rgba(18, 60, 50, 0.07);
}

.dining-intent button {
  min-height: 44px;
  padding: 11px 7px;
  border: 0;
  border-radius: 11px;
  background: transparent;
  color: var(--muted);
  font-size: 12px;
  font-weight: 800;
}

.dining-intent button.selected {
  background: #fff;
  box-shadow: 0 5px 14px rgba(25, 53, 44, 0.08);
  color: var(--forest);
}

.restaurant-list {
  display: grid;
  gap: 8px;
}

.restaurant-card {
  display: grid;
  grid-template-columns: 42px 1fr 20px;
  align-items: center;
  min-height: 84px;
  padding: 11px;
  gap: 10px;
  border: 1px solid var(--line);
  border-radius: 13px;
  background: var(--surface-strong);
  color: inherit;
  text-align: left;
}

.restaurant-card.selected {
  border-color: var(--accent);
  background: var(--accent-soft);
  box-shadow: inset 0 0 0 1px var(--accent);
}

.cuisine-mark {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border-radius: 13px;
  background: var(--forest-soft);
  color: var(--forest);
  font-family: var(--font-display);
  font-size: 17px;
  font-weight: 800;
}

.restaurant-copy {
  display: grid;
  gap: 2px;
}

.restaurant-topline {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 5px;
}

.restaurant-topline strong {
  color: var(--ink);
  font-size: 14px;
}

.restaurant-topline em {
  padding: 3px 5px;
  border-radius: 999px;
  background: var(--forest);
  color: #fff;
  font-size: 9px;
  font-style: normal;
  font-weight: 800;
}

.restaurant-copy > small {
  color: var(--accent-dark);
  font-size: 10px;
  font-weight: 800;
}

.restaurant-copy > span:last-child {
  color: var(--muted);
  font-size: 10px;
  line-height: 1.4;
}

.radio-dot {
  width: 16px;
  height: 16px;
  border: 1px solid rgba(18, 60, 50, 0.25);
  border-radius: 50%;
  background: #fff;
}

.restaurant-card.selected .radio-dot {
  border: 4px solid var(--forest);
}
</style>
