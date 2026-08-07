<script setup lang="ts">
import type { Companion } from '../../../shared/types/pretrip'
import type { JourneyMedia, JourneyRecord, JourneyTicket, JourneyTicketAudio, TicketPhotoTransform } from '../../../shared/types/journey'
import { journeyTicketTemplates } from '#shared/data/ticketTemplates'
import { compressJourneyPhoto, readJourneyBlob, saveJourneyBlob } from '../../services/journeyMediaStorage'
import { buildJourneyTicket } from '../../utils/journeyRecord'
import JourneyTicketAudioRecorder from './JourneyTicketAudioRecorder.vue'
import JourneyTicketMessageEditor from './JourneyTicketMessageEditor.vue'
import JourneyTicketPhotoPicker from './JourneyTicketPhotoPicker.vue'
import JourneyTicketPreview from './JourneyTicketPreview.vue'
import JourneyTicketTemplatePicker from './JourneyTicketTemplatePicker.vue'

type EditorTab = 'cover' | 'words' | 'sound' | 'style' | 'orientation'
type TicketOrientation = 'horizontal' | 'vertical'

const props = defineProps<{ journey: JourneyRecord, companions: Companion[] }>()
const emit = defineEmits<{ saved: [ticket: JourneyTicket] }>()

const records = useJourneyRecords()
const initial = props.journey.ticket ?? buildJourneyTicket(props.journey)
const ticket = reactive<JourneyTicket>(structuredClone(toRaw(initial)))
const activeTab = shallowRef<EditorTab>('cover')
const uploading = shallowRef(false)
const transforming = shallowRef(false)
const addingToAlbum = shallowRef(false)
const feedback = shallowRef('')
let feedbackTimer: ReturnType<typeof setTimeout> | undefined

const tabs: Array<{ id: EditorTab, label: string, eyebrow: string }> = [
  { id: 'cover', label: '票根封面', eyebrow: '01' },
  { id: 'words', label: '标题与留言', eyebrow: '02' },
  { id: 'sound', label: '旅行声音', eyebrow: '03' },
  { id: 'style', label: '票根样式', eyebrow: '04' },
  { id: 'orientation', label: '横屏/竖屏', eyebrow: '05' },
]

const currentRecord = computed(() => records.collection.value.records.find(item => item.id === props.journey.id) ?? props.journey)
const companion = computed(() => props.companions.find(item => item.id === ticket.companionId) ?? props.companions[0]!)
const photos = computed(() => currentRecord.value.media.filter(item => item.kind === 'photo'))
const selectedPhoto = computed(() => photos.value.find(item => item.id === ticket.coverPhotoId))
const { objectUrl: photoUrl } = useJourneyMedia(() => selectedPhoto.value?.storageKey)
const activeTemplate = computed(() => journeyTicketTemplates.find(item => item.id === ticket.template) ?? journeyTicketTemplates[0]!)
const orientation = computed<TicketOrientation>(() => activeTemplate.value.layout === 'vertical' ? 'vertical' : 'horizontal')
const activeTabMeta = computed(() => tabs.find(tab => tab.id === activeTab.value) ?? tabs[0]!)

watch(() => props.journey.ticket, (storedTicket) => {
  if (!storedTicket || storedTicket.updatedAt === ticket.updatedAt) return
  const next = structuredClone(toRaw(storedTicket))
  const mutableTicket = ticket as unknown as Record<string, unknown>
  for (const key of Object.keys(mutableTicket)) delete mutableTicket[key]
  Object.assign(ticket, next)
})

watch(feedback, (message) => {
  if (feedbackTimer) clearTimeout(feedbackTimer)
  if (!message) return
  feedbackTimer = setTimeout(() => {
    if (feedback.value === message) feedback.value = ''
  }, 3200)
})

onBeforeUnmount(() => {
  if (feedbackTimer) clearTimeout(feedbackTimer)
})

function updateTransform(transform: TicketPhotoTransform) {
  ticket.coverTransform = { ...transform }
}

