<script setup lang="ts">
import type { PartyType, VisitorProfile } from '../../../shared/types/pretrip'

const model = defineModel<VisitorProfile>({ required: true })
const emit = defineEmits<{
  interact: []
}>()

type Child = { age: number | null, heightCm: number | null }

const children = computed<Child[]>(() => model.value.children.slice(0, model.value.childCount ?? 0))
const freeChildren = computed(() => children.value.filter(child => (child.age !== null && child.age < 3) || (child.heightCm !== null && child.heightCm < 100)))
const eligibleChildren = computed(() => children.value.filter((child) => {
  const isFree = (child.age !== null && child.age < 3) || (child.heightCm !== null && child.heightCm < 100)
  return !isFree && ((child.age !== null && child.age < 12) || (child.heightCm !== null && child.heightCm <= 150))
}))
const ticketRecommendation = computed(() => {
  const adults = model.value.adultCount ?? 0
  const standardTicketChildren = children.value.length - freeChildren.value.length - eligibleChildren.value.length
  const standardTickets = adults + standardTicketChildren
  const childTickets = eligibleChildren.value.length
  const base = standardTickets * 350 + childTickets * 245
  const familyEligible = adults >= 2 && eligibleChildren.value.length > 0
  const familyTotal = familyEligible ? 700 + Math.max(0, standardTickets - 2) * 350 + Math.max(0, childTickets - 1) * 245 : Number.POSITIVE_INFINITY
  const parentEligible = adults >= 1 && childTickets > 0
  const parentTotal = parentEligible ? 595 + Math.max(0, standardTickets - 1) * 350 + Math.max(0, childTickets - 1) * 245 : Number.POSITIVE_INFINITY
  const total = Math.min(base, familyTotal, parentTotal)
  const name = total === familyTotal
    ? '买 2 大送 1 小家庭票'
    : total === parentTotal
      ? '1 大 1 小亲子票'
      : childTickets > 0
        ? `${standardTickets} 张标准票 + ${childTickets} 张儿童票`
        : `${standardTickets} 张标准票`
  return { name, total, saved: Math.max(0, base - total), freeCount: Math.min(1, freeChildren.value.length), standardTicketChildren }
})

function syncChildren(count: number | null) {
  const target = count ?? 0
  const next = [...model.value.children]
  while (next.length < target) next.push({ age: null, heightCm: null })
  model.value = { ...model.value, children: next.slice(0, target) }
}

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
    children: Array.from({ length: next?.children ?? 0 }, () => ({ age: null, heightCm: null })),
  }
  emit('interact')
}

function changeCount(field: 'adultCount' | 'childCount', delta: number) {
  if (model.value.partyType === 'solo') return
  const minimum = field === 'adultCount' ? 1 : 0
  const maximum = field === 'adultCount' ? 12 : 8
  const current = model.value[field] ?? minimum
  model.value = { ...model.value, [field]: Math.min(maximum, Math.max(minimum, current + delta)) }
  if (field === 'childCount') syncChildren(Math.min(maximum, Math.max(minimum, current + delta)))
  emit('interact')
}

function updateChild(index: number, field: keyof Child, raw: string) {
  const next = [...model.value.children]
  const value = raw === '' ? null : Number(raw)
  const current = next[index] ?? { age: null, heightCm: null }
  const safeValue = typeof value === 'number' && Number.isFinite(value) ? value : null
  next[index] = field === 'age'
    ? { age: safeValue, heightCm: current.heightCm }
    : { age: current.age, heightCm: safeValue }
  model.value = { ...model.value, children: next }
  emit('interact')
}

function normalizeHeight(index: number) {
  const current = model.value.children[index]
  if (!current || current.heightCm === null || current.heightCm <= 0 || current.heightCm >= 3) return
  const next = [...model.value.children]
  next[index] = { ...current, heightCm: Math.round(current.heightCm * 100) }
  model.value = { ...model.value, children: next }
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

    <div v-if="model.partyType !== 'unknown' && model.partyType !== 'solo'" class="count-panel">
      <div class="count-row">
        <span><strong>成人</strong><small>1—12位</small></span>
        <div class="stepper">
          <button type="button" aria-label="减少成人" @click="changeCount('adultCount', -1)">−</button>
          <strong>{{ model.adultCount }}</strong>
          <button type="button" aria-label="增加成人" @click="changeCount('adultCount', 1)">＋</button>
        </div>
      </div>
      <div v-if="model.childCount" class="child-details">
        <p>儿童信息 <small>填写年龄或身高即可判断票种</small></p>
        <div v-for="(child, index) in children" :key="index" class="child-row">
          <strong>儿童{{ index + 1 }}</strong>
          <label>年龄<input type="text" inputmode="numeric" :value="child.age ?? ''" placeholder="岁" @input="updateChild(index, 'age', ($event.target as HTMLInputElement).value)"></label>
          <span>或</span>
          <label>身高<input type="text" inputmode="decimal" :value="child.heightCm ?? ''" placeholder="cm" @input="updateChild(index, 'heightCm', ($event.target as HTMLInputElement).value)" @blur="normalizeHeight(index)"></label>
        </div>
        <div class="ticket-card">
          <span>智能购票推荐</span>
          <strong>{{ ticketRecommendation.name }}</strong>
          <b>¥{{ ticketRecommendation.total }} 起</b>
          <small v-if="ticketRecommendation.saved">比标准票组合省 ¥{{ ticketRecommendation.saved }} 起</small>
          <small v-else-if="ticketRecommendation.freeCount">含 1 名＜3 岁或＜1 米免费儿童</small>
          <small v-else-if="ticketRecommendation.standardTicketChildren">超出儿童票条件的随行儿童按标准票计算。</small>
          <small v-else>儿童票适用：3—12 岁或身高 1—1.5 米</small>
        </div>
      </div>
      <div v-else class="ticket-card">
        <span>智能购票推荐</span>
        <strong>{{ ticketRecommendation.name }}</strong>
        <b>¥{{ ticketRecommendation.total }} 起</b>
        <small>标准票 ¥350 起；可免费带 1 名＜3 岁或＜1 米儿童。</small>
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

.child-details { display: grid; gap: 9px; padding: 4px 0 10px; }
.child-details > p { margin: 0; color: var(--ink); font-size: 12px; font-weight: 800; }
.child-details > p small { margin-left: 5px; color: var(--muted); font-weight: 400; }
.child-row { display: grid; grid-template-columns: 48px 1fr 18px 1fr; align-items: center; gap: 5px; color: var(--muted); font-size: 10px; }
.child-row label { display: flex; align-items: center; gap: 3px; }
.child-row input { width: 100%; min-width: 0; padding: 7px 4px; border: 1px solid var(--line); border-radius: 8px; color: var(--ink); }
.ticket-card { display: grid; gap: 3px; padding: 11px; border-radius: 11px; background: #edf5ed; border: 1px solid #b9d6bd; }
.ticket-card span { color: var(--accent-dark); font-size: 10px; font-weight: 800; }
.ticket-card strong { color: var(--forest); font-size: 13px; }
.ticket-card b { color: #bb5f2d; font-size: 16px; }
.ticket-card small { color: var(--muted); font-size: 10px; }
</style>
