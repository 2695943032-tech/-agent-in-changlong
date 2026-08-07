import type { AnimalId, CompanionId, GeoPoint, PlanResponse, VisitorProfile } from '../../shared/types/pretrip'
import type { JourneyCollection, JourneyEvent, JourneyMedia, JourneyRecord, JourneyTicket } from '../../shared/types/journey'
import { haversineMeters } from '#shared/utils/parkGeo'
import type { ParkJourneySnapshot } from '../utils/journeyRecord'
import { createJourneyEvent, createJourneyRecord, emptyJourneyCollection, mergeParkStateIntoJourneyRecord, recoverCompletedJourneyFromPlan } from '../utils/journeyRecord'

const STORAGE_KEY = 'chimelong-journey-records-v2'

export function useJourneyRecords() {
  const collection = useState<JourneyCollection>('journey-records-v2', emptyJourneyCollection)
  const hydrated = useState('journey-records-v2-hydrated', () => false)
  const storageError = useState('journey-records-v2-error', () => '')

  const activeRecord = computed(() => collection.value.records.find(item => item.id === collection.value.activeJourneyId) ?? null)
  const completedRecords = computed(() => collection.value.records.filter(item => item.status === 'completed').sort((a, b) => b.startedAt.localeCompare(a.startedAt)))

  if (import.meta.client) {
    onMounted(() => {
      if (hydrated.value) return
      hydrated.value = true
      const saved = localStorage.getItem(STORAGE_KEY)
      if (!saved) return
      try {
        const parsed = JSON.parse(saved) as Partial<JourneyCollection>
        if (parsed.schemaVersion !== 2 || !Array.isArray(parsed.records)) throw new Error('旧版回忆数据格式无法识别')
        collection.value = {
          schemaVersion: 2,
          activeJourneyId: typeof parsed.activeJourneyId === 'string' ? parsed.activeJourneyId : null,
          records: parsed.records.filter((item): item is JourneyRecord => Boolean(item && item.schemaVersion === 2 && item.id)),
        }
      }
      catch (cause) {
        storageError.value = cause instanceof Error ? cause.message : '回忆数据读取失败'
      }
    })
    watch(collection, (value) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
        storageError.value = ''
      }
      catch {
        storageError.value = '本地空间不足，文字记录暂时无法保存'
      }
    }, { deep: true })
  }

  function replaceRecord(record: JourneyRecord) {
    const index = collection.value.records.findIndex(item => item.id === record.id)
    const records = [...collection.value.records]
    if (index >= 0) records[index] = record
    else records.unshift(record)
    collection.value = { ...collection.value, records }
  }

  function updateActive(updater: (record: JourneyRecord) => JourneyRecord) {
    const current = activeRecord.value
    if (!current) return null
    const next = updater(current)
    replaceRecord(next)
    return next
  }

  function start(options: {
    companionId: CompanionId
    plan?: PlanResponse | null
    visitorProfile?: VisitorProfile
  }) {
    const existing = activeRecord.value
    if (existing?.status === 'active') return existing
    const record = createJourneyRecord({
      companionId: options.companionId,
      plannedZoneIds: options.plan?.actualAnimalOrder ?? [],
      planId: options.plan?.planId,
      plannedWalkingMeters: options.plan?.walkingMeters,
      visitorProfile: options.visitorProfile,
    })
    collection.value = {
      schemaVersion: 2,
      activeJourneyId: record.id,
      records: [record, ...collection.value.records],
    }
    return record
  }

  function appendEvent(event: JourneyEvent) {
    return updateActive(record => ({ ...record, events: [...record.events, event] }))
  }

  function recordLocation(position: GeoPoint, walkingDistanceMeters: number) {
    return updateActive((record) => {
      const points = record.actualJourney.routePoints
      const last = points.at(-1)
      const shouldAdd = !last || haversineMeters(last, position) >= 8
      return {
        ...record,
        actualJourney: {
          ...record.actualJourney,
          walkingDistanceMeters: Math.max(record.actualJourney.walkingDistanceMeters, walkingDistanceMeters),
          routePoints: shouldAdd ? [...points, { ...position, recordedAt: new Date().toISOString() }] : points,
        },
      }
    })
  }

  function arriveZone(zoneId: AnimalId, companionId: CompanionId, firstVisit: boolean) {
    if (!firstVisit) return
    updateActive((record) => {
      const visitedZoneIds = [...new Set([...record.actualJourney.visitedZoneIds, zoneId])]
      const unlockedCompanionIds = [...new Set([...record.actualJourney.unlockedCompanionIds, companionId])]
      const events = [
        ...record.events,
        createJourneyEvent('zone_arrived', '抵达新的动物园区', { zoneId, companionId }),
      ]
      if (!record.actualJourney.unlockedCompanionIds.includes(companionId)) {
        events.push(createJourneyEvent('companion_unlocked', '一位新的奇遇伙伴加入手机', { zoneId, companionId }))
      }
      return { ...record, actualJourney: { ...record.actualJourney, visitedZoneIds, unlockedCompanionIds }, events }
    })
  }

  function completeTask(zoneId: AnimalId, taskId: string, badgeName: string) {
    updateActive(record => ({
      ...record,
      actualJourney: {
        ...record.actualJourney,
        completedTaskIds: [...new Set([...record.actualJourney.completedTaskIds, taskId])],
        badgeZoneIds: [...new Set([...record.actualJourney.badgeZoneIds, zoneId])],
      },
      events: [
        ...record.events,
        createJourneyEvent('task_completed', '完成园区观察任务', { zoneId, data: { taskId } }),
        createJourneyEvent('badge_earned', `获得「${badgeName}」徽章`, { zoneId }),
      ],
    }))
  }

  function recordConversation(question: string, reply: string, zoneId?: AnimalId) {
    appendEvent(createJourneyEvent('conversation', '和奇遇伙伴聊了聊', {
      zoneId,
      detail: question,
      data: { reply: reply.slice(0, 180) },
    }))
  }

  function recordRouteChange(reason: string, beforeZoneIds: AnimalId[], afterZoneIds: AnimalId[]) {
    updateActive(record => ({
      ...record,
      actualJourney: {
        ...record.actualJourney,
        routeChanges: [...record.actualJourney.routeChanges, {
          id: `route-${Date.now()}`,
          occurredAt: new Date().toISOString(),
          reason,
          beforeZoneIds,
          afterZoneIds,
        }],
      },
      events: [...record.events, createJourneyEvent('route_changed', '伙伴调整了后续路线', { detail: reason })],
    }))
  }

  function addMedia(media: JourneyMedia) {
    const record = collection.value.records.find(item => item.id === media.journeyId)
    if (!record) return null
    const next = {
      ...record,
      media: [...record.media, media],
      events: [...record.events, createJourneyEvent(media.kind === 'photo' ? 'photo_added' : 'video_added', media.kind === 'photo' ? '收藏了一张现场照片' : '收藏了一段现场影像', { zoneId: media.zoneId })],
    }
    replaceRecord(next)
    return next
  }

  function saveTicket(journeyId: string, ticket: JourneyTicket) {
    const record = collection.value.records.find(item => item.id === journeyId)
    if (!record) return
    replaceRecord({ ...record, ticket: { ...ticket, updatedAt: new Date().toISOString() } })
  }

  function deleteTicket(journeyId: string) {
    const record = collection.value.records.find(item => item.id === journeyId)
    if (!record) return
    const { ticket: _ticket, ...rest } = record
    replaceRecord(rest)
  }

  function finish() {
    const completedAt = new Date().toISOString()
    const next = updateActive(record => ({
      ...record,
      status: 'completed',
      completedAt,
      events: [...record.events, createJourneyEvent('journey_finished', '把今天装进回忆星册', { occurredAt: completedAt })],
    }))
    if (next) collection.value = { ...collection.value, activeJourneyId: null }
    return next
  }

  function reconcileParkState(parkState: ParkJourneySnapshot, options: {
    companionId: CompanionId
    plan?: PlanResponse | null
    visitorProfile?: VisitorProfile
  }) {
    if (!parkState.started) return null

    const target = activeRecord.value ?? start(options)
    const next = mergeParkStateIntoJourneyRecord(target, parkState)
    replaceRecord(next)
    if (collection.value.activeJourneyId !== next.id) {
      collection.value = { ...collection.value, activeJourneyId: next.id }
    }
    return next
  }

  function recoverCompletedRecordsFromPlan() {
    let changed = false
    const records = collection.value.records.map((record) => {
      const next = recoverCompletedJourneyFromPlan(record)
      if (next !== record) changed = true
      return next
    })
    if (changed) collection.value = { ...collection.value, records }
    return changed
  }

  function ensureRecord(record: JourneyRecord) {
    if (collection.value.records.some(item => item.id === record.id)) return
    replaceRecord(record)
  }

  function clear() {
    collection.value = emptyJourneyCollection()
    storageError.value = ''
    if (import.meta.client) localStorage.removeItem(STORAGE_KEY)
  }

  return {
    collection: readonly(collection),
    activeRecord,
    completedRecords,
    storageError: readonly(storageError),
    start,
    appendEvent,
    recordLocation,
    arriveZone,
    completeTask,
    recordConversation,
    recordRouteChange,
    addMedia,
    saveTicket,
    deleteTicket,
    finish,
    reconcileParkState,
    recoverCompletedRecordsFromPlan,
    ensureRecord,
    clear,
  }
}
