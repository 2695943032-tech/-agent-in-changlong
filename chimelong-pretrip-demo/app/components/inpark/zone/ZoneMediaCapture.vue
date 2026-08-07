<script setup lang="ts">
import type { AnimalId } from '../../../../shared/types/pretrip'
import type { JourneyMedia } from '../../../../shared/types/journey'
import { compressJourneyPhoto, saveJourneyBlob } from '../../../services/journeyMediaStorage'

type MediaSource = 'camera' | 'upload'

const props = defineProps<{
  journeyId: string | null
  zoneId: AnimalId
  photoCount: number
}>()

const emit = defineEmits<{ saved: [media: JourneyMedia] }>()
const pendingFile = shallowRef<File | null>(null)
const pendingSource = shallowRef<MediaSource | null>(null)
const previewUrl = shallowRef('')
const saving = shallowRef(false)
const feedback = shallowRef('')

const pendingKind = computed<'photo' | 'video' | null>(() => {
  if (!pendingFile.value) return null
  return pendingFile.value.type.startsWith('image/') ? 'photo' : 'video'
})

const sourceLabel = computed(() => pendingSource.value === 'camera' ? '现场拍摄' : '本机上传')
const fileSizeLabel = computed(() => {
  const size = pendingFile.value?.size ?? 0
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
})

function clearPendingFile(options: { keepFeedback?: boolean } = {}) {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  pendingFile.value = null
  pendingSource.value = null
  previewUrl.value = ''
  if (!options.keepFeedback) feedback.value = ''
}

function validateFile(file: File): string | null {
  if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
    return '请选择照片或短视频文件。'
  }
  if (file.type.startsWith('image/') && props.photoCount >= 9) {
    return '本次旅程最多收藏 9 张照片。'
  }
  if (file.type.startsWith('video/') && file.size > 20 * 1024 * 1024) {
    return '这段视频超过 20MB，请选择更短的片段。'
  }
  return null
}

function stageFile(event: Event, source: MediaSource) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  input.value = ''

  if (!props.journeyId) {
    feedback.value = '正在建立本次旅程记录，请稍等一秒后再试。'
    return
  }

  const validationError = validateFile(file)
  if (validationError) {
    clearPendingFile()
    feedback.value = validationError
    return
  }

  clearPendingFile()
  pendingFile.value = file
  pendingSource.value = source
  previewUrl.value = URL.createObjectURL(file)
  feedback.value = '请先核对当前文件，确认后才会加入回忆星册。'
}

