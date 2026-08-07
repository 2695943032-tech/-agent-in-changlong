import type { Companion } from '../../shared/types/pretrip'
import type { JourneyTicket } from '../../shared/types/journey'

function canvasBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('分享图生成失败')), 'image/png'))
}

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.decoding = 'async'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('票根图片加载失败'))
    image.src = source
  })
}

function roundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  context.beginPath()
  context.roundRect(x, y, width, height, radius)
}

function drawCover(context: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, width: number, height: number, transform: JourneyTicket['coverTransform']) {
  const sourceRatio = image.naturalWidth / image.naturalHeight
  const targetRatio = width / height
  let sourceWidth = image.naturalWidth
  let sourceHeight = image.naturalHeight
  if (sourceRatio > targetRatio) sourceWidth = sourceHeight * targetRatio
  else sourceHeight = sourceWidth / targetRatio
  sourceWidth /= transform.scale
  sourceHeight /= transform.scale
  const sourceX = Math.max(0, Math.min(image.naturalWidth - sourceWidth, (image.naturalWidth - sourceWidth) * transform.x / 100))
  const sourceY = Math.max(0, Math.min(image.naturalHeight - sourceHeight, (image.naturalHeight - sourceHeight) * transform.y / 100))
  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height)
}

function wrapText(context: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines = 2) {
  let line = ''
  const lines: string[] = []
  for (const char of text) {
    const next = line + char
    if (context.measureText(next).width > maxWidth && line) {
      lines.push(line)
      line = char
      if (lines.length === maxLines - 1) break
    }
    else line = next
  }
  if (line && lines.length < maxLines) lines.push(line)
  lines.forEach((value, index) => context.fillText(value, x, y + index * lineHeight))
}

function drawBarcode(context: CanvasRenderingContext2D, value: string, x: number, y: number, width: number, height: number) {
  const hash = [...value].reduce((sum, char) => sum + char.charCodeAt(0), 0)
  let cursor = x
  let index = 0
  context.fillStyle = '#23352d'
  while (cursor < x + width) {
    const bar = 2 + ((hash + index * 17) % 8)
    context.fillRect(cursor, y, bar, height)
    cursor += bar + 3 + ((index * 7) % 4)
    index += 1
  }
}

async function companionImage(companion: Companion) {
  const response = await fetch(companion.chatCharacterImage)
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  try {
    return { image: await loadImage(url), url }
  }
  catch (cause) {
    URL.revokeObjectURL(url)
    throw cause
  }
}

export async function renderHorizontalTicket(ticket: JourneyTicket, companion: Companion, photoBlob?: Blob) {
  const canvas = document.createElement('canvas')
  canvas.width = 1320
  canvas.height = 540
  const context = canvas.getContext('2d')
  if (!context) throw new Error('当前浏览器无法生成票根图片')
  const photoUrl = photoBlob ? URL.createObjectURL(photoBlob) : null
  const fallback = photoUrl ? null : await companionImage(companion)
  const cover = await loadImage(photoUrl ?? fallback!.url)
  try {
    context.fillStyle = '#eee9de'
    context.fillRect(0, 0, canvas.width, canvas.height)
    roundedRect(context, 24, 24, 1272, 492, 38)
    context.save()
    context.clip()
    drawCover(context, cover, 24, 24, 805, 492, ticket.coverTransform)
    const gradient = context.createLinearGradient(24, 0, 829, 0)
    gradient.addColorStop(0, 'rgba(9,31,24,.84)')
    gradient.addColorStop(.72, 'rgba(9,31,24,.18)')
    gradient.addColorStop(1, 'rgba(9,31,24,0)')
    context.fillStyle = gradient
    context.fillRect(24, 24, 805, 492)
    context.fillStyle = '#f2c766'
    context.font = '700 22px "Microsoft YaHei", sans-serif'
    context.fillText(ticket.subtitle ?? '动物园探索纪念票', 72, 92)
    context.fillStyle = '#fffaf0'
    context.font = '700 51px "Noto Serif SC", "Microsoft YaHei", serif'
    wrapText(context, ticket.title, 72, 344, 610, 61, 2)
    if (ticket.showMessage && ticket.message) {
      context.fillStyle = 'rgba(255,255,255,.78)'
      context.font = '24px "Microsoft YaHei", sans-serif'
      wrapText(context, ticket.message, 72, 458, 600, 34, 2)
    }
    context.restore()

    context.fillStyle = '#f8f0de'
    context.fillRect(829, 24, 467, 492)
    context.setLineDash([12, 12])
    context.strokeStyle = 'rgba(37,54,46,.35)'
    context.lineWidth = 2
    context.beginPath()
    context.moveTo(846, 40)
    context.lineTo(846, 500)
    context.stroke()
    context.setLineDash([])
    context.fillStyle = companion.accent
    context.font = '900 21px ui-monospace, monospace'
    context.fillText('CHIMELONG JOURNEY', 885, 78)
    context.fillStyle = '#26372f'
    context.font = '700 31px "Microsoft YaHei", sans-serif'
    context.fillText(ticket.visitDate.replaceAll('-', '.'), 885, 134)
    const facts = [
      ['旅程伙伴', companion.name],
      ['到访展区', `${ticket.statsSnapshot.visitedZoneCount} 个`],
      ['奇遇徽章', `${ticket.statsSnapshot.earnedBadgeCount} 枚`],
      ['累计步行', `${(ticket.statsSnapshot.walkingDistanceMeters / 1000).toFixed(1)} km`],
    ]
    facts.forEach(([label, value], index) => {
      const y = 195 + index * 48
      context.fillStyle = '#85877f'
      context.font = '18px "Microsoft YaHei", sans-serif'
      context.fillText(label!, 885, y)
      context.fillStyle = '#26372f'
      context.font = '700 21px "Microsoft YaHei", sans-serif'
      context.textAlign = 'right'
      context.fillText(value!, 1238, y)
      context.textAlign = 'left'
    })
    drawBarcode(context, ticket.ticketNumber, 885, 402, 350, 44)
    context.fillStyle = '#6d756f'
    context.font = '17px ui-monospace, monospace'
    context.textAlign = 'center'
    context.fillText(ticket.ticketNumber, 1060, 475)
    context.textAlign = 'left'
    if (ticket.audio) {
      context.fillStyle = companion.accent
      context.font = '700 15px "Microsoft YaHei", sans-serif'
      context.fillText('◉ 内含一段旅行声音 · 应用内播放', 885, 501)
    }
    return await canvasBlob(canvas)
  }
  finally {
    if (photoUrl) URL.revokeObjectURL(photoUrl)
    if (fallback) URL.revokeObjectURL(fallback.url)
  }
}

