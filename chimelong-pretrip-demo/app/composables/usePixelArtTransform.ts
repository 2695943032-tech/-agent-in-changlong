type PixelArtResult = {
  imageDataUrl: string
  promptVersion: string
  remaining?: number
}

import type { ImageStyleId } from '../utils/imageStyles'
import { addWatermark } from '../utils/imageStyles'

export function usePixelArtTransform() {
  const transforming = shallowRef(false)

  function dataUrlToBlob(dataUrl: string) {
    const [header, encoded] = dataUrl.split(',', 2)
    if (!header || !encoded) throw new Error('图片转换结果格式无效')
    const mimeType = header.match(/^data:([^;]+);base64$/)?.[1] ?? 'image/png'
    const binary = atob(encoded)
    const bytes = new Uint8Array(binary.length)
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
    return new Blob([bytes], { type: mimeType })
  }

  function errorMessage(cause: unknown) {
    if (cause && typeof cause === 'object') {
      const data = (cause as { data?: { statusMessage?: string, message?: string } }).data
      if (data?.statusMessage) return data.statusMessage
      if (data?.message) return data.message
    }
    return cause instanceof Error ? cause.message : '像素照片转换失败，请稍后重试'
  }

  async function transform(source: Blob, filename = 'visitor-photo.png', options: { style?: ImageStyleId, prompt?: string } = {}) {
    if (transforming.value) throw new Error('图片正在转换，请稍候')
    transforming.value = true
    try {
      const body = new FormData()
      body.append('image', source, filename)
      body.append('style', options.style ?? '8bit')
      if (options.prompt) body.append('prompt', options.prompt.slice(0, 500))
      const result = await $fetch<PixelArtResult>('/api/posttrip/pixelize', { method: 'POST', body })
      return { ...result, imageDataUrl: await addWatermark(result.imageDataUrl) }
    }
    finally {
      transforming.value = false
    }
  }

  return { transforming, transform, dataUrlToBlob, errorMessage }
}
