import { transformPhotoToPixelArt, type ImageStyleId } from '../../utils/imageTransform'

const MAX_IMAGE_BYTES = 8 * 1024 * 1024
const MAX_GENERATIONS = 9
const VALID_STYLES = new Set<ImageStyleId>(['8bit', 'ancient', '2d', 'zine', 'custom'])

function toClientMessage(message: string) {
  if (message === 'IMAGE_API_NOT_CONFIGURED') return '像素照片接口尚未配置，请先填写 IMAGE API 的地址、模型和密钥'
  if (message === 'IMAGE_API_TIMEOUT') return '图片转换时间较长，请稍后重试；如仍失败，请检查服务器 Nginx/PM2 超时时间'
  if (message === 'IMAGE_RESULT_FETCH_FAILED') return '图片生成成功，但读取生成结果失败'
  if (message === 'IMAGE_API_EMPTY_RESULT') return '图片转换服务没有返回可用图片'
  if (message.startsWith('IMAGE_API_HTTP_')) return `图片转换服务返回异常：${message.replace('IMAGE_API_HTTP_', '')}`
  return '像素照片转换失败'
}

export default defineEventHandler(async (event) => {
  const parts = await readMultipartFormData(event)
  const image = parts?.find(part => part.name === 'image' && part.filename)
  const stylePart = parts?.find(part => part.name === 'style')
  const promptPart = parts?.find(part => part.name === 'prompt')
  const style = (stylePart?.data?.toString() || '8bit') as ImageStyleId
  const prompt = promptPart?.data?.toString() || ''
  if (!VALID_STYLES.has(style)) throw createError({ statusCode: 400, statusMessage: '不支持的图片风格' })
  if (style === 'custom' && prompt.length > 500) throw createError({ statusCode: 400, statusMessage: '自定义提示词最多 500 字' })
  const count = Number(getCookie(event, 'chimelong-generation-count') || 0)
  if (count >= MAX_GENERATIONS) throw createError({ statusCode: 402, statusMessage: '本次体验最多生成 9 张图片，继续生成请购买套餐' })
  if (!image) throw createError({ statusCode: 400, statusMessage: '请先上传一张真实照片' })
  if (!image.type?.startsWith('image/')) throw createError({ statusCode: 415, statusMessage: '仅支持图片文件' })
  if (image.data.byteLength > MAX_IMAGE_BYTES) throw createError({ statusCode: 413, statusMessage: '图片不能超过 8MB' })

  try {
    const result = await transformPhotoToPixelArt({
      data: image.data,
      type: image.type,
      filename: image.filename || 'visitor-photo.png',
    }, { style, prompt })
    setCookie(event, 'chimelong-generation-count', String(count + 1), { maxAge: 60 * 60 * 24, sameSite: 'lax', httpOnly: false })
    return { ...result, remaining: MAX_GENERATIONS - count - 1 }
  }
  catch (cause) {
    const message = cause instanceof Error ? cause.message : 'IMAGE_API_UNKNOWN'
    throw createError({
      statusCode: message === 'IMAGE_API_NOT_CONFIGURED' ? 503 : message === 'IMAGE_API_TIMEOUT' ? 504 : 502,
      statusMessage: toClientMessage(message),
    })
  }
})
