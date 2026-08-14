<script setup lang="ts">
import type { ParkGate, VisitorProfile } from '../../../shared/types/pretrip'

const model = defineModel<VisitorProfile>({ required: true })
const emit = defineEmits<{ interact: [] }>()

const gates: Array<{ id: ParkGate, title: string, detail: string }> = [
  { id: 'north', title: '北门', detail: '靠近北区与小火车换乘点' },
  { id: 'south', title: '南门', detail: '主入口与综合服务区' },
]

function select(field: 'entryGate' | 'exitGate', gate: ParkGate) {
  model.value = { ...model.value, [field]: gate, takeNorthGateTrain: field === 'entryGate' && gate === 'south' ? false : model.value.takeNorthGateTrain }
  emit('interact')
}

function chooseTrain(value: boolean) {
  model.value = { ...model.value, takeNorthGateTrain: value }
  emit('interact')
}
</script>

<template>
  <section class="gate-picker">
    <div class="gate-group">
      <span>从哪一门入园？</span>
      <div class="gate-options">
        <button v-for="gate in gates" :key="gate.id" type="button" :class="{ selected: model.entryGate === gate.id }" @click="select('entryGate', gate.id)"><strong>{{ gate.title }}</strong><small>{{ gate.detail }}</small></button>
      </div>
    </div>
    <div class="gate-group">
      <span>从哪一门离园？</span>
      <div class="gate-options">
        <button v-for="gate in gates" :key="gate.id" type="button" :class="{ selected: model.exitGate === gate.id }" @click="select('exitGate', gate.id)"><strong>{{ gate.title }}</strong><small>{{ gate.detail }}</small></button>
      </div>
    </div>
    <div v-if="model.entryGate === 'north'" class="train-choice">
      <strong>北门入园后，先坐小火车吗？</strong>
      <small>乘车会先覆盖袋鼠区、熊猫村与虎园；下车后再安排未游览的 Agent 展区。</small>
      <div><button type="button" :class="{ selected: model.takeNorthGateTrain === true }" @click="chooseTrain(true)">坐小火车</button><button type="button" :class="{ selected: model.takeNorthGateTrain === false }" @click="chooseTrain(false)">不坐，步行游园</button></div>
    </div>
  </section>
</template>

<style scoped>
.gate-picker,.gate-group { display:grid; gap:9px; }.gate-picker { gap:16px; }.gate-group > span,.train-choice > strong { color:var(--ink); font-size:13px; font-weight:800; }.gate-options { display:grid; grid-template-columns:1fr 1fr; gap:9px; }.gate-options button,.train-choice button { display:grid; min-height:72px; padding:11px; gap:4px; border:1px solid var(--line); border-radius:12px; background:#fff; color:var(--ink); text-align:left; }.gate-options button.selected,.train-choice button.selected { border-color:var(--accent); background:var(--accent-soft); box-shadow:inset 0 0 0 1px var(--accent); }.gate-options strong { font-size:15px; }.gate-options small,.train-choice small { color:var(--muted); font-size:10px; line-height:1.45; }.train-choice { display:grid; padding:13px; gap:7px; border-radius:13px; background:#eef6ee; }.train-choice > div { display:grid; grid-template-columns:1fr 1fr; gap:8px; }.train-choice button { min-height:42px; align-items:center; text-align:center; font-size:11px; font-weight:800; }
</style>
