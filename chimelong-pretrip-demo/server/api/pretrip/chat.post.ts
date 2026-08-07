import type { ChatTurnRequest } from '../../../shared/types/pretrip'
import { companions } from '../../data/catalog'

const validSteps = new Set(['party', 'pace', 'time', 'animals', 'dining', 'supplement', 'confirm'])

export default defineEventHandler(async (event) => {
  const body = await readBody<ChatTurnRequest>(event)
  const companion = companions.find(item => item.id === body?.companionId)
  if (!companion || !validSteps.has(body?.step) || !body?.profile || typeof body?.answerSummary !== 'string') {
    throw createError({ statusCode: 400, statusMessage: '对话参数不完整' })
  }

  const aiMessage = await generateAgentReply(companion, body.step, body.profile, body.answerSummary)
  return {
    message: aiMessage ?? fallbackAgentReply(companion, body.step, body.answerSummary),
    mode: aiMessage ? 'deepseek' : 'template',
    ...(body.step === 'animals' ? { recommendedRestaurantId: recommendRestaurant(body.profile) } : {}),
  }
})
