import { describe, expect, it } from 'vitest'
import { Alarm, getNextOccurrence, isValidAlarmDraft } from './alarm'

function alarm(overrides: Partial<Alarm> = {}): Alarm {
  return {
    id: 'test',
    label: 'Test alarm',
    time: '07:30:15',
    schedule: { type: 'daily' },
    sound: 'pulse',
    enabled: true,
    createdAt: '2026-09-15T00:00:00.000Z',
    updatedAt: '2026-09-15T00:00:00.000Z',
    ...overrides,
  }
}

describe('getNextOccurrence', () => {
  it('schedules a daily alarm on the same day before its exact second', () => {
    const next = getNextOccurrence(alarm(), new Date(2026, 8, 15, 7, 30, 14, 999))
    expect(next).toEqual(new Date(2026, 8, 15, 7, 30, 15, 0))
  })

  it('moves a daily alarm to tomorrow after its exact second', () => {
    const next = getNextOccurrence(alarm(), new Date(2026, 8, 15, 7, 30, 15, 0))
    expect(next).toEqual(new Date(2026, 8, 16, 7, 30, 15, 0))
  })

  it('finds the next selected weekday', () => {
    const next = getNextOccurrence(
      alarm({ schedule: { type: 'weekdays', days: [1, 3] } }),
      new Date(2026, 8, 15, 8, 0, 0),
    )
    expect(next).toEqual(new Date(2026, 8, 16, 7, 30, 15, 0))
  })

  it('returns null for expired one-time alarms and disabled alarms', () => {
    const once = alarm({ schedule: { type: 'once', date: '2026-09-15' } })
    expect(getNextOccurrence(once, new Date(2026, 8, 16))).toBeNull()
    expect(getNextOccurrence(alarm({ enabled: false }), new Date(2026, 8, 15))).toBeNull()
  })
})

describe('isValidAlarmDraft', () => {
  it('requires seconds and at least one selected weekday', () => {
    expect(
      isValidAlarmDraft({
        label: 'Wake up',
        time: '06:30:05',
        schedule: { type: 'daily' },
        sound: 'bell',
        enabled: true,
      }),
    ).toBe(true)

    expect(
      isValidAlarmDraft({
        label: 'Wake up',
        time: '06:30',
        schedule: { type: 'weekdays', days: [] },
        sound: 'bell',
        enabled: true,
      }),
    ).toBe(false)
  })
})
