import type { PlanRequest, VisitorProfile } from '../../../shared/types/pretrip'

const validCompanions = new Set(['panda', 'tiger', 'koala', 'elephant', 'giraffe', 'gorilla'])
const validScenarios = new Set(['normal', 'peak', 'rain'])
const validPartyTypes = new Set(['family', 'couple', 'friends', 'solo', 'unknown'])
const validPaces = new Set(['slow', 'balanced', 'fast'])
const validAnimals = new Set(['panda', 'giraffe', 'gorilla', 'tiger', 'elephant', 'koala'])
const validDiningChoices = new Set(['qinglong', 'momo', 'panda', 'none'])

function nullableCount(value: unknown): boolean {
  return value === null || (Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 12)
}

function nullableTime(value: unknown): boolean {
  if (value === null) return true
  if (typeof value !== 'string') return false
  const match = /^(\d{2}):(\d{2})$/.exec(value)
  if (!match) return false
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return false
  const total = hours * 60 + minutes
  return total >= 10 * 60 && total <= 22 * 60
}

function isVisitorProfile(value: unknown): value is VisitorProfile {
  if (!value || typeof value !== 'object') return false
  const profile = value as Partial<VisitorProfile>
  return typeof profile.partyType === 'string'
    && validPartyTypes.has(profile.partyType)
    && nullableCount(profile.adultCount)
    && nullableCount(profile.childCount)
    && (profile.pace === null || (typeof profile.pace === 'string' && validPaces.has(profile.pace)))
    && nullableTime(profile.startTime)
    && nullableTime(profile.endTime)
    && Array.isArray(profile.animalPriority)
    && profile.animalPriority.every(item => typeof item === 'string' && validAnimals.has(item))
    && (profile.diningChoice === null
      || (typeof profile.diningChoice === 'string' && validDiningChoices.has(profile.diningChoice)))
    && typeof profile.freeText === 'string'
}

function isPlanRequest(value: unknown): value is PlanRequest {
  if (!value || typeof value !== 'object') return false
  const request = value as Partial<PlanRequest>
  return isVisitorProfile(request.profile)
    && typeof request.companionId === 'string'
    && validCompanions.has(request.companionId)
    && typeof request.scenarioId === 'string'
    && validScenarios.has(request.scenarioId)
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  if (!isPlanRequest(body)) {
    throw createError({ statusCode: 400, statusMessage: '游前规划参数不完整' })
  }

  try {
    const plan = buildPlan(body)
    const aiSummary = await enrichPlanSummary(plan, body)
    if (aiSummary) {
      plan.summary = aiSummary
      plan.mode = 'deepseek-assisted'
    }
    return plan
  }
  catch (error) {
    throw createError({
      statusCode: 422,
      statusMessage: error instanceof Error ? error.message : '暂时无法生成可行路线',
    })
  }
})
