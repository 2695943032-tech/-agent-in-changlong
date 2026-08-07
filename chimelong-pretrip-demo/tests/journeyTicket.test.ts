import { describe, expect, it } from 'vitest'
import { parkMapPoints } from '../shared/data/parkGeometry.generated'
import { parkServices } from '../shared/data/parkServices'
import { navigationRouteFromPosition } from '../shared/utils/parkGeo'
import { buildJourneyTicket, buildTicketNumber, createDemoJourneyRecord, createJourneyRecord, mergeParkStateIntoJourneyRecord, recoverCompletedJourneyFromPlan } from '../app/utils/journeyRecord'
import { beginParkJourney, completeZoneTask, visitParkZone } from '../app/utils/parkJourney'

describe('JourneyRecord 与奇遇票根', () => {
  it('同一段旅程始终生成相同票根编号', () => {
    const journey = createJourneyRecord({ companionId: 'panda', plannedZoneIds: ['panda'] })
    expect(buildTicketNumber(journey)).toBe(buildTicketNumber({ ...journey }))
    expect(buildTicketNumber(journey)).toMatch(/^ZOO-\d{8}-[A-Z0-9]{6}$/)
  })

  it('票根事实快照来自 JourneyRecord', () => {
    const journey = createDemoJourneyRecord()
    const ticket = buildJourneyTicket(journey)
    expect(ticket.statsSnapshot.visitedZoneCount).toBe(6)
    expect(ticket.statsSnapshot.completedTaskCount).toBe(4)
    expect(ticket.statsSnapshot.earnedBadgeCount).toBe(3)
    expect(ticket.statsSnapshot.walkingDistanceMeters).toBe(3800)
  })

  it('可从园中持久化状态追回到访、任务、徽章、伙伴与里程', () => {
    const journey = createJourneyRecord({ companionId: 'koala', plannedZoneIds: [] })
    let park = beginParkJourney('koala', 'follow', ['panda', 'giraffe'])
    park = visitParkZone(park, 'panda', 'panda')
    park = visitParkZone(park, 'giraffe', 'giraffe')
    park = completeZoneTask(park, 'panda', 'panda-observe')
    park = { ...park, totalWalkedMeters: 1280 }

    const recovered = mergeParkStateIntoJourneyRecord(journey, park)

    expect(recovered.planSnapshot.zoneIds).toEqual(['panda', 'giraffe'])
    expect(recovered.actualJourney.visitedZoneIds).toEqual(['panda', 'giraffe'])
    expect(recovered.actualJourney.completedTaskIds).toEqual(['panda-observe'])
    expect(recovered.actualJourney.badgeZoneIds).toEqual(['panda'])
    expect(recovered.actualJourney.unlockedCompanionIds).toEqual(['koala', 'panda', 'giraffe'])
    expect(recovered.actualJourney.walkingDistanceMeters).toBe(1280)
    expect(recovered.events.filter(event => event.type === 'zone_arrived')).toHaveLength(2)
  })

  it('重复同步园中状态不会重复生成事实或事件', () => {
    const journey = createJourneyRecord({ companionId: 'panda', plannedZoneIds: ['panda'] })
    const park = visitParkZone(beginParkJourney('panda', 'follow', ['panda']), 'panda', 'panda')
    const first = mergeParkStateIntoJourneyRecord(journey, park)
    const second = mergeParkStateIntoJourneyRecord(first, park)

    expect(second.actualJourney.visitedZoneIds).toEqual(['panda'])
    expect(second.events.filter(event => event.type === 'zone_arrived')).toHaveLength(1)
  })

  it('可透明恢复旧版已完成但未写入抵达事件的路线事实', () => {
    const journey = createJourneyRecord({
      companionId: 'koala',
      plannedZoneIds: ['panda', 'giraffe', 'tiger'],
      plannedWalkingMeters: 1860,
    })
    journey.status = 'completed'
    journey.completedAt = '2026-07-19T17:00:00+08:00'

    const recovered = recoverCompletedJourneyFromPlan(journey)
    const repeated = recoverCompletedJourneyFromPlan(recovered)

    expect(recovered.actualJourney.visitedZoneIds).toEqual(['panda', 'giraffe', 'tiger'])
    expect(recovered.actualJourney.unlockedCompanionIds).toEqual(['koala', 'panda', 'giraffe', 'tiger'])
    expect(recovered.actualJourney.walkingDistanceMeters).toBe(1860)
    expect(recovered.actualJourney.completedTaskIds).toEqual([])
    expect(recovered.actualJourney.badgeZoneIds).toEqual([])
    expect(recovered.events.filter(event => event.data?.recoveredFromPlan === true)).toHaveLength(1)
    expect(repeated).toBe(recovered)
  })

  it('没有计划或仍在进行中的旅程不会被推断为已到访', () => {
    const active = createJourneyRecord({ companionId: 'panda', plannedZoneIds: ['panda'] })
    const completedWithoutPlan = createJourneyRecord({ companionId: 'panda', plannedZoneIds: [] })
    completedWithoutPlan.status = 'completed'

    expect(recoverCompletedJourneyFromPlan(active)).toBe(active)
    expect(recoverCompletedJourneyFromPlan(completedWithoutPlan)).toBe(completedWithoutPlan)
  })

  it('一段旅程默认只对应一个稳定主票根 id', () => {
    const journey = createDemoJourneyRecord()
    expect(buildJourneyTicket(journey).id).toBe(buildJourneyTicket(journey).id)
    expect(buildJourneyTicket(journey).id).toBe(`ticket-${journey.id}`)
  })
})

describe('服务点实时步行导航', () => {
  it('包含 GIS 点位和明确标注的演示配置点', () => {
    expect(parkServices.filter(item => item.source === 'gis').length).toBeGreaterThanOrEqual(10)
    expect(parkServices.filter(item => item.source === 'demo').length).toBe(4)
  })

  it('从入口到熊猫餐厅生成真实路网路径、距离和时间', () => {
    const restaurant = parkServices.find(item => item.id === 'service-dining-panda')!
    const route = navigationRouteFromPosition(parkMapPoints.entrance, restaurant)
    expect(route.path.length).toBeGreaterThan(2)
    expect(route.distanceMeters).toBeGreaterThan(0)
    expect(route.walkingMinutes).toBeGreaterThan(0)
    expect(route.target.id).toBe(restaurant.id)
  })
})
