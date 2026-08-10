<script setup lang="ts">
/**
 * 游客与动物 Agent 的合照生成器。
 * 技术栈：Nuxt / Vue + Canvas 2D + MediaPipe Tasks Vision（浏览器端运行）。
 * 不上传原始照片；人物检测、分割和合成均在用户本机异步完成。
 */
const props = defineProps<{
  sourceFile: File
  stickerSources: readonly string[]
  agentName: string
}>()

const emit = defineEmits<{
  complete: [image: string, usedAi: boolean]
  close: []
  retry: []
}>()

const previewUrl = shallowRef('')
const composedUrl = shallowRef('')
const processing = shallowRef(false)
const progressText = shallowRef('准备照片…')
const errorText = shallowRef('')
const usedAiMask = shallowRef(false)

function nextFrame() {
  return new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
}

function loadImage(source: string | Blob) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('图片加载失败，请换一张照片。'))
    image.src = typeof source === 'string' ? source : URL.createObjectURL(source)
  })
}

/** 把高分辨率照片限制在移动端较友好的尺寸，避免 Canvas 和 AI 推理阻塞页面。 */
function canvasSize(image: HTMLImageElement) {
  const maxSide = 1440
  const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight))
  return { width: Math.round(image.naturalWidth * scale), height: Math.round(image.naturalHeight * scale) }
}

/** 将 MediaPipe 输出的黑白类别掩码转成可用于 Canvas destination-in 的 Alpha Mask。 */
function createAlphaMask(mask: { width: number, height: number, getAsUint8Array: () => Uint8Array }) {
  const maskCanvas = document.createElement('canvas')
  maskCanvas.width = mask.width
  maskCanvas.height = mask.height
  const context = maskCanvas.getContext('2d', { willReadFrequently: true })!
  const pixels = mask.getAsUint8Array()
  const imageData = context.createImageData(mask.width, mask.height)
  for (let index = 0; index < pixels.length; index += 1) {
    // Selfie Segmenter 的 0 为背景、非 0 为人物；仅把人物写入不透明 Alpha。
    const offset = index * 4
    imageData.data[offset] = 255
    imageData.data[offset + 1] = 255
    imageData.data[offset + 2] = 255
    imageData.data[offset + 3] = pixels[index] ? 255 : 0
  }
  context.putImageData(imageData, 0, 0)
  return maskCanvas
}

/**
 * 估计贴纸候选区域内的人像占比。数值越小，说明该区域越接近空地，越适合放 Agent。
 * 使用稀疏采样避免对高分辨率 Mask 做整块读取，移动端也能保持流畅。
 */
function personCoverage(maskCanvas: HTMLCanvasElement, x: number, y: number, width: number, height: number, outputWidth: number, outputHeight: number) {
  const maskData = maskCanvas.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, maskCanvas.width, maskCanvas.height).data
  let personSamples = 0
  let samples = 0
  for (let row = 1; row < 9; row += 1) {
    for (let column = 1; column < 9; column += 1) {
      const sampleX = Math.max(0, Math.min(outputWidth - 1, x + width * column / 9))
      const sampleY = Math.max(0, Math.min(outputHeight - 1, y + height * row / 9))
      const maskX = Math.min(maskCanvas.width - 1, Math.floor(sampleX / outputWidth * maskCanvas.width))
      const maskY = Math.min(maskCanvas.height - 1, Math.floor(sampleY / outputHeight * maskCanvas.height))
      if ((maskData[(maskY * maskCanvas.width + maskX) * 4 + 3] ?? 0) > 70) personSamples += 1
      samples += 1
    }
  }
  return personSamples / samples
}

/** 从人物脚边的左右两侧开始，选择人像遮挡最少的候选位置。 */
function findSafeStickerPosition(maskCanvas: HTMLCanvasElement | null, anchor: { x: number, y: number }, personHeight: number, stickerWidth: number, stickerHeight: number, outputWidth: number, outputHeight: number) {
  const y = Math.min(outputHeight - stickerHeight - 4, Math.max(8, anchor.y - stickerHeight))
  const gap = Math.max(16, personHeight * .12)
  const clampX = (value: number) => Math.min(outputWidth - stickerWidth - 10, Math.max(10, value))
  const candidates = [
    clampX(anchor.x + gap),
    clampX(anchor.x - stickerWidth - gap),
    clampX(anchor.x + personHeight * .42),
    clampX(anchor.x - stickerWidth - personHeight * .42),
    clampX(outputWidth * .12),
    clampX(outputWidth * .88 - stickerWidth),
  ]
  if (!maskCanvas) return { x: candidates[0]!, y, coverage: 0 }
  return candidates
    .map(x => ({ x, y, coverage: personCoverage(maskCanvas, x, y, stickerWidth, stickerHeight, outputWidth, outputHeight) }))
    .reduce((best, candidate) => candidate.coverage < best.coverage ? candidate : best)
}

