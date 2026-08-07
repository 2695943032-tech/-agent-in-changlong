import type { VisitorProfile } from '../../shared/types/pretrip'

/**
 * Copy the serializable visitor profile without passing Vue proxies to
 * structuredClone. Nested arrays can remain proxied after an object spread,
 * which causes DataCloneError in Chromium.
 */
export function cloneVisitorProfile(profile: VisitorProfile): VisitorProfile {
  return {
    partyType: profile.partyType,
    adultCount: profile.adultCount,
    childCount: profile.childCount,
    children: profile.children.map(child => ({ ...child })),
    pace: profile.pace,
    startTime: profile.startTime,
    endTime: profile.endTime,
    animalPriority: [...profile.animalPriority],
    diningChoice: profile.diningChoice,
    freeText: profile.freeText,
  }
}

const DEFAULT_PLAN_ERROR = '路线生成失败，请检查游玩时间后重试。'

/**
 * Extract the actionable message returned by Nitro/$fetch instead of exposing
 * a generic string such as "[POST] /api/pretrip/plan: 422" to visitors.
 */
export function formatPlanRequestError(error: unknown): string {
  if (!error || typeof error !== 'object') return DEFAULT_PLAN_ERROR

  const failure = error as {
    data?: { statusMessage?: unknown, message?: unknown }
    statusMessage?: unknown
    message?: unknown
  }
  const candidates = [
    failure.data?.statusMessage,
    failure.data?.message,
    failure.statusMessage,
    failure.message,
  ]

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim() && !candidate.startsWith('[POST]')) {
      return candidate.trim()
    }
  }

  return DEFAULT_PLAN_ERROR
}
