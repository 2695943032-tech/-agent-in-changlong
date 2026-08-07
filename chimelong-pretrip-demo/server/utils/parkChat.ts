import type { AnimalId, CompanionId } from '../../shared/types/pretrip'
import type { ParkAdjustmentAction, ParkChatRequest, ParkChatResponse, ParkNavigationTarget } from '../../shared/types/park'
import { parkMapPoints } from '#shared/data/parkGeometry.generated'
import { parkServices } from '#shared/data/parkServices'
import { haversineMeters, navigationRouteFromPosition, optimizeZoneOrder, routeDistanceMeters, walkingMinutes } from '#shared/utils/parkGeo'
import { animals, companions } from '../data/catalog'
import { zoneKnowledge } from '../data/zoneKnowledge'
import { callConfiguredAI, type AIMessage } from './ai'

const histories = new Map<string, AIMessage[]>()
const recentRequests = new Map<string, { at: number, promise: Promise<ParkChatResponse> }>()
const forbidden = /(系统\s*(提示|指令)?|角色\s*指令|prompt|system\s*prompt|忽略.{0,8}(规则|指令)|开发者模式)/i

export function containsPromptInjection(text: string) {
  return forbidden.test(text)
}

export function classifyParkAdjustment(text: string): ParkAdjustmentAction {
  if (/(累|休息|走不动|脚疼|坐一下)/.test(text)) return 'rest'
  if (/(跳过|不想去|不看了|取消下一站)/.test(text)) return 'skip-next'
  if (/(最近|就近|赶时间|来不及)/.test(text)) return 'nearest-next'
  if (/(排队|人多|拥堵|封路|下雨|调整|改路线)/.test(text)) return 'reroute'
  return 'none'
}

export function sanitizeParkReply(reply: string) {
  return reply
    .replace(/^\s*(?:[（(【\[][^）)】\]]{1,80}[）)】\]]\s*)+/u, '')
    .replace(/^\s*(?:动作|旁白|提示词|语气|表情)\s*[:：]\s*/iu, '')
    .trim()
}

function pendingAfterAction(request: ParkChatRequest, action: ParkAdjustmentAction): AnimalId[] {
  const complete = new Set(request.completedZoneIds)
  const pending = request.routeZoneIds.filter(id => !complete.has(id))
  if (action === 'skip-next') return pending.slice(1)
  if (action === 'reroute' || action === 'nearest-next') return optimizeZoneOrder(request.currentZoneId ?? 'entrance', pending)
  return pending
}

function resolveNavigationTarget(request: ParkChatRequest): ParkNavigationTarget | null {
  const question = request.question.replaceAll(/\s/g, '').toLowerCase()
  const explicitlyNavigating = /(带我|想去|前往|怎么走|导航|路线|最近|在哪|找一个|找下|找家)/.test(question)
  const serviceMatches = parkServices.filter(service => [service.name, ...service.aliases].some(alias => question.includes(alias.toLowerCase())))
  if (serviceMatches.length) {
    const sorted = request.currentPosition
      ? serviceMatches.toSorted((a, b) => haversineMeters(request.currentPosition!, a) - haversineMeters(request.currentPosition!, b))
      : serviceMatches
    return sorted[0] ?? null
  }
  if (!explicitlyNavigating) return null
  const animal = animals.find(item => question.includes(item.name.toLowerCase()) || question.includes(item.id))
  return animal ? {
    id: animal.id,
    kind: 'animal',
    name: animal.name,
    longitude: animal.longitude,
    latitude: animal.latitude,
  } : null
}

function navigationStart(request: ParkChatRequest) {
  if (request.currentPosition) return request.currentPosition
  const point = parkMapPoints[(request.currentZoneId ?? 'entrance') as keyof typeof parkMapPoints]
  return { longitude: point.longitude, latitude: point.latitude }
}

