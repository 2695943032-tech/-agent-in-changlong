import type {
  ChatStep,
  Companion,
  PlanRequest,
  PlanResponse,
  VisitorProfile,
} from '../../shared/types/pretrip'

export interface AIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>
}

export async function callConfiguredAI(messages: AIMessage[], maxTokens: number): Promise<string | null> {
  const config = useRuntimeConfig()
  if (!config.aiApiKey) return null

  const controller = new AbortController()
  const timeoutMs = Number(config.aiTimeoutMs) || 8000
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  const isDeepSeek = String(config.aiProvider).toLowerCase() === 'deepseek'

  try {
    const response = await $fetch<ChatCompletionResponse>(
      `${String(config.aiBaseUrl).replace(/\/$/, '')}/chat/completions`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.aiApiKey}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: {
          model: config.aiModel,
          messages,
          max_tokens: maxTokens,
          temperature: 0.45,
          stream: false,
          ...(isDeepSeek ? { thinking: { type: 'disabled' } } : {}),
        },
      },
    )

    return response.choices?.[0]?.message?.content?.trim() || null
  }
  catch {
    return null
  }
  finally {
    clearTimeout(timeout)
  }
}

function profileFacts(profile: VisitorProfile): Record<string, unknown> {
  return {
    partyType: profile.partyType,
    adultCount: profile.adultCount,
    childCount: profile.childCount,
    pace: profile.pace,
    visitTime: profile.startTime && profile.endTime ? `${profile.startTime}-${profile.endTime}` : null,
    animalPriority: profile.animalPriority,
    diningChoice: profile.diningChoice,
    freeText: profile.freeText.slice(0, 200),
  }
}

export async function generateAgentReply(
  companion: Companion,
  step: ChatStep,
  profile: VisitorProfile,
  answerSummary: string,
): Promise<string | null> {
  return callConfiguredAI([
    {
      role: 'system',
      content: `你是长隆游前动物伙伴“${companion.name}”，身份是${companion.personality}。只根据用户已经选择的事实回应，不得编造距离、排队、预约或价格。用自然中文回复一句，20到45字，保持角色口吻，不要提出下一个问题。`,
    },
    {
      role: 'user',
      content: JSON.stringify({ step, answerSummary, profile: profileFacts(profile) }),
    },
  ], 100)
}

export async function enrichPlanSummary(plan: PlanResponse, request: PlanRequest): Promise<string | null> {
  return callConfiguredAI([
    {
      role: 'system',
      content: '你是长隆游前路线说明助手。只润色给定事实，不得新增景点、距离、时间、排队数据、预约或承诺。输出不超过90字的中文总结。',
    },
    {
      role: 'user',
      content: JSON.stringify({
        companion: plan.companion.name,
        profile: profileFacts(request.profile),
        ruleSummary: plan.summary,
        walkingMeters: plan.walkingMeters,
        stops: plan.stops.map(stop => ({ name: stop.name, startTime: stop.startTime, reason: stop.reason })),
      }),
    },
  ], 180)
}
