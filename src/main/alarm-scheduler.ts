import { Alarm, getNextOccurrence } from '../shared/alarm'

const MAX_TIMEOUT = 2_147_483_647

export interface ScheduledAlarm {
  alarm: Alarm
  occurrence: Date
}

export class AlarmScheduler {
  private timer: NodeJS.Timeout | undefined
  private nextBatch: ScheduledAlarm[] = []

  constructor(
    private readonly getAlarms: () => Alarm[],
    private readonly onRing: (scheduled: ScheduledAlarm) => void | Promise<void>,
  ) {}

  start(): void {
    this.refresh()
  }

  stop(): void {
    if (this.timer) clearTimeout(this.timer)
    this.timer = undefined
    this.nextBatch = []
  }

  refresh(): void {
    if (this.timer) clearTimeout(this.timer)

    const now = new Date()
    const scheduled = this.getAlarms()
      .map((alarm) => {
        const occurrence = getNextOccurrence(alarm, now)
        return occurrence ? { alarm, occurrence } : null
      })
      .filter((item): item is ScheduledAlarm => item !== null)
      .sort((left, right) => left.occurrence.getTime() - right.occurrence.getTime())

    if (scheduled.length === 0) {
      this.timer = undefined
      this.nextBatch = []
      return
    }

    const firstTime = scheduled[0].occurrence.getTime()
    this.nextBatch = scheduled.filter((item) => item.occurrence.getTime() === firstTime)
    const delay = Math.min(Math.max(firstTime - Date.now(), 0), MAX_TIMEOUT)
    this.timer = setTimeout(() => void this.handleTimer(), delay)
  }

  private async handleTimer(): Promise<void> {
    const now = Date.now()
    const due = this.nextBatch.filter((item) => item.occurrence.getTime() <= now)

    if (due.length === 0) {
      this.refresh()
      return
    }

    for (const item of due) await this.onRing(item)
    this.refresh()
  }
}