async function uploadPhoto(file: File) {
  if (uploading.value) return
  uploading.value = true
  feedback.value = ''
  try {
    const blob = await compressJourneyPhoto(file)
    const id = `media-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const storageKey = `${props.journey.id}/${id}`
    await saveJourneyBlob(storageKey, blob)
    const media: JourneyMedia = {
      id,
      journeyId: props.journey.id,
      kind: 'photo',
      storageKey,
      mimeType: blob.type,
      createdAt: new Date().toISOString(),
      caption: '票根封面照片',
      isHighlight: photos.value.length === 0,
    }
    records.addMedia(media)
    ticket.coverPhotoId = id
    ticket.coverTransform = { x: 50, y: 50, scale: 1 }
    feedback.value = '新照片已经成为票根封面。'
  }
  catch (cause) {
    feedback.value = cause instanceof Error ? cause.message : '照片处理失败，伙伴插画仍可作为封面。'
  }
  finally {
    uploading.value = false
  }
}

function dataUrlToBlob(dataUrl: string) {
  const [header, encoded] = dataUrl.split(',', 2)
  if (!header || !encoded) throw new Error('图片转换结果格式无效')
  const mimeType = header.match(/^data:([^;]+);base64$/)?.[1] ?? 'image/png'
  const binary = atob(encoded)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return new Blob([bytes], { type: mimeType })
}

function requestErrorMessage(cause: unknown) {
  if (cause && typeof cause === 'object') {
    const data = (cause as { data?: { statusMessage?: string, message?: string } }).data
    if (data?.statusMessage) return data.statusMessage
    if (data?.message) return data.message
  }
  return cause instanceof Error ? cause.message : '像素照片转换失败，请稍后重试'
}

async function transformSelectedPhoto() {
  if (transforming.value || !selectedPhoto.value) return
  transforming.value = true
  feedback.value = '正在保留人物特征，并转换为正常色彩的高清 bit 风。'
  try {
    const source = await readJourneyBlob(selectedPhoto.value.storageKey)
    if (!source) throw new Error('没有读取到这张照片，请重新上传')
    const body = new FormData()
    body.append('image', source, `visitor-photo.${source.type.split('/')[1] || 'png'}`)
    const result = await $fetch<{ imageDataUrl: string }>('/api/posttrip/pixelize', { method: 'POST', body })
    const output = dataUrlToBlob(result.imageDataUrl)
    const id = `media-pixel-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const storageKey = `${props.journey.id}/${id}`
    await saveJourneyBlob(storageKey, output)
    records.addMedia({
      id,
      journeyId: props.journey.id,
      kind: 'photo',
      storageKey,
      mimeType: output.type,
      createdAt: new Date().toISOString(),
      caption: 'AI 高清 bit 纪念照',
      isHighlight: true,
    })
    ticket.coverPhotoId = id
    ticket.coverTransform = { x: 50, y: 50, scale: 1 }
    activeTab.value = 'cover'
    feedback.value = '像素纪念照已生成，并设为当前票根封面。'
  }
  catch (cause) {
    feedback.value = requestErrorMessage(cause)
  }
  finally {
    transforming.value = false
  }
}

function updateAudio(audio?: JourneyTicketAudio) {
  ticket.audio = audio
  feedback.value = audio ? '旅行声音已经和票根放在一起。' : '旅行声音已移除。'
}

function setOrientation(nextOrientation: TicketOrientation) {
  const match = journeyTicketTemplates.find(item => item.layout === nextOrientation)
  if (match) ticket.template = match.id
}

function saveDraft() {
  ticket.title = ticket.title.trim() || `和${companion.value.name}一起完成的奇遇`
  ticket.message = ticket.message?.trim()
  ticket.updatedAt = new Date().toISOString()
  const snapshot = structuredClone(toRaw(ticket))
  records.saveTicket(props.journey.id, snapshot)
  emit('saved', snapshot)
  return snapshot
}

async function addToAlbum() {
  if (addingToAlbum.value || transforming.value) return
  addingToAlbum.value = true
  feedback.value = '正在把这张票放进票根册。'
  const savedTicket = saveDraft()
  if (import.meta.client) sessionStorage.setItem('chimelong-collect-ticket-id', savedTicket.id)
  await nextTick()
  await navigateTo({ path: '/posttrip/tickets/collect', query: { ticket: savedTicket.id } })
}
</script>

