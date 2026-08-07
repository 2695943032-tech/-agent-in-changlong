export const PIXEL_MEMORY_PROMPT = `Transform the uploaded real visitor photo into a clearly visible high-resolution 16-bit pixel-art souvenir image.

Important requirements:
- 保留人物身份与可辨识特征，面部清楚，不要增加或删除人物。
- This must be an image-to-image transformation of the uploaded photo, not a new unrelated image.
- Preserve the person's identity and recognizable features: face shape, facial proportions, eyes, hairstyle, hair color, skin tone, age impression, body shape, pose, clothing colors, accessories, and the original number of people.
- Preserve the original composition and main background landmarks as much as possible.
- Apply an obvious 16-bit pixel-art style: crisp square pixels, clean pixel clusters, bright natural colors, lively theme-park energy, expressive but accurate facial details, and a cheerful modern look.
- Do not use retro, vintage, nostalgic, sepia, faded, old-game, old-photo, dark arcade, muted film, or low-saturation color grading. Keep colors normal, fresh, vivid, and friendly.
- Keep the result clear enough for a printed theme-park ticket stub. Avoid over-blurring, mosaic destruction, or excessive downsampling.
- Do not simply return the original photo. Do not apply only a mild filter. Do not change gender, age, identity, or add/remove people, animals, watermarks, logos, or text.
- Output only the transformed image.`

interface ImageEditPayload {
  data?: Array<{ b64_json?: string, base64?: string, url?: string }>
  images?: Array<string | { b64_json?: string, base64?: string, url?: string }>
  output?: Array<string | { b64_json?: string, base64?: string, url?: string }>
}

export function extractImageResult(payload: ImageEditPayload) {
  const candidate = payload.data?.[0] ?? payload.images?.[0] ?? payload.output?.[0]
  if (typeof candidate === 'string') {
    if (candidate.startsWith('http') || candidate.startsWith('data:image/')) return { value: candidate, kind: 'url' as const }
    return { value: candidate, kind: 'base64' as const }
  }
  if (candidate?.b64_json) return { value: candidate.b64_json, kind: 'base64' as const }
  if (candidate?.base64) return { value: candidate.base64, kind: 'base64' as const }
  if (candidate?.url) return { value: candidate.url, kind: 'url' as const }
  return null
}

async function remoteImageAsDataUrl(url: string, signal: AbortSignal) {
  if (url.startsWith('data:image/')) return url
  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error('IMAGE_RESULT_FETCH_FAILED')
  const mimeType = response.headers.get('content-type')?.split(';')[0] || 'image/png'
  const buffer = Buffer.from(await response.arrayBuffer())
  return `data:${mimeType};base64,${buffer.toString('base64')}`
}

export async function transformPhotoToPixelArt(image: { data: Uint8Array, type: string, filename: string }) {
  const config = useRuntimeConfig()
  if (!config.imageApiKey || !config.imageBaseUrl || !config.imageModel) {
    throw new Error('IMAGE_API_NOT_CONFIGURED')
  }

  const endpoint = String(config.imageEndpoint || '/images/edits')
  const url = `${String(config.imageBaseUrl).replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), Number(config.imageTimeoutMs) || 180000)

  try {
    const form = new FormData()
    const imageBytes = new Uint8Array(image.data.byteLength)
    imageBytes.set(image.data)
    form.append('model', String(config.imageModel))
    form.append('image', new Blob([imageBytes.buffer], { type: image.type }), image.filename)
    form.append('prompt', PIXEL_MEMORY_PROMPT)
    form.append('size', '1024x1024')
    form.append('quality', 'standard')
    form.append('response_format', 'url')

    const response = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.imageApiKey}` },
      body: form,
      signal: controller.signal,
    })
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 300)
      throw new Error(`IMAGE_API_HTTP_${response.status}${detail ? `:${detail}` : ''}`)
    }

    const result = extractImageResult(await response.json() as ImageEditPayload)
    if (!result) throw new Error('IMAGE_API_EMPTY_RESULT')
    const imageDataUrl = result.kind === 'base64'
      ? `data:image/png;base64,${result.value.replace(/^data:image\/[^;]+;base64,/, '')}`
      : await remoteImageAsDataUrl(result.value, controller.signal)
    return { imageDataUrl, promptVersion: 'pixel-memory-v3-modern-bit' }
  }
  catch (cause) {
    if (cause instanceof Error && cause.name === 'AbortError') throw new Error('IMAGE_API_TIMEOUT')
    throw cause
  }
  finally {
    clearTimeout(timeout)
  }
}
