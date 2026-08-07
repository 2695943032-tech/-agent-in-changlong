<script setup lang="ts">
import type { PartyType, VisitorProfile } from '../../../shared/types/pretrip'

const model = defineModel<VisitorProfile>({ required: true })
const emit = defineEmits<{
  interact: []
}>()

const partyOptions: Array<{ id: PartyType, name: string, copy: string }> = [
  { id: 'family', name: '亲子家庭', copy: '成人与儿童同行' },
  { id: 'couple', name: '情侣出游', copy: '默认2名成人' },
  { id: 'friends', name: '朋友结伴', copy: '多人共同出发' },
  { id: 'solo', name: '独自出游', copy: '一个人的自由路线' },
]

function selectParty(type: PartyType) {
  const counts: Record<Exclude<PartyType, 'unknown'>, { adults: number, children: number }> = {
    family: { adults: 2, children: 1 },
    couple: { adults: 2, children: 0 },
    friends: { adults: 2, children: 0 },
    solo: { adults: 1, children: 0 },
  }
  const next = counts[type as Exclude<PartyType, 'unknown'>]
  model.value = {
    ...model.value,
    partyType: type,
    adultCount: next?.adults ?? null,
    childCount: next?.children ?? null,
  }
  emit('interact')
}

function changeCount(field: 'adultCount' | 'childCount', delta: number) {
  const minimum = field === 'adultCount' ? 1 : 0
  const maximum = field === 'adultCount' ? 12 : 8
  const current = model.value[field] ?? minimum
  model.value = { ...model.value, [field]: Math.min(maximum, Math.max(minimum, current + delta)) }
  emit('interact')
}
</script>

<template>
  <div class="party-picker">
    <div class="party-grid">
      <button
        v-for="option in partyOptions"
        :key="option.id"
        class="party-option"
        :class="{ selected: model.partyType === option.id }"
        type="button"
        :aria-pressed="model.partyType === option.id"
        @click="selectParty(option.id)"
      >
        <strong>{{ option.name }}</strong>
        <small>{{ option.copy }}</small>
      </button>
    </div>

    <div v-if="model.partyType !== 'unknown'" class="count-panel">
      <div class="count-row">
        <span><strong>成人</strong><small>1—12位</small></span>
        <div class="stepper">
          <button type="button" aria-label="减少成人" @click="changeCount('adultCount', -1)">−</button>
          <strong>{{ model.adultCount }}</strong>
          <button type="button" aria-label="增加成人" @click="changeCount('adultCount', 1)">＋</button>
        </div>
      </div>
      <div v-if="model.partyType === 'family'" class="count-row">
        <span><strong>儿童</strong><small>0—8位</small></span>
        <div class="stepper">
          <button type="button" aria-label="减少儿童" @click="changeCount('childCount', -1)">−</button>
          <strong>{{ model.childCount }}</strong>
          <button type="button" aria-label="增加儿童" @click="changeCount('childCount', 1)">＋</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.party-picker {
  display: grid;
  gap: 12px;
}

.party-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 9px;
}

.party-option {
  display: grid;
  min-height: 72px;
  padding: 12px;
  gap: 3px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--surface-strong);
  color: var(--ink);
  text-align: left;
}

.party-option.selected {
  border-color: var(--accent);
  background: var(--accent-soft);
  box-shadow: inset 0 0 0 1px var(--accent);
}

.party-option strong {
  font-size: 14px;
}

.party-option small {
  color: var(--muted);
  font-size: 11px;
}

.count-panel {
  padding: 5px 13px;
  border: 1px solid var(--line);
  border-radius: 13px;
  background: var(--surface);
}

.count-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 59px;
}

.count-row + .count-row {
  border-top: 1px solid var(--line);
}

.count-row > span {
  display: grid;
  gap: 2px;
}

.count-row > span strong {
  color: var(--ink);
  font-size: 13px;
}

.count-row > span small {
  color: var(--muted);
  font-size: 10px;
}

.stepper {
  display: grid;
  grid-template-columns: 36px 38px 36px;
  align-items: center;
  text-align: center;
}

.stepper button {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: #fff;
  color: var(--forest);
}

.stepper strong {
  color: var(--ink);
  font-size: 13px;
}
</style>
