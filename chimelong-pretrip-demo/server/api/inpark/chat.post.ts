import type { ParkChatRequest } from '../../../shared/types/park'
import { companions } from '../../data/catalog'
import { answerParkChat, containsPromptInjection } from '../../utils/parkChat'

export default defineEventHandler(async (event) => {
  const body = await readBody<ParkChatRequest>(event)
  const question = body?.question?.trim()
  if (!question || question.length > 300) throw createError({ statusCode: 400, statusMessage: '问题长度无效' })
  if (!companions.some(item => item.id === body.companionId)) throw createError({ statusCode: 400, statusMessage: '伙伴不存在' })
  if (containsPromptInjection(question)) throw createError({ statusCode: 400, statusMessage: '请直接描述游园问题，不要输入系统或角色指令' })
  return answerParkChat({ ...body, question })
})
