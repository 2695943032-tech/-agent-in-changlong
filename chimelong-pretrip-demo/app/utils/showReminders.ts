interface DueShowReminderOptions {
  parkActivated: boolean
  now: Date
  venueId: string
  showTimes: readonly string[]
  announcedKeys: ReadonlySet<string>
}

export interface DueShowReminder {
  key: string
  startLabel: string
}

export function dueShowReminders(options: DueShowReminderOptions): DueShowReminder[] {
  const { parkActivated, now, venueId, showTimes, announcedKeys } = options
  if (!parkActivated) return []

  return showTimes.flatMap((startLabel) => {
    const [hours, minutes] = startLabel.split(':').map(Number)
    if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return []

    const start = new Date(now)
    start.setHours(hours!, minutes!, 0, 0)
    const minutesUntil = (start.getTime() - now.getTime()) / 60_000
    const key = `${now.toDateString()}-${venueId}-${startLabel}`
    if (minutesUntil > 30 || minutesUntil < 0 || announcedKeys.has(key)) return []

    return [{ key, startLabel }]
  })
}
