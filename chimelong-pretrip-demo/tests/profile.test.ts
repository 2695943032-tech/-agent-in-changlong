import { reactive } from 'vue'
import { describe, expect, it } from 'vitest'
import { cloneVisitorProfile, formatPlanRequestError } from '../app/utils/profile'
import type { VisitorProfile } from '../shared/types/pretrip'

describe('cloneVisitorProfile', () => {
  it('copies a deeply reactive profile into plain serializable data', () => {
    const profile = reactive<VisitorProfile>({
      partyType: 'family',
      adultCount: 2,
      childCount: 1,
      pace: 'slow',
      startTime: '10:00',
      endTime: '22:00',
      animalPriority: ['panda', 'giraffe'],
      diningChoice: 'panda',
      freeText: '孩子下午容易累',
    })

    // Object spread is what previously preserved the proxied nested array.
    const spreadProfile = reactive({ ...profile }) as VisitorProfile
    const clone = cloneVisitorProfile(spreadProfile)

    expect(clone).toEqual(profile)
    expect(() => structuredClone(clone)).not.toThrow()
    expect(clone.animalPriority).not.toBe(profile.animalPriority)
  })
})

describe('formatPlanRequestError', () => {
  it('shows the actionable Nitro error instead of the generic HTTP status', () => {
    const error = Object.assign(new Error('[POST] "/api/pretrip/plan": 422 Unprocessable Entity'), {
      data: {
        statusCode: 422,
        statusMessage: '游玩时长至少需要4小时',
      },
    })

    expect(formatPlanRequestError(error)).toBe('游玩时长至少需要4小时')
  })

  it('uses a friendly fallback when no server detail is available', () => {
    expect(formatPlanRequestError(new Error('[POST] "/api/pretrip/plan": 422 Unprocessable Entity')))
      .toBe('路线生成失败，请检查游玩时间后重试。')
  })
})
