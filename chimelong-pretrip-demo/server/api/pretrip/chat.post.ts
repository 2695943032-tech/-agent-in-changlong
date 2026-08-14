import type { ChatAction, ChatStep, ChatTurnRequest, TuantuanReminder } from '../../../shared/types/pretrip'
import { companions } from '../../data/catalog'

const validSteps = new Set(['party', 'pace', 'time', 'gates', 'dining', 'supplement', 'confirm'])

function actionsForStep(step: ChatStep): { actions: ChatAction[], reminder?: TuantuanReminder } {
  const defaults: Record<ChatStep, ChatAction[]> = {
    party: [{ id: 'park-map', label: '查看园区地图', type: 'view-map', variant: 'secondary' }],
    pace: [{ id: 'park-map', label: '查看园区地图', type: 'view-map', variant: 'secondary' }],
    time: [{ id: 'show-schedule', label: '查看下一场演出', type: 'show-schedule', variant: 'secondary' }],
    gates: [{ id: 'park-map', label: '查看园区地图', type: 'view-map', variant: 'primary' }],
    dining: [{ id: 'child-menu', label: '查看儿童餐', type: 'view-menu', variant: 'primary' }],
    supplement: [{ id: 'park-map', label: '查看服务地图', type: 'view-map', variant: 'secondary' }],
    confirm: [{ id: 'add-plan', label: '加入今日计划', type: 'add-plan', variant: 'primary' }],
  }
  if (step === 'time') return { actions: defaults[step], reminder: { type: 'show', reason: '团团会结合入园时间、当前位置和步行时长，在开演前 30 分钟提醒你。' } }
  if (step === 'dining') return { actions: defaults[step], reminder: { type: 'dining', reason: '亲子出游时，儿童餐供应与排队时间会直接影响下一段行程。' } }
  return { actions: defaults[step] }
}

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
    ...(body.step === 'gates' ? { recommendedRestaurantId: recommendRestaurant(body.profile) } : {}),
    ...actionsForStep(body.step),
  }
})
