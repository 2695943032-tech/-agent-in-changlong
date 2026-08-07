<script setup lang="ts">
import type {
  AnimalId,
  AnimalPoi,
  ChatStep,
  CompanionId,
  Pace,
  PaceOption,
  Restaurant,
  RestaurantId,
  VisitorProfile,
} from '../../../shared/types/pretrip'
import AnimalPriorityPicker from './AnimalPriorityPicker.vue'
import DiningPicker from './DiningPicker.vue'
import PartyPicker from './PartyPicker.vue'
import TimeWheelPicker from './TimeWheelPicker.vue'
import { cloneVisitorProfile } from '../../utils/profile'

const props = defineProps<{
  step: ChatStep
  profile: VisitorProfile
  companionId: CompanionId
  paceOptions: PaceOption[]
  animals: AnimalPoi[]
  restaurants: Restaurant[]
  recommendedRestaurantId: RestaurantId | null
  disabled: boolean
}>()

const emit = defineEmits<{
  answer: [profile: VisitorProfile, summary: string]
  generate: []
  interact: []
}>()

// The answer form edits nested profile fields (times and dining choice), so the
// draft must be deeply reactive. A shallow ref would update the raw object but
// would not re-render dependent controls such as the restaurant list.
const draft = ref<VisitorProfile>(cloneVisitorProfile(props.profile))
const validationMessage = shallowRef('')

watch(() => props.profile, (profile) => {
  draft.value = cloneVisitorProfile(profile)
  validationMessage.value = ''
})

const recommendedPace = computed<Pace>(() => {
  const total = (draft.value.adultCount ?? 0) + (draft.value.childCount ?? 0)
  if ((draft.value.childCount ?? 0) > 0 || total >= 5) return 'slow'
  if (props.companionId === 'tiger' && total > 0 && total <= 3) return 'fast'
  return 'balanced'
})

function timeMinutes(value: string | null): number {
  if (!value) return 0
  const [hours = 0, minutes = 0] = value.split(':').map(Number)
  return hours * 60 + minutes
}

function canContinue(): boolean {
  if (props.step === 'party') return draft.value.partyType !== 'unknown'
  if (props.step === 'pace') return draft.value.pace !== null
  if (props.step === 'time') {
    const start = timeMinutes(draft.value.startTime)
    const end = timeMinutes(draft.value.endTime)
    return Boolean(draft.value.startTime && draft.value.endTime
      && start >= 10 * 60
      && end <= 22 * 60
      && end - start >= 240)
  }
  if (props.step === 'animals') return draft.value.animalPriority.length > 0
  if (props.step === 'dining') return draft.value.diningChoice !== null
  return true
}

function answerSummary(): string {
  if (props.step === 'party') {
    const labels = { family: '亲子家庭', couple: '情侣出游', friends: '朋友结伴', solo: '独自出游', unknown: '未填写' }
    return `${labels[draft.value.partyType]}，${draft.value.adultCount ?? 0}位成人${draft.value.childCount ? `、${draft.value.childCount}位儿童` : ''}`
  }
  if (props.step === 'pace') return props.paceOptions.find(item => item.id === draft.value.pace)?.name ?? '暂未选择节奏'
  if (props.step === 'time') return `${draft.value.startTime}—${draft.value.endTime}`
  if (props.step === 'animals') {
    return draft.value.animalPriority
      .map((id, index) => `${index + 1}.${props.animals.find(item => item.id === id)?.name ?? id}`)
      .join('，')
  }
  if (props.step === 'dining') {
    if (draft.value.diningChoice === 'none') return '这次不安排园内用餐'
    return `选择${props.restaurants.find(item => item.id === draft.value.diningChoice)?.name ?? '餐厅'}`
  }
  return draft.value.freeText.trim()
}

function submit() {
  validationMessage.value = ''
  if (!canContinue()) {
    validationMessage.value = props.step === 'time'
      ? '请选择10:00—22:00之间的时间，游玩时长至少4小时。'
      : '请先完成当前选择，或点击跳过。'
    return
  }
  emit('interact')
  emit('answer', cloneVisitorProfile(draft.value), answerSummary())
}

function skip() {
  const next = cloneVisitorProfile(draft.value)
  if (props.step === 'party') Object.assign(next, { partyType: 'unknown', adultCount: null, childCount: null })
  if (props.step === 'pace') next.pace = null
  if (props.step === 'time') Object.assign(next, { startTime: null, endTime: null })
  if (props.step === 'animals') next.animalPriority = []
  if (props.step === 'dining') next.diningChoice = null
  if (props.step === 'supplement') next.freeText = ''
  emit('interact')
  emit('answer', next, '暂时跳过')
}

function selectPace(pace: Pace) {
  draft.value = { ...draft.value, pace }
  emit('interact')
}

function updatePriority(value: AnimalId[]) {
  draft.value = { ...draft.value, animalPriority: value }
  emit('interact')
}

function generatePlan() {
  emit('interact')
  emit('generate')
}
</script>

