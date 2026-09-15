import { afterEach, describe, expect, it, vi } from 'vitest'
import { Alarm } from '../shared/alarm'
import { AlarmScheduler } from './alarm-scheduler'

function alarm(overrides: Partial<Alarm> = {}): Alarm {
  return {
    id: 'alarm-1',
    label: 'Test',
    time: '07:30:15',
    schedule: { type: 'daily' },
    sound: 'pulse',
    enabled: true,
    createdAt: '2026-09-15T00:00:00.000Z',
    updatedAt: '2026-09-15T00:00:00.000Z',
    ...overrides,
  }
}

describe('AlarmScheduler', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('rings at the configured second', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 8, 15, 7, 30, 14, 500))
    const onRing = vi.fn()
    const scheduler = new AlarmScheduler(() => [alarm()], onRing)

    scheduler.start()
    await vi.advanceTimersByTimeAsync(499)
    expect(onRing).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(onRing).toHaveBeenCalledTimes(1)
    expect(onRing.mock.calls[0][0].occurrence).toEqual(new Date(2026, 8, 15, 7, 30, 15))
    scheduler.stop()
  })

  it('does not replay an occurrence missed while stopped', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 8, 15, 7, 30, 14))
    const onRing = vi.fn()
    const scheduler = new AlarmScheduler(() => [alarm()], onRing)

    scheduler.start()
    scheduler.stop()
    vi.setSystemTime(new Date(2026, 8, 15, 8, 0, 0))
    scheduler.start()
    await vi.advanceTimersByTimeAsync(1000)
    expect(onRing).not.toHaveBeenCalled()
    scheduler.stop()
  })
})
