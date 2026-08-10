import { describe, expect, it } from 'vitest'
import { dueShowReminders } from '../app/utils/showReminders'

const now = new Date(2026, 7, 10, 15, 10)
const venueId = 'show-venue'
const showTimes = ['10:30', '13:00', '15:30'] as const

describe('dueShowReminders', () => {
  it('does not create reminders before the park journey is activated', () => {
    expect(dueShowReminders({
      parkActivated: false,
      now,
      venueId,
      showTimes,
      announcedKeys: new Set(),
    })).toEqual([])
  })

  it('creates a timeline reminder after arrival when a show starts within 30 minutes', () => {
    expect(dueShowReminders({
      parkActivated: true,
      now,
      venueId,
      showTimes,
      announcedKeys: new Set(),
    })).toEqual([{
      key: `${now.toDateString()}-${venueId}-15:30`,
      startLabel: '15:30',
    }])
  })

  it('does not repeat an announced show reminder', () => {
    const key = `${now.toDateString()}-${venueId}-15:30`
    expect(dueShowReminders({
      parkActivated: true,
      now,
      venueId,
      showTimes,
      announcedKeys: new Set([key]),
    })).toEqual([])
  })
})
