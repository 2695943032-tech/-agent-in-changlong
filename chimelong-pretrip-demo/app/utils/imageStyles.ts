export type ImageStyleId = '8bit' | 'ancient' | '2d' | 'zine' | 'custom'

export const imageStyles: Array<{ id: ImageStyleId, label: string, detail: string }> = [
  { id: '8bit', label: '8bit 复古风', detail: '清晰像素颗粒，保留自然鲜亮色彩' },
  { id: 'ancient', label: '高级古风', detail: '工笔与淡墨融合，像一张收藏级画卷' },
  { id: '2d', label: '精致 2D 风', detail: '细腻线稿与赛璐璐光影，人物更鲜活' },
  { id: 'zine', label: '东方建筑画册', detail: '竖向二分构图，米白纸张与水墨解构' },
  { id: 'custom', label: '自定义提示词', detail: '写下你想要的画面，最多 500 字' },
]

export async function addWatermark(imageDataUrl: string) {
  if (typeof window === 'undefined') return imageDataUrl
  const [image, watermark] = await Promise.all([
    new Promise<HTMLImageElement>((resolve, reject) => { const item = new Image(); item.onload = () => resolve(item); item.onerror = reject; item.src = imageDataUrl }),
    new Promise<HTMLImageElement>((resolve, reject) => { const item = new Image(); item.onload = () => resolve(item); item.onerror = reject; item.src = '/branding/chimelong-watermark.png' }),
  ])
  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth
  canvas.height = image.naturalHeight
  const context = canvas.getContext('2d')!
  context.drawImage(image, 0, 0)
  const width = Math.max(100, Math.min(canvas.width * 0.2, 360))
  const height = width * watermark.naturalHeight / watermark.naturalWidth
  context.globalAlpha = 0.82
  context.drawImage(watermark, Math.max(14, canvas.width * 0.025), canvas.height - height - Math.max(14, canvas.height * 0.025), width, height)
  return canvas.toDataURL('image/png')
}