async function compose() {
  processing.value = true
  errorText.value = ''
  usedAiMask.value = false
  progressText.value = '正在读取照片…'
  await nextFrame()

  try {
    const source = await loadImage(props.sourceFile)
    // 每次合照随机选一个可用贴纸；团团会在不同动作之间变化。
    const stickerSrc = props.stickerSources[Math.floor(Math.random() * props.stickerSources.length)]
    if (!stickerSrc) throw new Error('暂时没有可用的 Agent 贴纸。')
    const sticker = await loadImage(stickerSrc)
    const { width, height } = canvasSize(source)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')!
    const sourceUrl = URL.createObjectURL(props.sourceFile)
    previewUrl.value = sourceUrl

    // 默认锚点是画面下方偏右；视觉模型不可用时仍能生成一张可用合照。
    let anchor = { x: width * 0.61, y: height * 0.84 }
    // 贴纸尺寸必须以人物身高为基准，而不是以整张照片为基准。
    let personHeight = height * .55
    let alphaMask: HTMLCanvasElement | null = null

    try {
      progressText.value = '正在识别人物位置与轮廓…'
      await nextFrame()
      // 动态导入可避免 SSR 加载浏览器专用的 WebAssembly 视觉库。
      const { FilesetResolver, ImageSegmenter, PoseLandmarker } = await import('@mediapipe/tasks-vision')
      // WASM 与模型随网站一起发布，游客端不再依赖 CDN 或第三方视觉 API。
      const vision = await FilesetResolver.forVisionTasks('/vision/wasm')
      const [segmenter, poseLandmarker] = await Promise.all([
        ImageSegmenter.createFromOptions(vision, {
          baseOptions: { modelAssetPath: '/vision/person_segmenter.tflite', delegate: 'GPU' },
          runningMode: 'IMAGE', outputCategoryMask: true,
        }),
        PoseLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: '/vision/pose_landmarker_lite.task', delegate: 'GPU' },
          runningMode: 'IMAGE', numPoses: 1,
        }),
      ])
      const [segmentation, pose] = await Promise.all([segmenter.segment(source), Promise.resolve(poseLandmarker.detect(source))])
      const landmarks = pose.landmarks[0]
      if (landmarks?.length) {
        // 左右脚踝/脚尖的最低点作为“人物双脚/底部锚点”。
        const footPoints = [landmarks[27], landmarks[28], landmarks[31], landmarks[32]]
          .filter((point): point is NonNullable<typeof point> => point !== undefined)
        if (footPoints.length) {
          const bottom = footPoints.reduce((lowest, point) => point.y > lowest.y ? point : lowest)
          anchor = { x: bottom.x * width, y: Math.min(height * .95, bottom.y * height) }
          const topPoints = [landmarks[0], landmarks[2], landmarks[5], landmarks[7], landmarks[8], landmarks[9], landmarks[10]]
            .filter((point): point is NonNullable<typeof point> => point !== undefined)
          if (topPoints.length) {
            const top = topPoints.reduce((highest, point) => point.y < highest.y ? point : highest)
            personHeight = Math.max(100, (bottom.y - top.y) * height)
          }
        }
      }
      if (segmentation.categoryMask) {
        alphaMask = createAlphaMask(segmentation.categoryMask)
        usedAiMask.value = true
      }
      segmenter.close()
      poseLandmarker.close()
    }
    catch {
      // 网络、GPU 或首次模型加载失败时不阻断拍照流程，改用无抠图的合成结果。
      errorText.value = '人物识别暂不可用，已生成基础合照；联网后可再次尝试获得前景遮挡效果。'
    }

    progressText.value = '正在合成团团的合照…'
    await nextFrame()
    // 第一层：用户原图。
    context.drawImage(source, 0, 0, width, height)

    // Agent 不能因为姿态识别只检测到局部人物而缩成图标：人物比例与画面短边共同决定下限。
    const stickerMinimumHeight = Math.max(120, Math.min(width, height) * .22, personHeight * .38)
    let stickerHeight = Math.min(height * .56, Math.max(stickerMinimumHeight, personHeight * .48))
    let stickerWidth = stickerHeight * (sticker.naturalWidth / sticker.naturalHeight)
    let stickerPosition = findSafeStickerPosition(alphaMask, anchor, personHeight, stickerWidth, stickerHeight, width, height)
    // 人群照片优先换位置；确需缩小时也不得低于可辨识尺寸，避免 Agent 变成右下角小图标。
    while (stickerPosition.coverage > .12 && stickerHeight > stickerMinimumHeight) {
      stickerHeight *= .86
      stickerHeight = Math.max(stickerMinimumHeight, stickerHeight)
      stickerWidth = stickerHeight * (sticker.naturalWidth / sticker.naturalHeight)
      stickerPosition = findSafeStickerPosition(alphaMask, anchor, personHeight, stickerWidth, stickerHeight, width, height)
    }
    const stickerX = stickerPosition.x
    const stickerY = stickerPosition.y

    // 第二层：贴纸底部的半透明、高斯模糊椭圆阴影，帮助角色“站”在原图中。
    context.save()
    context.filter = 'blur(10px)'
    context.fillStyle = 'rgba(16, 38, 29, .28)'
    context.beginPath()
    context.ellipse(stickerX + stickerWidth * .52, stickerY + stickerHeight * .91, stickerWidth * .35, stickerHeight * .055, 0, 0, Math.PI * 2)
    context.fill()
    context.restore()
    // 贴纸稍降透明度，使其与照片原本的光影更自然地融合。
    context.save()
    context.globalAlpha = .9
    context.drawImage(sticker, stickerX, stickerY, stickerWidth, stickerHeight)
    context.restore()

    if (alphaMask) {
      // 第三层：先画一份原图，再用人物 Mask 做 destination-in，只留下人物前景。
      // 这会让人物覆盖在贴纸上方，形成“人物遮挡贴纸”的空间关系。
      const personLayer = document.createElement('canvas')
      personLayer.width = width
      personLayer.height = height
      const personContext = personLayer.getContext('2d')!
      personContext.drawImage(source, 0, 0, width, height)
      personContext.globalCompositeOperation = 'destination-in'
      personContext.drawImage(alphaMask, 0, 0, width, height)
      context.drawImage(personLayer, 0, 0)
    }

    composedUrl.value = canvas.toDataURL('image/jpeg', .92)
    progressText.value = usedAiMask.value ? '合照已生成' : '基础合照已生成'
  }
  catch (error) {
    errorText.value = error instanceof Error ? error.message : '合照生成失败，请再试一次。'
  }
  finally {
    processing.value = false
  }
}