<template>
  <section class="ticket-editor" :style="{ '--memory-accent': companion.accent }">
    <header class="editor-header">
      <button type="button" aria-label="返回回忆星册" @click="navigateTo('/posttrip')">←</button>
      <div>
        <span>EDIT MEMORY TICKET</span>
        <h1>编辑奇遇票根</h1>
        <p>上方看成品，下方快速调整</p>
      </div>
      <NuxtLink to="/posttrip/tickets">票根册</NuxtLink>
    </header>

    <main class="editor-workbench">
      <section class="preview-stage" aria-label="票根成品预览">
        <Transition name="preview" mode="out-in">
          <JourneyTicketPreview :key="`${ticket.template}-${ticket.coverPhotoId ?? 'fallback'}-${photoUrl ?? 'no-photo'}`" :ticket="ticket" :companion="companion" :photo-url="photoUrl" />
        </Transition>
      </section>

      <nav class="editor-tabs" aria-label="票根编辑栏目">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          :class="{ active: activeTab === tab.id }"
          @click="activeTab = tab.id"
        >
          <small>{{ tab.eyebrow }}</small>
          <span>{{ tab.label }}</span>
        </button>
      </nav>

      <section class="panel-shell" :aria-label="activeTabMeta.label">
        <Transition name="panel" mode="out-in">
          <div :key="activeTab" class="panel-body">
            <JourneyTicketPhotoPicker
              v-if="activeTab === 'cover'"
              :photos="photos"
              :selected-photo-id="ticket.coverPhotoId"
              :photo-url="photoUrl"
              :transform="ticket.coverTransform"
              :uploading="uploading"
              :transforming="transforming"
              @select="ticket.coverPhotoId = $event"
              @upload="uploadPhoto"
              @transform="transformSelectedPhoto"
              @update-transform="updateTransform"
              @reset="ticket.coverPhotoId = undefined; ticket.coverTransform = { x: 50, y: 50, scale: 1 }"
            />
            <JourneyTicketMessageEditor v-else-if="activeTab === 'words'" v-model:title="ticket.title" v-model:message="ticket.message" v-model:show-message="ticket.showMessage" />
            <JourneyTicketAudioRecorder v-else-if="activeTab === 'sound'" :journey-id="journey.id" :ticket-id="ticket.id" :existing-audio="ticket.audio" @saved="updateAudio" />
            <JourneyTicketTemplatePicker v-else-if="activeTab === 'style'" v-model="ticket.template" />
            <section v-else class="orientation-panel editor-section">
              <header>
                <span>05 · SCREEN</span>
                <h3>横屏 / 竖屏</h3>
              </header>
              <div class="orientation-grid">
                <button type="button" :class="{ active: orientation === 'horizontal' }" @click="setOrientation('horizontal')">
                  <i>▭</i>
                  <strong>横屏票根</strong>
                  <small>适合票根册、横向展示和导出收藏。</small>
                </button>
                <button type="button" :class="{ active: orientation === 'vertical' }" @click="setOrientation('vertical')">
                  <i>▯</i>
                  <strong>竖屏故事</strong>
                  <small>适合手机预览、社交平台故事图。</small>
                </button>
              </div>
            </section>
          </div>
        </Transition>
      </section>
    </main>

    <footer class="editor-footer">
      <p v-if="feedback" aria-live="polite">{{ feedback }}</p>
      <button class="album-action" type="button" :disabled="addingToAlbum || transforming" @click="addToAlbum">
        {{ addingToAlbum ? '正在入册…' : '加入票根册' }}
      </button>
    </footer>
  </section>
</template>

