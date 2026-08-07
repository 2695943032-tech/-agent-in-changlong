<script setup lang="ts">
import type { JourneyTicketAudio } from '../../../shared/types/journey'
import { readJourneyBlob, saveJourneyBlob } from '../../services/journeyMediaStorage'

const props = defineProps<{ journeyId: string, ticketId: string, existingAudio?: JourneyTicketAudio }>()
const emit = defineEmits<{ saved: [audio: JourneyTicketAudio | undefined] }>()
const recorder = useAudioRecorder(20)
const saving = shallowRef(false)
const skipNextRecordedSave = shallowRef(false)

onMounted(async () => {
  if (!props.existingAudio) return
  try {
    const blob = await readJourneyBlob(props.existingAudio.storageKey)
    if (blob) {
      skipNextRecordedSave.value = true
      recorder.setAudioBlob(blob, props.existingAudio.durationSeconds)
    }
  }
  catch {
    // A missing recording never blocks ticket editing.
  }
})

watch(() => recorder.status.value, async (status) => {
  if (status !== 'recorded' || !recorder.blob.value) return
  if (skipNextRecordedSave.value) {
    skipNextRecordedSave.value = false
    return
  }
  saving.value = true
  try {
    const id = props.existingAudio?.id ?? `audio-${Date.now()}`
    const storageKey = `${props.journeyId}/${id}`
    await saveJourneyBlob(storageKey, recorder.blob.value)
    emit('saved', {
      id,
      journeyId: props.journeyId,
      ticketId: props.ticketId,
      createdAt: new Date().toISOString(),
      durationSeconds: recorder.durationSeconds.value,
      mimeType: recorder.blob.value.type,
      storageKey,
    })
  }
  finally {
    saving.value = false
  }
})

function removeAudio() {
  recorder.reset()
  emit('saved', undefined)
}
</script>

<template>
  <section class="audio-recorder editor-section">
    <header>
      <div>
        <span>03 · TRAVEL SOUND</span>
        <h3>旅行声音</h3>
      </div>
      <small>最长 20 秒</small>
    </header>
    <div v-if="recorder.status.value === 'unsupported'" class="unsupported">当前浏览器暂不支持录制旅行声音，你仍然可以正常制作和保存票根。</div>
    <div v-else class="recorder-body" :class="recorder.status.value">
      <div class="audio-status">
        <span>{{ recorder.status.value === 'recording' ? '正在收录旅行声音' : recorder.status.value === 'recorded' ? '旅行声音已保存' : recorder.status.value === 'requesting' ? '正在请求麦克风权限' : '留下一句今天的感受' }}</span>
        <strong>{{ recorder.durationSeconds.value }}s</strong>
        <small v-if="recorder.status.value === 'recording'">还可录制 {{ recorder.remainingSeconds.value }} 秒</small>
      </div>
      <div class="waveform" :class="{ active: recorder.status.value === 'recording' }">
        <i v-for="index in 22" :key="index" :style="{ '--wave-height': `${8 + (index * 17 % 25)}px`, '--wave-delay': `${index * -45}ms` }" />
      </div>
      <button v-if="recorder.status.value === 'idle' || recorder.status.value === 'error'" class="record" type="button" @click="recorder.start">● 开始录制</button>
      <button v-else-if="recorder.status.value === 'recording'" class="stop" type="button" @click="recorder.stop">■ 停止</button>
      <div v-else-if="recorder.status.value === 'recorded'" class="audio-actions">
        <audio :src="recorder.audioUrl.value ?? undefined" controls />
        <button type="button" @click="recorder.start">重新录制</button>
        <button type="button" @click="removeAudio">删除</button>
      </div>
      <p v-if="recorder.error.value">{{ recorder.error.value }}</p>
      <small v-if="saving">正在把声音收进本地回忆…</small>
    </div>
  </section>
</template>

<style scoped>
.editor-section { width: 100%; min-width: 0; max-width: 100%; padding: 17px; overflow: hidden; border: 1px solid rgba(51,54,47,.12); border-radius: 22px 8px 22px 8px; background: rgba(255,255,255,.74); }
header { display: flex; align-items: start; justify-content: space-between; }
header div { display: grid; gap: 2px; }
header span { color: var(--memory-accent); font-size: 8px; font-weight: 900; letter-spacing: .1em; }
h3 { margin: 0; font-family: var(--font-display); font-size: 19px; }
header small { color: #8b8a82; font-size: 8px; }
.recorder-body { display: grid; margin-top: 13px; padding: 14px; gap: 12px; border-radius: 16px 5px 16px 5px; background: #233c33; color: #fff; }
.audio-status { display: grid; grid-template-columns: 1fr auto; align-items: end; }
.audio-status span { color: #e3c172; font-size: 9px; font-weight: 900; }
.audio-status strong { grid-row: 1/3; grid-column: 2; font: 900 25px ui-monospace,monospace; }
.audio-status small { color: rgba(255,255,255,.56); font-size: 8px; }
.waveform { display: flex; height: 38px; align-items: center; justify-content: space-between; gap: 2px; }
.waveform i { width: 3px; height: var(--wave-height); border-radius: 99px; background: #e3c172; opacity: .45; }
.waveform.active i { animation: wave .7s ease-in-out var(--wave-delay) infinite alternate; opacity: 1; }
.record,.stop { min-height: 42px; border: 0; border-radius: 12px 4px 12px 4px; color: #fff; font-size: 10px; font-weight: 900; }
.record { background: #bd5941; }
.stop { background: #e1816d; }
.audio-actions { display: grid; grid-template-columns: minmax(0,1fr) auto auto; min-width: 0; align-items: center; gap: 6px; }
.audio-actions audio { width: 100%; min-width: 0; height: 34px; }
.audio-actions button { height: 34px; padding: 0 8px; border: 1px solid rgba(255,255,255,.18); border-radius: 8px 3px 8px 3px; background: transparent; color: #fff; font-size: 8px; }
.recorder-body p { margin: 0; color: #ffc2b5; font-size: 8px; }
.unsupported { margin-top: 12px; padding: 12px; border-radius: 12px; background: #eee9df; color: #656861; font-size: 9px; line-height: 1.6; }
@keyframes wave { to { height: 5px; opacity: .38; } }
</style>
