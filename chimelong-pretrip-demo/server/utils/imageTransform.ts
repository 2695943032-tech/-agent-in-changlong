export type ImageStyleId = '8bit' | 'ancient' | '2d' | 'zine' | 'custom'

export const IMAGE_STYLE_PROMPTS: Record<Exclude<ImageStyleId, 'custom'>, string> = {
  '8bit': `Transform the uploaded real visitor photo into a clearly visible high-resolution 8-bit pixel-art souvenir image. Preserve identity, people count, pose, clothing, background landmarks and normal vivid colors. Use crisp square pixels and clean clusters; do not add text, logos or watermarks.`,
  ancient: `Transform the uploaded visitor photo into an elegant premium Chinese ancient-style painting. Preserve identity, people count, pose and composition. Use refined gongbi and ink-wash brushwork, layered silk-like texture, restrained mineral colors, architectural detail and a calm museum-quality finish. Do not add text, logos or watermarks.`,
  '2d': `Transform the uploaded visitor photo into a polished 2D animation illustration. Preserve identity, people count, pose, clothing and main background landmarks. Use clean expressive linework, sophisticated cel shading, controlled color blocks and detailed faces. Do not add text, logos or watermarks.`,
  zine: `gathered-scenes-zine-skill. 竖向二分构图，哑光米白艺术纸画册明信片风格。画面上半部分完整保留原图写实摄影风景，不改变原始景物布局、建筑轮廓、山体形态、空间比例及低饱和自然色调，保持真实摄影质感。画面下半部分转化为东方极简解构主义水墨构成插画，不直接复制原图细节，而是提炼原景观最核心的视觉符号，进行几何化重组与抽象表达。使用大面积留白、极简平面色块、低数量图形层次，将景物压缩为简洁的几何形态与柔和墨色结构。插画具有建筑设计研究手册般的理性构成感，类似东方建筑事务所概念草图，强调空间关系、比例、节奏与留白。色彩仅保留原图低饱和米灰、青灰、暖褐等自然色调，不增加新的颜色。水墨效果采用淡墨晕染、宣纸渗透感、柔和边缘过渡，不使用锐利线条，不添加装饰元素。最底部添加纤细优雅衬线英文标题，小字号排版。整体呈现高级极简东方建筑画册风格，干净、克制、安静，大面积米白哑光纸张质感。增强人物发型、服装层次和姿态，并详细补充远处树木、林间光束、薄雾与轮廓光。水面改为平静墨色与少量波纹，不再呈现镜面倒影。不要添加 logo、水印或无关文字。`,
}

export const PIXEL_MEMORY_PROMPT = `${IMAGE_STYLE_PROMPTS['8bit']}

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

export async function transformPhotoToPixelArt(image: { data: Uint8Array, type: string, filename: string }, options: { style?: ImageStyleId, prompt?: string } = {}) {
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
    const style = options.style && options.style !== 'custom' ? options.style : '8bit'
    const custom = options.style === 'custom' ? String(options.prompt ?? '').trim().slice(0, 500) : ''
    const prompt = options.style === 'custom' ? `${custom || PIXEL_MEMORY_PROMPT}\nPreserve identity and original composition. Do not add text, logos or watermarks.` : IMAGE_STYLE_PROMPTS[style]
    form.append('prompt', prompt)
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
    return { imageDataUrl, promptVersion: `visitor-${options.style ?? '8bit'}` }
  }
  catch (cause) {
    if (cause instanceof Error && cause.name === 'AbortError') throw new Error('IMAGE_API_TIMEOUT')
    throw cause
  }
  finally {
    clearTimeout(timeout)
  }
}
