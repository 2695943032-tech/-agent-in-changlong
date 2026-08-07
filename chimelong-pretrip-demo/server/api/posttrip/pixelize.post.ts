import { transformPhotoToPixelArt } from '../../utils/imageTransform'

const MAX_IMAGE_BYTES = 8 * 1024 * 1024

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
  if (!image) throw createError({ statusCode: 400, statusMessage: '请先上传一张真实照片' })
  if (!image.type?.startsWith('image/')) throw createError({ statusCode: 415, statusMessage: '仅支持图片文件' })
  if (image.data.byteLength > MAX_IMAGE_BYTES) throw createError({ statusCode: 413, statusMessage: '图片不能超过 8MB' })

  try {
    return await transformPhotoToPixelArt({
      data: image.data,
      type: image.type,
      filename: image.filename || 'visitor-photo.png',
    })
  }
  catch (cause) {
    const message = cause instanceof Error ? cause.message : 'IMAGE_API_UNKNOWN'
    throw createError({
      statusCode: message === 'IMAGE_API_NOT_CONFIGURED' ? 503 : message === 'IMAGE_API_TIMEOUT' ? 504 : 502,
      statusMessage: toClientMessage(message),
    })
  }
})
