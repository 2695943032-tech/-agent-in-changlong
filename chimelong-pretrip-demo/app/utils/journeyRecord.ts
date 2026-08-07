import type { AnimalId, CompanionId, VisitorProfile } from '../../shared/types/pretrip'
import type { JourneyCollection, JourneyEvent, JourneyRecord, JourneyTicket, JourneyTicketStatsSnapshot, JourneyTicketTemplate } from '../../shared/types/journey'
import type { ParkJourneyState } from '../../shared/types/park'
import { routeSummary } from '#shared/utils/parkGeo'

export type ParkJourneySnapshot = {
  readonly [Key in keyof ParkJourneyState]: ParkJourneyState[Key] extends Array<infer Item>
    ? readonly Item[]
    : ParkJourneyState[Key]
}

const companionNames: Record<CompanionId, string> = {
  panda: '团团',
  tiger: '凯凯',
  koala: '悠米',
  elephant: '澜澜',
  giraffe: '长乐',
  gorilla: '阿悟',
}

export function emptyJourneyCollection(): JourneyCollection {
  return { schemaVersion: 2, activeJourneyId: null, records: [] }
}

function dateLabel(date = new Date()) {
  return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(date)
    .replaceAll('/', '-')
}

export function createJourneyRecord(options: {
  companionId: CompanionId
  plannedZoneIds: AnimalId[]
  planId?: string
  plannedWalkingMeters?: number
  visitorProfile?: VisitorProfile
  startedAt?: string
}): JourneyRecord {
  const startedAt = options.startedAt ?? new Date().toISOString()
  const id = `journey-${startedAt.replace(/\D/g, '').slice(0, 14)}-${Math.random().toString(36).slice(2, 7)}`
  return {
    schemaVersion: 2,
    id,
    status: 'active',
    zooName: '长隆野生动物世界',
    visitDate: dateLabel(new Date(startedAt)),
    startedAt,
    primaryCompanionId: options.companionId,
    visitorProfile: options.visitorProfile,
    planSnapshot: {
      planId: options.planId,
      zoneIds: [...options.plannedZoneIds],
      walkingMeters: options.plannedWalkingMeters ?? 0,
      visitorProfile: options.visitorProfile,
    },
    actualJourney: {
      visitedZoneIds: [],
      routePoints: [],
      completedTaskIds: [],
      badgeZoneIds: [],
      unlockedCompanionIds: [options.companionId],
      walkingDistanceMeters: 0,
      routeChanges: [],
    },
    events: [{
      id: `${id}-start`,
      type: 'journey_started',
      occurredAt: startedAt,
      title: `和${companionNames[options.companionId]}开始奇遇`,
      companionId: options.companionId,
    }],
    media: [],
  }
}

