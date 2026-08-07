import { describe, expect, it } from 'vitest'
import {
  applyParkChatAdjustment,
  beginParkJourney,
  completeZoneTask,
  openFatigueEvent,
  resolveParkEvent,
  switchActiveCompanion,
  updateParkLocation,
  visitParkZone,
} from '../app/utils/parkJourney'
import { animals } from '../server/data/catalog'
import { parkZones } from '../shared/data/zoneExperience'
import { haversineMeters } from '../shared/utils/parkGeo'
import { shuffleTaskChoices } from '../app/utils/parkTask'

describe('park journey state', () => {
  it('keeps correctness independent from display order', () => {
    const answerPositions = parkZones.map((zone) => {
      const shuffled = shuffleTaskChoices(zone.task, 20260718)
      expect(shuffled).toHaveLength(zone.task.choices.length)
      expect(shuffled).toContain(zone.task.correctChoice)
      return shuffled.indexOf(zone.task.correctChoice)
    })

    expect(new Set(answerPositions).size).toBeGreaterThan(1)
  })

  it('starts with the chosen companion and keeps a unique planned route', () => {
    const state = beginParkJourney('giraffe', 'follow', ['panda', 'giraffe', 'panda'])

    expect(state.started).toBe(true)
    expect(state.mode).toBe('follow')
    expect(state.activeCompanionId).toBe('giraffe')
    expect(state.unlockedCompanionIds).toEqual(['giraffe'])
    expect(state.routeZoneIds).toEqual(['panda', 'giraffe'])
  })

  it('unlocks a zone companion once and records route progress', () => {
    const initial = beginParkJourney('panda', 'follow', ['panda', 'elephant'])
    const firstVisit = visitParkZone(initial, 'elephant', 'elephant')
    const repeatedVisit = visitParkZone(firstVisit, 'elephant', 'elephant')

    expect(repeatedVisit.currentZoneId).toBe('elephant')
    expect(repeatedVisit.visitedZoneIds).toEqual(['elephant'])
    expect(repeatedVisit.unlockedCompanionIds).toEqual(['panda', 'elephant'])
    expect(repeatedVisit.routeCompletedIds).toEqual(['elephant'])
  })

  it('raises the queue event after the second new stop in follow mode', () => {
    let state = beginParkJourney('panda', 'follow', ['panda', 'giraffe', 'gorilla'])
    state = visitParkZone(state, 'panda', 'panda')
    state = visitParkZone(state, 'giraffe', 'giraffe')

    expect(state.activeEventId).toBe('queue-surge')
  })

  it('only switches to companions that have been unlocked', () => {
    const initial = beginParkJourney('panda', 'free')
    expect(switchActiveCompanion(initial, 'tiger')).toBe(initial)

    const unlocked = visitParkZone(initial, 'tiger', 'tiger')
    expect(switchActiveCompanion(unlocked, 'tiger').activeCompanionId).toBe('tiger')
  })

  it('awards a task badge idempotently', () => {
    const initial = beginParkJourney('koala', 'free')
    const completed = completeZoneTask(initial, 'koala', 'koala-pose')
    const repeated = completeZoneTask(completed, 'koala', 'koala-pose')

    expect(repeated.completedTaskIds).toEqual(['koala-pose'])
    expect(repeated.badgeZoneIds).toEqual(['koala'])
  })

  it('accepts a queue reroute by swapping the next two pending stops', () => {
    let state = beginParkJourney('panda', 'follow', ['panda', 'giraffe', 'gorilla'])
    state = visitParkZone(state, 'panda', 'panda')
    state = { ...state, activeEventId: 'queue-surge' }
    state = resolveParkEvent(state, 'queue-surge', true)

    expect(state.routeZoneIds).toEqual(['panda', 'gorilla', 'giraffe'])
    expect(state.routeAdjusted).toBe(true)
    expect(state.activeEventId).toBeNull()
    expect(state.resolvedEventIds).toContain('queue-surge')
  })

  it('inserts one rest break after accepting the fatigue suggestion', () => {
    let state = beginParkJourney('elephant', 'free')
    state = openFatigueEvent(state)
    expect(state.activeEventId).toBe('fatigue')

    state = resolveParkEvent(state, 'fatigue', true)
    expect(state.breakInserted).toBe(true)
    expect(state.resolvedEventIds).toEqual(['fatigue'])
    expect(openFatigueEvent(state)).toBe(state)
  })

  it('triggers a companion unlock only after entering the configured 50m geofence', () => {
    const panda = animals.find(item => item.id === 'panda')!
    const initial = beginParkJourney('tiger', 'free')
    const outside = updateParkLocation(initial, {
      longitude: panda.longitude + 0.001,
      latitude: panda.latitude,
    }, animals)
    expect(outside.matchedZone).toBeNull()

    const inside = updateParkLocation(outside.state, {
      longitude: panda.longitude + 0.0001,
      latitude: panda.latitude,
    }, animals)
    expect(haversineMeters(inside.state.currentPosition!, panda)).toBeLessThan(50)
    expect(inside.matchedZone?.id).toBe('panda')
    expect(inside.state.unlockedCompanionIds).toContain('panda')
  })

  it('reorders remaining stops from the real current route node', () => {
    let state = beginParkJourney('panda', 'follow', ['tiger', 'gorilla', 'elephant', 'koala'])
    state = visitParkZone(state, 'gorilla', 'gorilla')
    const adjusted = applyParkChatAdjustment(state, 'nearest-next')
    expect(adjusted.routeZoneIds[0]).toBe('gorilla')
    expect(adjusted.routeZoneIds[1]).toBe('elephant')
    expect(adjusted.routeRevision).toBe(1)
  })
})