function fallbackReply(companionId: CompanionId, action: ParkAdjustmentAction, nextName: string | null, question: string, knowledge: (typeof zoneKnowledge)[AnimalId], navigationTarget: ParkNavigationTarget | null, navigationDistance: number | null) {
  const name = companions.find(item => item.id === companionId)?.name ?? '奇遇伙伴'
  if (navigationTarget) return `${name}收到，已经把去${navigationTarget.name}的步行路线标在地图上，约 ${navigationDistance ?? 0} 米。跟着红色路线走就好，我会继续看着你的位置。`
  if (/(吃|食物|食谱|喂什么)/.test(question)) return knowledge.dailyFood
  if (/(习性|生活|休息|睡|活动)/.test(question) && action === 'none') return knowledge.lifeHabits
  if (/(餐厅|吃饭|餐饮|附近)/.test(question)) return knowledge.recommendations
  if (action === 'rest') return `${name}收到，我先把休息加入行程。坐稳、补水，准备好后我们再出发。`
  if (action === 'skip-next') return `${name}已跳过原来的下一站，接下来优先前往${nextName ?? '附近展区'}。`
  if (action === 'reroute' || action === 'nearest-next') return `${name}已按真实步行路网重排，下一站是${nextName ?? '附近展区'}。`
  return `${name}在。把你看到的情况告诉我，我会结合当前位置和园区资料给你具体建议。`
}

async function buildReply(request: ParkChatRequest): Promise<ParkChatResponse> {
  const action = classifyParkAdjustment(request.question)
  const navigationTarget = resolveNavigationTarget(request)
  const navigationRoute = navigationTarget ? navigationRouteFromPosition(navigationStart(request), navigationTarget) : null
  const pending = pendingAfterAction(request, action)
  const nextZoneId = pending[0] ?? null
  const currentNode = request.currentZoneId ?? 'entrance'
  const distanceMeters = navigationRoute?.distanceMeters ?? (nextZoneId ? routeDistanceMeters(currentNode, nextZoneId) : null)
  const nextName = animals.find(item => item.id === nextZoneId)?.name ?? null
  const knowledge = request.currentZoneId ? zoneKnowledge[request.currentZoneId] : zoneKnowledge[request.companionId]
  const history = histories.get(request.sessionId) ?? []
  const system: AIMessage = {
    role: 'system',
    content: `你是长隆游中伙伴。当前角色：${knowledge.persona}。以下配置是唯一权威资料：\n每日食谱：${knowledge.dailyFood}\n生活习性：${knowledge.lifeHabits}\n周边建议：${knowledge.recommendations}\n回答必须具体、简短、自然，只回答用户问题；不得编造价格、开放时间、动物状态或额外设施，不要重复欢迎语。不要输出括号里的动作描写、舞台说明、内心旁白、表情提示或提示词，第一句话必须直接回答用户。当前路线计算事实：${navigationTarget ? `用户要去${navigationTarget.name}，地图已生成红色步行路线，距离${distanceMeters ?? 0}米` : `下一站${nextName ?? '暂无'}，步行距离${distanceMeters ?? 0}米`}。如果已导航，明确告诉用户路线已经显示在地图。`,
  }
  const user: AIMessage = { role: 'user', content: request.question.slice(0, 300) }
  // Navigation distance and ETA are calculated facts. Do not let the language
  // model restate them differently from the route engine.
  const exactNavigationReply = navigationTarget
    ? fallbackReply(request.companionId, action, nextName, request.question, knowledge, navigationTarget, distanceMeters)
    : null
  const aiReply = exactNavigationReply ? null : await callConfiguredAI([system, ...history.slice(-8), user], 220)
  const rawReply = exactNavigationReply ?? aiReply ?? fallbackReply(request.companionId, action, nextName, request.question, knowledge, navigationTarget, distanceMeters)
  const reply = sanitizeParkReply(rawReply) || fallbackReply(request.companionId, action, nextName, request.question, knowledge, navigationTarget, distanceMeters)
  const assistant: AIMessage = { role: 'assistant', content: reply }
  histories.set(request.sessionId, [...history, user, assistant].slice(-8))
  return {
    reply,
    mode: aiReply ? 'deepseek' : 'template',
    action,
    nextZoneId,
    distanceMeters,
    walkingMinutes: distanceMeters === null ? null : walkingMinutes(distanceMeters),
    navigationTarget,
  }
}

export function answerParkChat(request: ParkChatRequest) {
  const key = `${request.sessionId}:${request.question.trim().toLowerCase()}`
  const cached = recentRequests.get(key)
  if (cached && Date.now() - cached.at < 2000) return cached.promise
  const promise = buildReply(request).finally(() => {
    setTimeout(() => recentRequests.delete(key), 2100)
  })
  recentRequests.set(key, { at: Date.now(), promise })
  return promise
}
