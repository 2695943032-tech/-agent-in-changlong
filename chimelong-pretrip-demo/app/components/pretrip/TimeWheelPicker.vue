<script setup lang="ts">
const props = defineProps<{
  label: string
  defaultValue: '10:00' | '22:00'
}>()

const emit = defineEmits<{
  interact: []
}>()

const model = defineModel<string | null>({ required: true })

const OPEN_MINUTES = 10 * 60
const CLOSE_MINUTES = 22 * 60
const STEP_MINUTES = 15

const timeOptions = Array.from(
  { length: (CLOSE_MINUTES - OPEN_MINUTES) / STEP_MINUTES + 1 },
  (_, index) => {
    const total = OPEN_MINUTES + index * STEP_MINUTES
    const hours = Math.floor(total / 60).toString().padStart(2, '0')
    const minutes = (total % 60).toString().padStart(2, '0')
    return `${hours}:${minutes}`
  },
)

let lastWheelAt = 0

watch(() => model.value, (value) => {
  if (!value || !timeOptions.includes(value)) model.value = props.defaultValue
}, { immediate: true })

function updateValue(value: string) {
  if (!timeOptions.includes(value)) return
  model.value = value
  emit('interact')
}

function onChange(event: Event) {
  updateValue((event.target as HTMLSelectElement).value)
}

function onWheel(event: WheelEvent) {
  const now = Date.now()
  if (now - lastWheelAt < 80) return
  lastWheelAt = now

  const currentIndex = Math.max(0, timeOptions.indexOf(model.value ?? props.defaultValue))
  const direction = event.deltaY > 0 ? 1 : -1
  const nextIndex = Math.min(timeOptions.length - 1, Math.max(0, currentIndex + direction))
  if (nextIndex !== currentIndex) updateValue(timeOptions[nextIndex]!)
}
</script>

<template>
  <label class="time-wheel">
    <span>{{ label }}</span>
    <span class="time-select-wrap">
      <select
        :value="model ?? defaultValue"
        :aria-label="`${label}，可使用滚轮调整，范围10点到22点`"
        @change="onChange"
        @wheel.prevent="onWheel"
      >
        <option v-for="time in timeOptions" :key="time" :value="time">{{ time }}</option>
      </select>
      <i aria-hidden="true">↕</i>
    </span>
    <small>滚轮调节 · 15分钟一档</small>
  </label>
</template>

<style scoped>
.time-wheel {
  display: grid;
  gap: 6px;
  color: var(--muted);
  font-size: 11px;
}

.time-select-wrap {
  position: relative;
  display: block;
}

.time-select-wrap select {
  width: 100%;
  min-height: 50px;
  padding: 10px 34px 10px 11px;
  appearance: none;
  border: 1px solid var(--line);
  border-radius: 13px;
  outline: 0;
  background: #fff;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
  font-size: 14px;
  font-weight: 800;
  transition: border-color 160ms ease, box-shadow 160ms ease;
}

.time-select-wrap select:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--agent-accent) 14%, transparent);
}

.time-select-wrap i {
  position: absolute;
  top: 50%;
  right: 11px;
  display: grid;
  width: 19px;
  height: 25px;
  place-items: center;
  border-radius: 7px;
  background: var(--forest-soft);
  color: var(--forest);
  font-size: 10px;
  font-style: normal;
  pointer-events: none;
  transform: translateY(-50%);
}

.time-wheel > small {
  color: color-mix(in srgb, var(--muted) 86%, transparent);
  font-size: 9px;
}
</style>
