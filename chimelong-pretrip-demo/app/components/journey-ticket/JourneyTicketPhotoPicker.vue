<script setup lang="ts">
import type { JourneyMedia, TicketPhotoTransform } from '../../../shared/types/journey'
import JourneyMediaThumb from './JourneyMediaThumb.vue'
import { imageStyles, type ImageStyleId } from '../../utils/imageStyles'

const props = defineProps<{
  photos: JourneyMedia[]
  selectedPhotoId?: string
  photoUrl?: string | null
  transform: TicketPhotoTransform
  uploading: boolean
  transforming: boolean
}>()

const emit = defineEmits<{
  select: [photoId: string]
  upload: [file: File]
  transform: [style: ImageStyleId, prompt: string]
  updateTransform: [transform: TicketPhotoTransform]
  reset: []
}>()

const fileInput = useTemplateRef<HTMLInputElement>('photoInput')
const drag = reactive({ active: false, x: 0, y: 0, originX: 50, originY: 50 })
const selectedStyle = shallowRef<ImageStyleId>('8bit')
const customPrompt = shallowRef('')

function onFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (file) emit('upload', file)
  if (fileInput.value) fileInput.value.value = ''
}

function pointerDown(event: PointerEvent) {
  if (!(event.currentTarget instanceof HTMLElement) || !props.photoUrl) return
  event.currentTarget.setPointerCapture(event.pointerId)
  Object.assign(drag, { active: true, x: event.clientX, y: event.clientY, originX: props.transform.x, originY: props.transform.y })
}

function pointerMove(event: PointerEvent) {
  if (!drag.active) return
  emit('updateTransform', {
    ...props.transform,
    x: Math.max(0, Math.min(100, drag.originX - (event.clientX - drag.x) / 2)),
    y: Math.max(0, Math.min(100, drag.originY - (event.clientY - drag.y) / 1.4)),
  })
}

function pointerUp() {
  drag.active = false
}
</script>

<template>
  <section class="photo-picker editor-section">
    <header>
      <div>
        <span>01 · COVER PHOTO</span>
        <h3>票根封面</h3>
      </div>
      <button type="button" @click="emit('reset')">恢复默认</button>
    </header>

    <div
      class="crop-stage"
      :class="{ empty: !photoUrl }"
      @pointerdown="pointerDown"
      @pointermove="pointerMove"
      @pointerup="pointerUp"
      @pointercancel="pointerUp"
    >
      <img v-if="photoUrl" :src="photoUrl" alt="正在调整的票根封面" :style="{ objectPosition: `${transform.x}% ${transform.y}%`, transform: `scale(${transform.scale})` }">
      <p v-else>还没有旅程照片<br><small>票根会先使用伙伴插画</small></p>
      <span v-if="photoUrl">拖动调整位置</span>
    </div>

    <label class="scale-control">
      <span>缩放</span>
      <input :value="transform.scale" type="range" min="1" max="2" step="0.05" @input="emit('updateTransform', { ...transform, scale: Number(($event.target as HTMLInputElement).value) })">
      <b>{{ transform.scale.toFixed(2) }}×</b>
    </label>

    <div class="photo-rail">
      <button v-for="photo in photos" :key="photo.id" type="button" :aria-label="`选择照片 ${photo.id}`" @click="emit('select', photo.id)">
        <JourneyMediaThumb :storage-key="photo.storageKey" :alt="photo.caption ?? '旅程照片'" :selected="selectedPhotoId === photo.id" />
      </button>
      <button class="upload-photo" type="button" :disabled="uploading" @click="fileInput?.click()">
        <i>＋</i>
        {{ uploading ? '处理中' : '从设备添加' }}
      </button>
      <input ref="photoInput" class="visually-hidden" type="file" accept="image/*" @change="onFile">
    </div>

    <div class="style-cards">
      <button v-for="style in imageStyles" :key="style.id" type="button" :class="{ active: selectedStyle === style.id }" @click="selectedStyle = style.id">
        <b>{{ style.id === '8bit' ? '8' : style.id === 'ancient' ? '古' : style.id === '2d' ? '2D' : style.id === 'zine' ? '册' : '＋' }}</b><span><strong>{{ style.label }}</strong><small>{{ style.detail }}</small></span>
      </button>
    </div>
    <label v-if="selectedStyle === 'custom'" class="custom-prompt"><span>自定义提示词（最多 500 字）</span><textarea v-model="customPrompt" maxlength="500" placeholder="描述你想生成的画面…"></textarea><small>{{ customPrompt.length }}/500</small></label>
    <button class="pixel-transform" type="button" :disabled="!selectedPhotoId || uploading || transforming || (selectedStyle === 'custom' && !customPrompt.trim())" @click="emit('transform', selectedStyle, selectedStyle === 'custom' ? customPrompt : '')"><i>▦</i><span><strong>{{ transforming ? '正在生成照片…' : `生成${imageStyles.find(item => item.id === selectedStyle)?.label}` }}</strong><small>左下角自动添加长隆奇遇水印</small></span></button>
  </section>