async function confirmSave() {
  const file = pendingFile.value
  const journeyId = props.journeyId
  const kind = pendingKind.value
  if (!file || !journeyId || !kind || saving.value) return

  saving.value = true
  feedback.value = '正在收藏当前文件…'
  try {
    const blob = kind === 'photo' ? await compressJourneyPhoto(file) : file
    const id = `media-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const storageKey = `${journeyId}/${id}`
    await saveJourneyBlob(storageKey, blob)
    emit('saved', {
      id,
      journeyId,
      kind,
      storageKey,
      mimeType: blob.type || file.type,
      createdAt: new Date().toISOString(),
      zoneId: props.zoneId,
      isHighlight: props.photoCount === 0 && kind === 'photo',
    })
    feedback.value = kind === 'photo' ? '已确认，这张照片已放进回忆星册。' : '已确认，这段现场影像已经收藏。'
    clearPendingFile({ keepFeedback: true })
  }
  catch (cause) {
    feedback.value = cause instanceof Error ? cause.message : '媒体保存失败，其他功能仍可继续使用。'
  }
  finally {
    saving.value = false
  }
}

onBeforeUnmount(() => {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
})
</script>

<template>
  <section class="capture-card">
    <header class="capture-copy">
      <span>COLLECT A MOMENT</span>
      <strong>把这一刻带走</strong>
      <p>可以现场拍摄，也可以从本机上传；选中文件后会先让你核对。</p>
    </header>

    <div class="source-actions" aria-label="选择媒体来源">
      <label class="source-button" :class="{ disabled: saving || !journeyId }">
        <input
          type="file"
          accept="image/*"
          capture="environment"
          :disabled="saving || !journeyId"
          @change="stageFile($event, 'camera')"
        >
        <i aria-hidden="true">◎</i>
        <span>现场拍摄</span>
        <small>{{ journeyId ? '调用设备相机' : '正在建立旅程' }}</small>
      </label>
      <label class="source-button" :class="{ disabled: saving || !journeyId }">
        <input
          type="file"
          accept="image/*,video/*"
          :disabled="saving || !journeyId"
          @change="stageFile($event, 'upload')"
        >
        <i aria-hidden="true">↑</i>
        <span>上传文件</span>
        <small>{{ journeyId ? '照片或短视频' : '正在建立旅程' }}</small>
      </label>
    </div>

    <section v-if="pendingFile && pendingKind" class="file-confirmation" aria-label="确认当前文件">
      <img v-if="pendingKind === 'photo'" :src="previewUrl" alt="当前待确认照片预览">
      <video v-else :src="previewUrl" controls muted playsinline aria-label="当前待确认视频预览" />
      <div class="file-details">
        <span>CURRENT FILE · 当前文件</span>
        <strong>{{ pendingFile.name }}</strong>
        <p>位置：{{ sourceLabel }} · {{ fileSizeLabel }}</p>
      </div>
      <div class="confirm-actions">
        <button class="secondary" type="button" :disabled="saving" @click="clearPendingFile()">重新选择</button>
        <button class="primary" type="button" :disabled="saving" @click="confirmSave">
          {{ saving ? '正在收藏…' : '确认并收藏' }}
        </button>
      </div>
    </section>

    <p v-if="feedback" class="feedback" aria-live="polite">{{ feedback }}</p>
  </section>
</template>

<style scoped>
.capture-card {
  display: grid;
  padding: 17px;
  gap: 14px;
  border: 1px solid color-mix(in srgb, var(--zone-accent) 24%, transparent);
  border-radius: 8px 22px 8px 22px;
  background: rgba(255, 255, 255, 0.82);
}

.capture-copy { display: grid; gap: 3px; }
.capture-copy > span { color: var(--zone-accent); font-size: 8px; font-weight: 900; letter-spacing: 0.1em; }
.capture-copy > strong { color: var(--zone-ink); font-family: var(--font-display); font-size: 18px; }
.capture-copy > p { margin: 0; color: color-mix(in srgb, var(--zone-ink) 62%, transparent); font-size: 9px; line-height: 1.55; }

.source-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.source-button {
  position: relative;
  display: grid;
  grid-template-columns: 34px 1fr;
  min-height: 64px;
  padding: 10px;
  align-items: center;
  gap: 1px 9px;
  border: 1px solid color-mix(in srgb, var(--zone-accent) 24%, transparent);
  border-radius: 16px 6px 16px 6px;
  background: #fff;
  color: var(--zone-ink);
  text-align: left;
  cursor: pointer;
}
.source-button input { position: absolute; width: 1px; height: 1px; overflow: hidden; opacity: 0; pointer-events: none; }
.source-button:active { transform: scale(0.98); }
.source-button.disabled { cursor: wait; opacity: 0.58; }
.source-actions i { grid-row: 1 / span 2; display: grid; width: 34px; height: 34px; place-items: center; border-radius: 50%; background: var(--zone-ink); color: #fff; font-size: 16px; font-style: normal; }
.source-actions span { align-self: end; font-size: 10px; font-weight: 900; }
.source-actions small { align-self: start; color: color-mix(in srgb, var(--zone-ink) 56%, transparent); font-size: 8px; }

.file-confirmation {
  display: grid;
  grid-template-columns: 76px 1fr;
  padding: 10px;
  gap: 10px;
  border: 1px solid color-mix(in srgb, var(--zone-accent) 34%, transparent);
  border-radius: 17px 7px 17px 7px;
  background: color-mix(in srgb, var(--zone-accent) 7%, #fff);
}
.file-confirmation > img,
.file-confirmation > video { width: 76px; height: 76px; border-radius: 12px 4px 12px 4px; background: var(--zone-ink); object-fit: cover; }
.file-details { display: grid; align-content: center; min-width: 0; gap: 3px; }
.file-details span { color: var(--zone-accent); font-size: 7px; font-weight: 900; letter-spacing: 0.09em; }
.file-details strong { overflow: hidden; color: var(--zone-ink); font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
.file-details p { margin: 0; color: color-mix(in srgb, var(--zone-ink) 58%, transparent); font-size: 8px; }
.confirm-actions { grid-column: 1 / -1; display: grid; grid-template-columns: 0.8fr 1.2fr; gap: 7px; }
.confirm-actions button { min-height: 40px; border-radius: 11px 4px 11px 4px; font-size: 9px; font-weight: 900; }
.confirm-actions .secondary { border: 1px solid color-mix(in srgb, var(--zone-ink) 16%, transparent); background: transparent; color: var(--zone-ink); }
.confirm-actions .primary { border: 0; background: var(--zone-ink); color: #fff; }
.confirm-actions button:disabled { opacity: 0.55; }

.feedback { margin: 0; color: var(--zone-accent); font-size: 9px; line-height: 1.55; }
</style>