<template>
  <div class="answer-panel">
    <PartyPicker v-if="step === 'party'" v-model="draft" @interact="emit('interact')" />

    <div v-else-if="step === 'pace'" class="pace-list">
      <button
        v-for="pace in paceOptions"
        :key="pace.id"
        class="pace-card"
        :class="{ selected: draft.pace === pace.id }"
        type="button"
        :aria-pressed="draft.pace === pace.id"
        @click="selectPace(pace.id)"
      >
        <span>
          <strong>{{ pace.name }}</strong>
          <em v-if="recommendedPace === pace.id">根据同行人数推荐</em>
        </span>
        <small>{{ pace.description }}</small>
      </button>
    </div>

    <div v-else-if="step === 'time'" class="time-panel">
      <TimeWheelPicker v-model="draft.startTime" label="预计入园" default-value="10:00" @interact="emit('interact')" />
      <span class="time-arrow">→</span>
      <TimeWheelPicker v-model="draft.endTime" label="预计离园" default-value="22:00" @interact="emit('interact')" />
      <small>可选范围固定为10:00—22:00，鼠标滚轮或下拉滑动均可调节；跳过时也使用10:00—22:00作为规划边界。</small>
    </div>

    <AnimalPriorityPicker
      v-else-if="step === 'animals'"
      :model-value="draft.animalPriority"
      :animals="animals"
      @update:model-value="updatePriority"
    />

    <DiningPicker
      v-else-if="step === 'dining'"
      v-model="draft.diningChoice"
      :restaurants="restaurants"
      :recommended-id="recommendedRestaurantId"
      @interact="emit('interact')"
    />

    <label v-else-if="step === 'supplement'" class="supplement-field">
      <span>一句话补充（选填）</span>
      <textarea v-model="draft.freeText" maxlength="200" rows="4" placeholder="例如：孩子下午容易累，希望少走回头路。" />
      <small>{{ draft.freeText.length }}/200</small>
    </label>

    <div v-else class="confirm-card">
      <span class="confirm-kicker">偏好已收集完成</span>
      <strong>让{{ companionId === 'panda' ? '团团' : companionId === 'tiger' ? '凯凯' : '悠米' }}开始规划</strong>
      <p>路线会优先保留你的动物排名，再使用地图距离优化实际到访顺序。</p>
      <button type="button" :disabled="disabled" @click="generatePlan">生成我的路线</button>
    </div>

    <p v-if="validationMessage" class="validation-message">{{ validationMessage }}</p>

    <div v-if="step !== 'confirm'" class="answer-actions">
      <button class="skip-action" type="button" :disabled="disabled" @click="skip">跳过</button>
      <button class="continue-action" type="button" :disabled="disabled" @click="submit">
        {{ disabled ? '伙伴正在思考…' : '发送给伙伴' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.answer-panel {
  display: grid;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: rgba(251, 250, 245, 0.97);
  box-shadow: 0 10px 30px rgba(7, 31, 24, .1);
}

.pace-list {
  display: grid;
  gap: 8px;
}

.pace-card {
  display: grid;
  min-height: 75px;
  padding: 12px;
  gap: 5px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: #fff;
  color: inherit;
  text-align: left;
}

.pace-card.selected {
  border-color: var(--accent);
  background: var(--accent-soft);
  box-shadow: inset 0 0 0 1px var(--accent);
}

.pace-card > span {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.pace-card strong {
  color: var(--ink);
  font-size: 14px;
}

.pace-card em {
  padding: 3px 6px;
  border-radius: 999px;
  background: var(--forest);
  color: #fff;
  font-size: 9px;
  font-style: normal;
  font-weight: 800;
}

.pace-card small {
  color: var(--muted);
  font-size: 11px;
}

.time-panel {
  display: grid;
  grid-template-columns: 1fr 22px 1fr;
  align-items: end;
  gap: 6px;
}

.time-arrow {
  padding-bottom: 12px;
  color: var(--accent-dark);
  text-align: center;
}

.time-panel > small {
  grid-column: 1 / -1;
  color: var(--muted);
  font-size: 10px;
  line-height: 1.5;
}

.supplement-field {
  position: relative;
  display: grid;
  gap: 7px;
}

.supplement-field > span {
  color: var(--ink);
  font-size: 12px;
  font-weight: 800;
}

.supplement-field textarea {
  width: 100%;
  resize: vertical;
  padding: 12px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: #fff;
  color: var(--ink);
  font-size: 13px;
  line-height: 1.6;
}

.supplement-field small {
  position: absolute;
  right: 9px;
  bottom: 7px;
  color: var(--muted);
  font-size: 8px;
}

.confirm-card {
  display: grid;
  padding: 8px 3px 3px;
  gap: 7px;
  text-align: center;
}

.confirm-kicker {
  color: var(--accent-dark);
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.12em;
}

.confirm-card strong {
  color: var(--ink);
  font-family: var(--font-display);
  font-size: 20px;
}

.confirm-card p {
  margin: 0 8px 7px;
  color: var(--muted);
  font-size: 11px;
  line-height: 1.55;
}

.confirm-card button,
.continue-action {
  min-height: 48px;
  padding: 13px;
  border: 0;
  border-radius: 13px;
  background: var(--forest);
  color: #fff;
  font-size: 13px;
  font-weight: 800;
}

.answer-actions {
  display: grid;
  grid-template-columns: 92px 1fr;
  gap: 8px;
}

.skip-action {
  border: 1px solid var(--line);
  border-radius: 13px;
  background: #fff;
  color: var(--muted);
  font-size: 12px;
  font-weight: 800;
}

.answer-actions button:disabled,
.confirm-card button:disabled {
  cursor: wait;
  opacity: 0.55;
}

.validation-message {
  margin: 0;
  color: #a14832;
  font-size: 11px;
}
</style>