export function createJourneyEvent(type: JourneyEvent['type'], title: string, details: Partial<JourneyEvent> = {}): JourneyEvent {
  const occurredAt = details.occurredAt ?? new Date().toISOString()
  return {
    id: details.id ?? `event-${occurredAt.replace(/\D/g, '')}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    occurredAt,
    title,
    detail: details.detail,
    zoneId: details.zoneId,
    companionId: details.companionId,
    data: details.data,
  }
}

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)]
}

/**
 * Rebuild the durable journey facts from the persisted in-park state. The
 * park state is intentionally kept separately for fast live interaction, so
 * this merge also repairs records after a refresh or a cross-page hand-off.
 */
export function mergeParkStateIntoJourneyRecord(record: JourneyRecord, park: ParkJourneySnapshot): JourneyRecord {
  const visitedZoneIds = unique([...record.actualJourney.visitedZoneIds, ...park.visitedZoneIds])
  const completedTaskIds = unique([...record.actualJourney.completedTaskIds, ...park.completedTaskIds])
  const badgeZoneIds = unique([...record.actualJourney.badgeZoneIds, ...park.badgeZoneIds])
  const unlockedCompanionIds = unique([...record.actualJourney.unlockedCompanionIds, ...park.unlockedCompanionIds])
  const events = [...record.events]

  for (const zoneId of visitedZoneIds) {
    if (!events.some(event => event.type === 'zone_arrived' && event.zoneId === zoneId)) {
      events.push(createJourneyEvent('zone_arrived', '抵达新的动物园区', { zoneId, companionId: zoneId }))
    }
  }
  for (const companionId of unlockedCompanionIds) {
    if (companionId !== record.primaryCompanionId
      && !events.some(event => event.type === 'companion_unlocked' && event.companionId === companionId)) {
      events.push(createJourneyEvent('companion_unlocked', '一位新的奇遇伙伴加入手机', { companionId }))
    }
  }
  for (const taskId of completedTaskIds) {
    if (!events.some(event => event.type === 'task_completed' && event.data?.taskId === taskId)) {
      events.push(createJourneyEvent('task_completed', '完成园区观察任务', { data: { taskId } }))
    }
  }
  for (const zoneId of badgeZoneIds) {
    if (!events.some(event => event.type === 'badge_earned' && event.zoneId === zoneId)) {
      events.push(createJourneyEvent('badge_earned', '获得园区奇遇徽章', { zoneId }))
    }
  }

  return {
    ...record,
    planSnapshot: {
      ...record.planSnapshot,
      zoneIds: record.planSnapshot.zoneIds.length
        ? record.planSnapshot.zoneIds
        : [...park.routeZoneIds],
    },
    actualJourney: {
      ...record.actualJourney,
      visitedZoneIds,
      completedTaskIds,
      badgeZoneIds,
      unlockedCompanionIds,
      walkingDistanceMeters: Math.max(record.actualJourney.walkingDistanceMeters, park.totalWalkedMeters),
    },
    events,
  }
}

/**
 * Compatibility repair for journeys completed before map marker clicks were
 * persisted as arrivals. Only the route snapshot can be recovered; badges and
 * tasks stay untouched because there is no trustworthy evidence for them.
 */
export function recoverCompletedJourneyFromPlan(record: JourneyRecord): JourneyRecord {
  if (record.status !== 'completed'
    || record.actualJourney.visitedZoneIds.length
    || !record.planSnapshot.zoneIds.length) return record

  const recoveredZoneIds = [...record.planSnapshot.zoneIds]
  const walkingDistanceMeters = record.planSnapshot.walkingMeters > 0
    ? record.planSnapshot.walkingMeters
    : routeSummary('entrance', recoveredZoneIds).distanceMeters
  const occurredAt = record.completedAt ?? record.startedAt
  const recoveryEvent = createJourneyEvent('route_changed', '已从本次完成路线恢复到访记录', {
    id: `${record.id}-legacy-route-recovery`,
    occurredAt,
    detail: `恢复 ${recoveredZoneIds.length} 个到访展区及路线里程；任务与徽章仍以实际记录为准。`,
    data: { recoveredFromPlan: true, recoveredZoneCount: recoveredZoneIds.length },
  })
  const recovered: JourneyRecord = {
    ...record,
    actualJourney: {
      ...record.actualJourney,
      visitedZoneIds: recoveredZoneIds,
      unlockedCompanionIds: unique([
        ...record.actualJourney.unlockedCompanionIds,
        record.primaryCompanionId,
        ...recoveredZoneIds,
      ]),
      walkingDistanceMeters,
    },
    events: record.events.some(event => event.id === recoveryEvent.id)
      ? record.events
      : [...record.events, recoveryEvent],
  }

  if (!recovered.ticket) return recovered
  return {
    ...recovered,
    ticket: {
      ...recovered.ticket,
      featuredZoneId: recovered.ticket.featuredZoneId ?? recoveredZoneIds[0],
      statsSnapshot: buildTicketStats(recovered),
    },
  }
}

function fnv1a(value: string) {
  let hash = 0x811c9dc5
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

export function buildTicketNumber(journey: Pick<JourneyRecord, 'id' | 'visitDate'>) {
  const date = journey.visitDate.replace(/\D/g, '').slice(0, 8)
  const code = fnv1a(`${journey.id}:${date}`).toString(36).toUpperCase().padStart(6, '0').slice(0, 6)
  return `ZOO-${date}-${code}`
}

export function buildTicketStats(journey: JourneyRecord): JourneyTicketStatsSnapshot {
  const planned = journey.planSnapshot.zoneIds.length
  const visited = journey.actualJourney.visitedZoneIds.length
  return {
    visitedZoneCount: visited,
    completedTaskCount: journey.actualJourney.completedTaskIds.length,
    earnedBadgeCount: journey.actualJourney.badgeZoneIds.length,
    walkingDistanceMeters: Math.round(journey.actualJourney.walkingDistanceMeters),
    routeCompletionRate: planned ? Math.min(100, Math.round(visited / planned * 100)) : undefined,
  }
}

const messageTemplates: Record<CompanionId, string> = {
  panda: '今天遇见的每一位朋友，都值得被慢慢记住。',
  tiger: '路线改变了一点，但奇遇一点也没有减少。',
  koala: '不赶时间的脚步，也会收集到很亮的星光。',
  elephant: '和伙伴一起走过的路，会变成今天的星光。',
  giraffe: '抬头看见的风景，已经被我们好好收藏。',
  gorilla: '今天的徽章，证明我们认真看过这个世界。',
}

export function buildJourneyTicket(journey: JourneyRecord, template: JourneyTicketTemplate = 'classic'): JourneyTicket {
  const now = new Date().toISOString()
  const companionName = companionNames[journey.primaryCompanionId]
  const highlight = journey.media.find(item => item.kind === 'photo' && item.isHighlight)
    ?? journey.media.find(item => item.kind === 'photo')
  return {
    id: `ticket-${journey.id}`,
    journeyId: journey.id,
    createdAt: now,
    updatedAt: now,
    ticketNumber: buildTicketNumber(journey),
    template,
    title: `和${companionName}一起完成的夏日奇遇`,
    subtitle: '动物园探索纪念票',
    message: messageTemplates[journey.primaryCompanionId],
    showMessage: true,
    companionId: journey.primaryCompanionId,
    featuredZoneId: journey.actualJourney.visitedZoneIds[0],
    coverPhotoId: highlight?.id,
    coverTransform: { x: 50, y: 50, scale: 1 },
    zooName: journey.zooName,
    visitDate: journey.visitDate,
    statsSnapshot: buildTicketStats(journey),
    exportHistory: [],
  }
}

export function buildTicketShareCaption(ticket: JourneyTicket) {
  const distance = (ticket.statsSnapshot.walkingDistanceMeters / 1000).toFixed(1)
  return `今天和${companionNames[ticket.companionId]}一起走过了 ${distance} 公里，拜访了 ${ticket.statsSnapshot.visitedZoneCount} 个动物展区，还收集了 ${ticket.statsSnapshot.earnedBadgeCount} 枚奇遇徽章。${ticket.message ?? '下一次，也要一起出发。'}`
}

export function createDemoJourneyRecord(): JourneyRecord {
  const record = createJourneyRecord({
    companionId: 'panda',
    plannedZoneIds: ['panda', 'giraffe', 'gorilla', 'tiger', 'elephant', 'koala'],
    plannedWalkingMeters: 3900,
    startedAt: '2026-07-18T10:08:00+08:00',
  })
  record.id = 'journey-demo-20260718'
  record.status = 'completed'
  record.completedAt = '2026-07-18T17:46:00+08:00'
  record.actualJourney.visitedZoneIds = ['panda', 'giraffe', 'gorilla', 'tiger', 'elephant', 'koala']
  record.actualJourney.completedTaskIds = ['panda-observe', 'giraffe-observe', 'gorilla-observe', 'elephant-observe']
  record.actualJourney.badgeZoneIds = ['panda', 'giraffe', 'gorilla']
  record.actualJourney.unlockedCompanionIds = ['panda', 'giraffe', 'gorilla', 'tiger', 'elephant', 'koala']
  record.actualJourney.walkingDistanceMeters = 3800
  record.events = [
    record.events[0]!,
    createJourneyEvent('zone_arrived', '抵达熊猫园', { occurredAt: '2026-07-18T10:28:00+08:00', zoneId: 'panda' }),
    createJourneyEvent('task_completed', '完成竹林观察任务', { occurredAt: '2026-07-18T11:06:00+08:00', zoneId: 'panda' }),
    createJourneyEvent('route_changed', '避开排队，调整了后续路线', { occurredAt: '2026-07-18T13:14:00+08:00', detail: '路线改变了一点，但奇遇一点也没有减少。' }),
    createJourneyEvent('badge_earned', '收下第三枚奇遇徽章', { occurredAt: '2026-07-18T16:22:00+08:00', zoneId: 'gorilla' }),
    createJourneyEvent('journey_finished', '把今天装进回忆星册', { occurredAt: record.completedAt }),
  ]
  record.ticket = buildJourneyTicket(record)
  record.ticket.ticketNumber = 'ZOO-20260718-A4K9P2'
  record.ticket.message = '路线改变了一点，但奇遇一点也没有减少。'
  return record
}