</template>

<style scoped>
.editor-section { width: 100%; min-width: 0; max-width: 100%; padding: 17px; overflow: hidden; border: 1px solid rgba(51,54,47,.12); border-radius: 22px 8px 22px 8px; background: rgba(255,255,255,.74); }
header { display: flex; align-items: center; justify-content: space-between; }
header div { display: grid; gap: 2px; }
header span { color: var(--memory-accent); font-size: 8px; font-weight: 900; letter-spacing: .1em; }
h3 { margin: 0; font-family: var(--font-display); font-size: 19px; }
header button { border: 0; background: none; color: #77736a; font-size: 9px; }
.crop-stage { position: relative; height: 145px; margin-top: 13px; overflow: hidden; border-radius: 16px 5px 16px 5px; background: #243930; cursor: grab; touch-action: none; }
.crop-stage:active { cursor: grabbing; }
.crop-stage img { width: 100%; height: 100%; object-fit: cover; transform-origin: center; pointer-events: none; }
.crop-stage > span { position: absolute; right: 8px; bottom: 8px; padding: 4px 7px; border-radius: 99px; background: rgba(14,30,23,.64); color: #fff; font-size: 7px; }
.crop-stage p { display: grid; height: 100%; margin: 0; place-content: center; color: #fff; font-family: var(--font-display); text-align: center; }
.crop-stage small { color: rgba(255,255,255,.58); font-family: inherit; font-size: 8px; }
.scale-control { display: grid; grid-template-columns: 30px 1fr 34px; align-items: center; margin-top: 10px; gap: 8px; color: #686f69; font-size: 9px; }
.scale-control input { accent-color: var(--memory-accent); }
.scale-control b { font: 700 8px ui-monospace,monospace; text-align: right; }
.photo-rail { display: flex; width: 100%; min-width: 0; margin-top: 11px; gap: 7px; overflow-x: auto; scrollbar-width: none; }
.photo-rail > button { flex: 0 0 auto; padding: 0; border: 0; background: none; }
.upload-photo { display: grid; width: 66px; height: 48px; place-content: center; place-items: center; gap: 1px; border: 1px dashed rgba(51,54,47,.24)!important; border-radius: 12px 4px 12px 4px!important; color: #6d746e; font-size: 7px; }
.upload-photo i { font-size: 16px; font-style: normal; }
.visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
.pixel-transform { display: grid; grid-template-columns: 34px 1fr; width: 100%; min-height: 54px; margin-top: 11px; padding: 8px 11px; align-items: center; gap: 9px; border: 1px solid color-mix(in srgb,var(--memory-accent) 34%,transparent); border-radius: 14px 5px; background: color-mix(in srgb,var(--memory-accent) 9%,#fff); color: #30433a; text-align: left; }
.pixel-transform > i { display: grid; width: 32px; height: 32px; place-items: center; border-radius: 10px 3px; background: var(--memory-accent); color: #fff; font-size: 17px; font-style: normal; }
.pixel-transform span { display: grid; gap: 2px; }
.pixel-transform strong { font-size: 9px; }
.pixel-transform small { color: #777d77; font-size: 7px; }
.pixel-transform:disabled { opacity: .48; }
.style-cards { display: grid; grid-template-columns: 1fr 1fr; margin-top: 11px; gap: 6px; }
.style-cards button { display: grid; min-height: 68px; grid-template-columns: 28px 1fr; align-items: center; padding: 8px; gap: 7px; border: 1px solid rgba(51,54,47,.13); border-radius: 12px 4px; background: #f7f2e8; color: #30433a; text-align: left; }
.style-cards button.active { border: 2px solid var(--memory-accent); padding: 7px; background: color-mix(in srgb,var(--memory-accent) 8%,#fff); }
.style-cards b { display: grid; width: 27px; height: 27px; place-items: center; border-radius: 9px 3px; background: #2b4439; color: #f4d078; font-size: 9px; }
.style-cards span { display: grid; min-width: 0; gap: 2px; }.style-cards strong { font-size: 8px; }.style-cards small { color: #777d77; font-size: 6px; line-height: 1.35; }
.custom-prompt { position: relative; display: grid; margin-top: 8px; gap: 4px; color: #506159; font-size: 7px; font-weight: 800; }.custom-prompt textarea { min-height: 72px; padding: 8px; resize: vertical; border: 1px solid #d4dad3; border-radius: 11px 4px; background: #fff; color: #273c33; font: inherit; line-height: 1.5; }.custom-prompt small { position: absolute; right: 7px; bottom: 6px; color: #8a8f89; font-size: 6px; }
</style>