<style scoped>
.ticket-editor { display: flex; width: 100%; max-width: 480px; height: 100dvh; margin: 0 auto; overflow: hidden; flex-direction: column; background: radial-gradient(circle at 84% 0,color-mix(in srgb,var(--memory-accent) 16%,transparent),transparent 26%),#eee9df; color: #273a32; }
.editor-header { display: grid; flex: 0 0 auto; grid-template-columns: 42px 1fr auto; align-items: center; padding: max(12px,env(safe-area-inset-top)) 14px 11px; gap: 10px; border-bottom: 1px solid rgba(37,54,46,.1); background: rgba(247,243,234,.86); backdrop-filter: blur(16px); }
.editor-header > button { display: grid; width: 40px; height: 40px; place-items: center; border: 1px solid rgba(37,54,46,.14); border-radius: 14px 5px 14px 5px; background: #fff; color: #26362f; font-weight: 900; }
.editor-header div { display: grid; min-width: 0; gap: 1px; }
.editor-header span { color: var(--memory-accent); font-size: 7px; font-weight: 900; letter-spacing: .1em; }
.editor-header h1 { margin: 0; overflow: hidden; font-family: var(--font-display); font-size: 18px; text-overflow: ellipsis; white-space: nowrap; }
.editor-header p { margin: 0; color: #7a7f78; font-size: 8px; }
.editor-header a { color: var(--memory-accent); font-size: 9px; font-weight: 900; text-decoration: none; }
.editor-workbench { display: flex; min-height: 0; flex: 1 1 auto; flex-direction: column; }
.preview-stage { flex: 0 0 clamp(138px,32dvh,214px); min-width: 0; padding: 14px 14px 8px; overflow: hidden; }
.preview-stage :deep(.ticket) { max-height: 100%; margin: 0 auto; }
.preview-stage :deep(.template-stamp) { max-height: 100%; max-width: 42%; }
.editor-tabs { display: flex; flex: 0 0 auto; min-width: 0; padding: 3px 10px 8px; gap: 6px; overflow-x: auto; scrollbar-width: none; }
.editor-tabs button { display: grid; flex: 0 0 auto; min-width: 82px; min-height: 43px; align-content: center; padding: 7px 9px; border: 1px solid rgba(37,54,46,.1); border-radius: 12px 4px 12px 4px; background: rgba(255,255,255,.58); color: #58635d; text-align: left; box-shadow: 0 8px 18px rgba(37,54,46,.05); }
.editor-tabs button.active { border-color: color-mix(in srgb,var(--memory-accent) 70%,transparent); background: #fff8eb; color: #253b32; }
.editor-tabs small { color: var(--memory-accent); font: 900 7px/1 ui-monospace,monospace; }
.editor-tabs span { margin-top: 3px; font-size: 9px; font-weight: 900; white-space: nowrap; }
.panel-shell { min-height: 0; flex: 1 1 auto; padding: 0 10px 8px; overflow: hidden; }
.panel-body { height: 100%; min-height: 0; overflow: auto; overscroll-behavior: contain; scrollbar-width: none; }
.panel-body::-webkit-scrollbar,.editor-tabs::-webkit-scrollbar { display: none; }
.panel-body :deep(.editor-section) { min-height: 100%; padding: 14px; border-radius: 18px 7px 18px 7px; background: rgba(255,255,255,.8); }
.panel-body :deep(header h3),.orientation-panel h3 { font-size: 17px; }
.panel-body :deep(.crop-stage) { height: min(118px,20dvh); margin-top: 9px; }
.panel-body :deep(.recorder-body) { margin-top: 10px; padding: 12px; gap: 10px; }
.panel-body :deep(.template-list) { gap: 5px; }
.panel-body :deep(.template-list button) { min-height: 49px; }
.orientation-panel header { display: grid; gap: 2px; margin-bottom: 12px; }
.orientation-panel header span { color: var(--memory-accent); font-size: 8px; font-weight: 900; letter-spacing: .1em; }
.orientation-panel h3 { margin: 0; font-family: var(--font-display); }
.orientation-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.orientation-grid button { display: grid; min-height: 146px; align-content: center; justify-items: center; padding: 14px 10px; border: 1px solid rgba(37,54,46,.11); border-radius: 16px 5px 16px 5px; background: #f7f2e8; color: #2c4037; text-align: center; }
.orientation-grid button.active { border-color: var(--memory-accent); background: color-mix(in srgb,var(--memory-accent) 10%,#fff); }
.orientation-grid i { display: grid; width: 42px; height: 42px; place-items: center; border-radius: 13px 4px; background: #253b32; color: #f4d27c; font-size: 28px; font-style: normal; line-height: 1; }
.orientation-grid strong { margin-top: 10px; font-size: 12px; }
.orientation-grid small { max-width: 130px; margin-top: 4px; color: #717970; font-size: 8px; line-height: 1.5; }
.editor-footer { flex: 0 0 auto; padding: 8px 10px max(10px,env(safe-area-inset-bottom)); border-top: 1px solid rgba(37,54,46,.12); background: rgba(247,243,234,.95); box-shadow: 0 -16px 34px rgba(32,48,40,.12); backdrop-filter: blur(18px); }
.editor-footer p { margin: 0 0 7px; padding: 7px 10px; border-radius: 99px; background: #fff7e8; color: #9a523e; font-size: 8px; text-align: center; }
.album-action { width: 100%; min-height: 50px; border: 0; border-radius: 16px 5px 16px 5px; background: #253b32; color: #fff; font-size: 12px; font-weight: 900; box-shadow: 0 12px 24px rgba(37,59,50,.18); }
.album-action:disabled { opacity: .52; }
.preview-enter-active,.preview-leave-active { transition: opacity .22s ease,transform .28s var(--ease-out); }
.preview-enter-from { opacity: 0; transform: translateX(12px) scale(.98); }
.preview-leave-to { opacity: 0; transform: translateX(-10px) scale(.98); }
.panel-enter-active,.panel-leave-active { transition: opacity .18s ease,transform .22s var(--ease-out); }
.panel-enter-from { opacity: 0; transform: translateY(8px); }
.panel-leave-to { opacity: 0; transform: translateY(-6px); }

@media (max-height: 720px) {
  .preview-stage { flex-basis: 128px; padding-top: 9px; }
  .editor-tabs button { min-height: 38px; }
  .album-action { min-height: 44px; }
}
</style>
