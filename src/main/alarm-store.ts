import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { Alarm, AlarmDraft, getNextOccurrence, isValidAlarmDraft } from '../shared/alarm'

function isStoredAlarm(value: unknown): value is Alarm {
  if (!value || typeof value !== 'object') return false
  const alarm = value as Partial<Alarm>

  return (
    typeof alarm.id === 'string' &&
    typeof alarm.createdAt === 'string' &&
    typeof alarm.updatedAt === 'string' &&
    isValidAlarmDraft(alarm)
  )
}

export class AlarmStore {
  private alarms: Alarm[] = []

  constructor(private readonly filePath: string) {}

  async load(): Promise<void> {
    try {
      const contents = await readFile(this.filePath, 'utf8')
      const parsed: unknown = JSON.parse(contents)
      this.alarms = Array.isArray(parsed) ? parsed.filter(isStoredAlarm) : []
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.error('Could not load saved alarms:', error)
      }
      this.alarms = []
    }
  }

  list(): Alarm[] {
    return structuredClone(this.alarms)
  }

  async save(draft: AlarmDraft): Promise<Alarm[]> {
    if (!isValidAlarmDraft(draft)) throw new Error('Invalid alarm data')

    const now = new Date().toISOString()
    const existing = draft.id ? this.alarms.find((alarm) => alarm.id === draft.id) : undefined
    const alarm: Alarm = {
      ...structuredClone(draft),
      id: existing?.id ?? randomUUID(),
      label: draft.label.trim(),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    }

    if (existing) {
      this.alarms = this.alarms.map((item) => (item.id === alarm.id ? alarm : item))
    } else {
      this.alarms = [...this.alarms, alarm]
    }

    await this.persist()
    return this.list()
  }

  async remove(id: string): Promise<Alarm[]> {
    this.alarms = this.alarms.filter((alarm) => alarm.id !== id)
    await this.persist()
    return this.list()
  }

  async setEnabled(id: string, enabled: boolean): Promise<Alarm[]> {
    const now = new Date().toISOString()
    this.alarms = this.alarms.map((alarm) =>
      alarm.id === id ? { ...alarm, enabled, updatedAt: now } : alarm,
    )
    await this.persist()
    return this.list()
  }

  async disableExpiredOneTimeAlarms(now: Date = new Date()): Promise<void> {
    let changed = false
    const updatedAt = now.toISOString()
    this.alarms = this.alarms.map((alarm) => {
      if (
        alarm.enabled &&
        alarm.schedule.type === 'once' &&
        getNextOccurrence(alarm, now) === null
      ) {
        changed = true
        return { ...alarm, enabled: false, updatedAt }
      }
      return alarm
    })

    if (changed) await this.persist()
  }

  private async persist(): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true })
    const temporaryPath = `${this.filePath}.tmp`
    await writeFile(temporaryPath, JSON.stringify(this.alarms, null, 2), 'utf8')
    await rename(temporaryPath, this.filePath)
  }
}
