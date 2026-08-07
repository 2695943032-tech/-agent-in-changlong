import type { AnimalId, AnimalPoi, CompanionId, GeoPoint } from '../../shared/types/pretrip'
import type { DynamicEventId, ParkAdjustmentAction, ParkJourneyState, TripMode } from '../../shared/types/park'
import { findGeofenceMatch, optimizeZoneOrder, routeDistanceMeters } from '#shared/utils/parkGeo'

export function createInitialParkState(): ParkJourneyState {
  return {
    version: 2,
    started: false,
    mode: null,
    starterCompanionId: null,
    activeCompanionId: null,
    unlockedCompanionIds: [],
    currentZoneId: null,
    visitedZoneIds: [],
    completedTaskIds: [],
    badgeZoneIds: [],
    routeZoneIds: [],
    routeCompletedIds: [],
    activeEventId: null,
    resolvedEventIds: [],
    routeAdjusted: false,
    breakInserted: false,
    currentPosition: null,
    currentZoneDistanceMeters: null,
    totalWalkedMeters: 0,
    routeRevision: 0,
  }
}

export function updateParkLocation(
  state: ParkJourneyState,
  position: GeoPoint,
  zones: readonly AnimalPoi[],
): { state: ParkJourneyState, matchedZone: AnimalPoi | null, firstVisit: boolean } {
  const match = findGeofenceMatch(position, zones)
  const previousNode = state.currentZoneId ?? 'entrance'
  let nextState: ParkJourneyState = {
    ...state,
    currentPosition: position,
    currentZoneDistanceMeters: match ? Math.round(match.distanceMeters) : null,
  }

  if (!match) return { state: nextState, matchedZone: null, firstVisit: false }
  const firstVisit = !state.visitedZoneIds.includes(match.zone.id)
  if (previousNode !== match.zone.id) {
    nextState.totalWalkedMeters += routeDistanceMeters(previousNode, match.zone.id)
  }
  nextState = visitParkZone(nextState, match.zone.id, match.zone.id)
  return { state: nextState, matchedZone: match.zone, firstVisit }
}

export function applyParkChatAdjustment(
  state: ParkJourneyState,
  action: ParkAdjustmentAction,
): ParkJourneyState {
  if (action === 'none') return state
  const completed = new Set(state.routeCompletedIds)
  const pending = state.routeZoneIds.filter(id => !completed.has(id))
  let nextPending = [...pending]
  let breakInserted = state.breakInserted

  if (action === 'rest') breakInserted = true
  if (action === 'skip-next') nextPending = nextPending.slice(1)
  if (action === 'reroute' || action === 'nearest-next') {
    nextPending = optimizeZoneOrder(state.currentZoneId ?? 'entrance', nextPending)
  }

  return {
    ...state,
    routeZoneIds: [
      ...state.routeZoneIds.filter(id => completed.has(id)),
      ...nextPending,
    ],
    routeAdjusted: action !== 'rest' || state.routeAdjusted,
    breakInserted,
    routeRevision: state.routeRevision + 1,
  }
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)]
}

export function beginParkJourney(
  companionId: CompanionId,
  mode: TripMode,
  routeZoneIds: AnimalId[] = [],
): ParkJourneyState {
  return {
    ...createInitialParkState(),
    started: true,
    mode,
    starterCompanionId: companionId,
    activeCompanionId: companionId,
    unlockedCompanionIds: [companionId],
    routeZoneIds: unique(routeZoneIds),
  }
}

export function visitParkZone(
  state: ParkJourneyState,
  zoneId: AnimalId,
  companionId: CompanionId,
): ParkJourneyState {
  const isFirstVisit = !state.visitedZoneIds.includes(zoneId)
  const visitedZoneIds = unique([...state.visitedZoneIds, zoneId])
  const routeCompletedIds = state.routeZoneIds.includes(zoneId)
    ? unique([...state.routeCompletedIds, zoneId])
    : state.routeCompletedIds
  const shouldTriggerQueueEvent = state.mode === 'follow'
    && isFirstVisit
    && visitedZoneIds.length === 2
    && !state.resolvedEventIds.includes('queue-surge')

  return {
    ...state,
    currentZoneId: zoneId,
    visitedZoneIds,
    routeCompletedIds,
    unlockedCompanionIds: unique([...state.unlockedCompanionIds, companionId]),
    activeEventId: shouldTriggerQueueEvent ? 'queue-surge' : state.activeEventId,
  }
}

export function switchActiveCompanion(
  state: ParkJourneyState,
  companionId: CompanionId,
): ParkJourneyState {
  if (!state.unlockedCompanionIds.includes(companionId)) return state
  return { ...state, activeCompanionId: companionId }
}

export function completeZoneTask(
  state: ParkJourneyState,
  zoneId: AnimalId,
  taskId: string,
): ParkJourneyState {
  return {
    ...state,
    completedTaskIds: unique([...state.completedTaskIds, taskId]),
    badgeZoneIds: unique([...state.badgeZoneIds, zoneId]),
  }
}

export function openFatigueEvent(state: ParkJourneyState): ParkJourneyState {
  if (state.resolvedEventIds.includes('fatigue')) return state
  return { ...state, activeEventId: 'fatigue' }
}

export function resolveParkEvent(
  state: ParkJourneyState,
  eventId: DynamicEventId,
  accepted: boolean,
): ParkJourneyState {
  let routeZoneIds = state.routeZoneIds
  let routeAdjusted = state.routeAdjusted
  let breakInserted = state.breakInserted

  if (eventId === 'queue-surge' && accepted) {
    const pending = routeZoneIds.filter(id => !state.routeCompletedIds.includes(id))
    if (pending.length >= 2) {
      const [first, second] = pending
      routeZoneIds = routeZoneIds.map((id) => {
        if (id === first) return second!
        if (id === second) return first!
        return id
      })
    }
    routeAdjusted = true
  }

  if (eventId === 'fatigue' && accepted) breakInserted = true

  return {
    ...state,
    routeZoneIds,
    routeAdjusted,
    breakInserted,
    activeEventId: null,
    resolvedEventIds: unique([...state.resolvedEventIds, eventId]),
  }
}
