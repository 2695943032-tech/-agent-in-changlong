import { describe, expect, it } from 'vitest'
import type { PlanRequest, RestaurantId, VisitorProfile } from '../shared/types/pretrip'
import { buildPlan, shortestDistance } from '../server/utils/planner'

function profile(overrides: Partial<VisitorProfile> = {}): VisitorProfile {
  return {
    partyType: 'friends',
    adultCount: 2,
    childCount: 0,
    pace: 'balanced',
    startTime: '10:00',
    endTime: '17:30',
    animalPriority: ['tiger', 'panda', 'giraffe', 'elephant', 'koala', 'gorilla'],
    diningChoice: 'panda',
    freeText: '',
    ...overrides,
  }
}

function request(overrides: Partial<PlanRequest> = {}): PlanRequest {
  return {
    companionId: 'tiger',
    scenarioId: 'normal',
    profile: profile(),
    ...overrides,
  }
}

function minutes(time: string): number {
  const [hours = 0, rest = 0] = time.split(':').map(Number)
  return hours * 60 + rest
}

describe('park distance knowledge graph', () => {
  it('calculates the documented shortest distances', () => {
    expect(shortestDistance('entrance', 'panda')).toBe(778)
    expect(shortestDistance('panda', 'restaurant-qinglong')).toBe(539)
    expect(shortestDistance('panda', 'restaurant-momo')).toBe(343)
  })
})

describe('pretrip route planner', () => {
  it('creates a feasible route and inserts the selected restaurant during its opening hours', () => {
    const plan = buildPlan(request())
    const restaurant = plan.stops.find(stop => stop.kind === 'restaurant')

    expect(plan.stops.length).toBeGreaterThanOrEqual(4)
    expect(plan.selectedRestaurant?.id).toBe('panda')
    expect(restaurant).toBeDefined()
    expect(minutes(restaurant!.startTime)).toBeGreaterThanOrEqual(minutes(plan.startTime))
    expect(minutes(restaurant!.endTime)).toBeLessThanOrEqual(minutes(plan.endTime))
    expect(minutes(plan.stops.at(-1)!.endTime)).toBeLessThanOrEqual(minutes(plan.endTime))
  })

  it.each([
    ['qinglong', '10:00', '14:00'],
    ['qinglong', '14:00', '18:00'],
    ['qinglong', '18:00', '22:00'],
    ['momo', '10:00', '14:00'],
    ['momo', '14:00', '18:00'],
    ['momo', '18:00', '22:00'],
    ['panda', '10:00', '14:00'],
    ['panda', '14:00', '18:00'],
    ['panda', '18:00', '22:00'],
  ] satisfies Array<[RestaurantId, string, string]>)('supports %s dining throughout %s—%s', (restaurantId, startTime, endTime) => {
    const plan = buildPlan(request({
      profile: profile({ startTime, endTime, diningChoice: restaurantId }),
    }))
    const restaurant = plan.stops.find(stop => stop.kind === 'restaurant')

    expect(plan.selectedRestaurant?.id).toBe(restaurantId)
    expect(restaurant).toBeDefined()
    expect(minutes(restaurant!.startTime)).toBeGreaterThanOrEqual(minutes(startTime))
    expect(minutes(restaurant!.endTime)).toBeLessThanOrEqual(minutes(endTime))
  })

  it('keeps the highest priorities when time or pace limits the number of stops', () => {
    const priority = ['tiger', 'panda', 'giraffe', 'elephant', 'koala', 'gorilla'] as const
    const plan = buildPlan(request({
      profile: profile({ pace: 'slow', endTime: '14:00', animalPriority: [...priority], diningChoice: 'none' }),
    }))
    const included = new Set(plan.actualAnimalOrder)
    const includedRanks = priority.map((id, index) => included.has(id) ? index + 1 : null).filter(Boolean) as number[]

    expect(includedRanks).toEqual(Array.from({ length: includedRanks.length }, (_, index) => index + 1))
    expect(plan.skippedAnimals.every(item => item.rank > includedRanks.length)).toBe(true)
  })

  it('uses agent defaults when the user skips animal ranking', () => {
    const plan = buildPlan(request({
      companionId: 'panda',
      profile: profile({ animalPriority: [], diningChoice: null, pace: null, startTime: null, endTime: null }),
    }))

    expect(plan.userPriority).toEqual(['panda', 'giraffe', 'gorilla'])
    expect(plan.startTime).toBe('10:00')
    expect(plan.endTime).toBe('22:00')
    expect(plan.selectedRestaurant).toBeNull()
  })

  it('optimizes actual order independently from preference rank', () => {
    const plan = buildPlan(request({ profile: profile({ diningChoice: 'none' }) }))
    expect(plan.userPriority[0]).toBe('tiger')
    expect(plan.actualAnimalOrder[0]).toBe('panda')
  })

  it('changes queue totals for peak traffic', () => {
    const normal = buildPlan(request({ profile: profile({ diningChoice: 'none' }) }))
    const peak = buildPlan(request({ scenarioId: 'peak', profile: profile({ diningChoice: 'none' }) }))
    expect(peak.queueMinutes).toBeGreaterThan(normal.queueMinutes)
  })

  it('rejects a visit shorter than four hours', () => {
    expect(() => buildPlan(request({
      profile: profile({ startTime: '10:00', endTime: '13:30' }),
    }))).toThrow('游玩时长至少需要4小时')
  })

  it('rejects visit times outside the 10:00—22:00 boundary', () => {
    expect(() => buildPlan(request({
      profile: profile({ startTime: '09:45', endTime: '17:30' }),
    }))).toThrow('入园和离园时间须在10:00—22:00之间')

    expect(() => buildPlan(request({
      profile: profile({ startTime: '10:00', endTime: '22:15' }),
    }))).toThrow('入园和离园时间须在10:00—22:00之间')
  })
})