function usePhoto() {
  if (composedUrl.value) emit('complete', composedUrl.value, usedAiMask.value)
}

watch(() => props.sourceFile, () => { void compose() }, { immediate: true })
onBeforeUnmount(() => { if (previewUrl.value) URL.revokeObjectURL(previewUrl.value) })
</script>

<template>
  <div class="photo-backdrop" @click.self="emit('close')">
    <section class="photo-sheet" role="dialog" aria-modal="true" aria-label="与动物 Agent 合照">
      <header><div><small>AI PHOTO MOMENT</small><strong>和{{ agentName }}拍张合照</strong></div><button type="button" aria-label="关闭" @click="emit('close')">×</button></header>
      <div class="photo-preview" :class="{ processing }">
        <img v-if="composedUrl" :src="composedUrl" alt="生成的合照">
        <img v-else-if="previewUrl" :src="previewUrl" alt="用户上传照片">
        <span v-else>正在加载照片</span>
        <div v-if="processing" class="photo-loading"><i></i><span>{{ progressText }}</span></div>
      </div>
      <p v-if="errorText" class="photo-note">{{ errorText }}</p>
      <p v-else class="photo-note">照片仅在当前设备的浏览器内处理，不会上传到服务器。</p>
      <footer><button type="button" @click="emit('retry')">换一张</button><button class="primary" type="button" :disabled="!composedUrl || processing" @click="usePhoto">发送合照</button></footer>
    </section>
  </div>
</template>

<style scoped>
.photo-backdrop { position: fixed; z-index: 36; inset: 0; display: grid; align-items: end; justify-items: center; padding: 10px; background: rgba(14, 31, 25, .48); }.photo-sheet { width: min(100%, 520px); max-height: 92dvh; padding: 16px; overflow: auto; border-radius: 24px 24px 18px 18px; background: #fffdf8; box-shadow: 0 -20px 60px rgba(14, 35, 28, .34); }.photo-sheet header { display: flex; align-items: center; justify-content: space-between; }.photo-sheet header div { display: grid; gap: 3px; }.photo-sheet header small { color: #a86b25; font-size: 9px; font-weight: 900; letter-spacing: .11em; }.photo-sheet header strong { color: #0f4033; font-size: 19px; }.photo-sheet header button { width: 36px; height: 36px; border: 1px solid #d9dfd5; border-radius: 12px; background: #fff; color: #557066; font-size: 22px; }.photo-preview { position: relative; display: grid; min-height: 250px; margin-top: 14px; place-items: center; overflow: hidden; border-radius: 16px; background: #e9eee7; }.photo-preview > img { display: block; width: 100%; max-height: 58dvh; object-fit: contain; }.photo-preview > span { color: #718179; font-size: 12px; }.photo-loading { position: absolute; inset: 0; display: grid; place-content: center; place-items: center; gap: 9px; background: rgba(18, 46, 37, .48); color: #fff; font-size: 12px; font-weight: 800; }.photo-loading i { width: 28px; height: 28px; border: 3px solid rgba(255,255,255,.38); border-top-color: #fff; border-radius: 50%; animation: spin .8s linear infinite; }.photo-note { margin: 10px 2px 0; color: #718178; font-size: 10px; line-height: 1.5; }.photo-sheet footer { display: grid; grid-template-columns: 1fr 1.5fr; margin-top: 13px; gap: 8px; }.photo-sheet footer button { height: 42px; border: 1px solid #cedace; border-radius: 12px; background: #fff; color: #456255; font-size: 12px; font-weight: 800; }.photo-sheet footer .primary { border-color: #0b4133; background: #0b4133; color: #fff; }.photo-sheet footer button:disabled { opacity: .45; } @keyframes spin { to { transform: rotate(360deg); } }
</style>
