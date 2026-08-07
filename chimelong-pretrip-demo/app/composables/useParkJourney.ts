import type { AnimalId, AnimalPoi, CompanionId, GeoPoint } from '../../shared/types/pretrip'
import type { DynamicEventId, ParkAdjustmentAction, ParkJourneyState, TripMode } from '../../shared/types/park'
import {
  applyParkChatAdjustment,
  beginParkJourney,
  completeZoneTask,
  createInitialParkState,
  openFatigueEvent,
  resolveParkEvent,
  switchActiveCompanion,
  updateParkLocation,
  visitParkZone,
} from '../utils/parkJourney'

const STORAGE_KEY = 'chimelong-park-journey-v2'

export function useParkJourney() {
  const state = useState<ParkJourneyState>('park-journey-v2', createInitialParkState)
  const hydrated = useState('park-journey-v2-hydrated', () => false)

  if (import.meta.client) {
    onMounted(() => {
      if (hydrated.value) return
      hydrated.value = true
      const saved = localStorage.getItem(STORAGE_KEY)
      if (!saved) return
      try {
        const parsed = JSON.parse(saved) as ParkJourneyState
        if (parsed.version === 2) state.value = parsed
      }
      catch {
        // Keep unreadable legacy data intact; fall back to a fresh in-memory
        // journey without turning a migration issue into silent data loss.
      }
    })

    watch(state, value => localStorage.setItem(STORAGE_KEY, JSON.stringify(value)), { deep: true })
  }

  function begin(companionId: CompanionId, mode: TripMode, routeZoneIds: AnimalId[] = []) {
    state.value = beginParkJourney(companionId, mode, routeZoneIds)
  }

  function visit(zoneId: AnimalId, companionId: CompanionId) {
    state.value = visitParkZone(state.value, zoneId, companionId)
  }

  function updateLocation(position: GeoPoint, zones: readonly AnimalPoi[]) {
    const result = updateParkLocation(state.value, position, zones)
    state.value = result.state
    return result
  }

  function applyAdjustment(action: ParkAdjustmentAction) {
    state.value = applyParkChatAdjustment(state.value, action)
  }

  function switchCompanion(companionId: CompanionId) {
    state.value = switchActiveCompanion(state.value, companionId)
  }

  function completeTask(zoneId: AnimalId, taskId: string) {
    state.value = completeZoneTask(state.value, zoneId, taskId)
  }

  function reportFatigue() {
    state.value = openFatigueEvent(state.value)
  }

  function resolveEvent(eventId: DynamicEventId, accepted: boolean) {
    state.value = resolveParkEvent(state.value, eventId, accepted)
  }

  function reset() {
    state.value = createInitialParkState()
    if (import.meta.client) localStorage.removeItem(STORAGE_KEY)
  }

  return {
    state: readonly(state),
    begin,
    visit,
    updateLocation,
    applyAdjustment,
    switchCompanion,
    completeTask,
    reportFatigue,
    resolveEvent,
    reset,
  }
}