export async function renderStoryTicket(ticket: JourneyTicket, companion: Companion, photoBlob?: Blob) {
  const canvas = document.createElement('canvas')
  canvas.width = 1080
  canvas.height = 1920
  const context = canvas.getContext('2d')
  if (!context) throw new Error('当前浏览器无法生成故事分享图')
  const photoUrl = photoBlob ? URL.createObjectURL(photoBlob) : null
  const fallback = photoUrl ? null : await companionImage(companion)
  const cover = await loadImage(photoUrl ?? fallback!.url)
  try {
    const gradient = context.createLinearGradient(0, 0, 0, canvas.height)
    gradient.addColorStop(0, '#102f27')
    gradient.addColorStop(.55, '#27493c')
    gradient.addColorStop(1, '#efe6d4')
    context.fillStyle = gradient
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.strokeStyle = 'rgba(242,199,102,.26)'
    context.lineWidth = 2
    context.strokeRect(58, 58, 964, 1804)
    context.fillStyle = '#efc96f'
    context.font = '900 27px ui-monospace, monospace'
    context.fillText('CHIMELONG · MEMORY TICKET', 88, 125)
    context.fillStyle = '#fffaf0'
    context.font = '700 76px "Noto Serif SC", "Microsoft YaHei", serif'
    wrapText(context, ticket.title, 88, 250, 840, 90, 2)
    context.fillStyle = 'rgba(255,255,255,.64)'
    context.font = '28px "Microsoft YaHei", sans-serif'
    context.fillText(`${ticket.visitDate.replaceAll('-', '.')} · 和${companion.name}一起`, 90, 440)
    roundedRect(context, 88, 510, 904, 820, 32)
    context.save()
    context.clip()
    drawCover(context, cover, 88, 510, 904, 820, ticket.coverTransform)
    context.restore()
    context.setLineDash([13, 11])
    context.strokeStyle = '#efc96f'
    context.lineWidth = 5
    context.strokeRect(71, 493, 938, 854)
    context.setLineDash([])
    context.fillStyle = '#26372f'
    context.font = '700 34px "Microsoft YaHei", sans-serif'
    wrapText(context, ticket.message ?? '下一次，也一起出发。', 88, 1435, 850, 52, 3)
    const stats = `到访 ${ticket.statsSnapshot.visitedZoneCount} 区  ·  完成 ${ticket.statsSnapshot.completedTaskCount} 个任务  ·  收集 ${ticket.statsSnapshot.earnedBadgeCount} 枚徽章  ·  ${(ticket.statsSnapshot.walkingDistanceMeters / 1000).toFixed(1)} km`
    context.fillStyle = '#536159'
    context.font = '25px "Microsoft YaHei", sans-serif'
    context.fillText(stats, 88, 1630)
    drawBarcode(context, ticket.ticketNumber, 88, 1700, 500, 58)
    context.fillStyle = '#2d3c35'
    context.font = '21px ui-monospace, monospace'
    context.fillText(ticket.ticketNumber, 88, 1800)
    context.fillStyle = companion.accent
    context.font = '700 24px "Microsoft YaHei", sans-serif'
    context.textAlign = 'right'
    context.fillText(`${companion.name}的旅行印章`, 992, 1800)
    context.textAlign = 'left'
    return await canvasBlob(canvas)
  }
  finally {
    if (photoUrl) URL.revokeObjectURL(photoUrl)
    if (fallback) URL.revokeObjectURL(fallback.url)
  }
}

export function downloadTicketBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function shareTicketBlob(blob: Blob, filename: string, text: string) {
  const file = new File([blob], filename, { type: blob.type })
  if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
    await navigator.share({ title: '我的动物园奇遇票根', text, files: [file] })
    return true
  }
  return false
}
