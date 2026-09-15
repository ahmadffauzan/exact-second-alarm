export const WEEKDAYS = [
  { value: 0, short: 'SUN', long: 'Sunday' },
  { value: 1, short: 'MON', long: 'Monday' },
  { value: 2, short: 'TUE', long: 'Tuesday' },
  { value: 3, short: 'WED', long: 'Wednesday' },
  { value: 4, short: 'THU', long: 'Thursday' },
  { value: 5, short: 'FRI', long: 'Friday' },
  { value: 6, short: 'SAT', long: 'Saturday' },
] as const

export const SOUND_PRESETS = [
  { id: 'pulse', name: 'Power pulse', description: 'Bright, urgent double pulse' },
  { id: 'radar', name: 'Radar ping', description: 'Rising electronic signal' },
  { id: 'bell', name: 'Classic bell', description: 'A crisp bedside ring' },
] as const

export type SoundId = (typeof SOUND_PRESETS)[number]['id']
export type ScheduleType = 'once' | 'daily' | 'weekdays'

export type AlarmSchedule =
  { type: 'once'; date: string } | { type: 'daily' } | { type: 'weekdays'; days: number[] }

export interface Alarm {
  id: string
  label: string
  time: string
  schedule: AlarmSchedule
  sound: SoundId
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export interface AlarmDraft {
  id?: string
  label: string
  time: string
  schedule: AlarmSchedule
  sound: SoundId
  enabled: boolean
}

export interface RingEvent {
  alarm: Alarm
  scheduledFor: string
}

export interface AlarmApi {
  list: () => Promise<Alarm[]>
  save: (draft: AlarmDraft) => Promise<Alarm[]>
  remove: (id: string) => Promise<Alarm[]>
  setEnabled: (id: string, enabled: boolean) => Promise<Alarm[]>
  onRing: (callback: (event: RingEvent) => void) => () => void
  onChanged: (callback: (alarms: Alarm[]) => void) => () => void
}

const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d$/
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export function isSoundId(value: unknown): value is SoundId {
  return SOUND_PRESETS.some((sound) => sound.id === value)
}

export function isValidAlarmDraft(value: unknown): value is AlarmDraft {
  if (!value || typeof value !== 'object') return false

  const draft = value as Partial<AlarmDraft>
  if (
    (draft.id !== undefined && typeof draft.id !== 'string') ||
    typeof draft.label !== 'string' ||
    draft.label.trim().length === 0 ||
    draft.label.length > 80 ||
    typeof draft.time !== 'string' ||
    !TIME_PATTERN.test(draft.time) ||
    typeof draft.enabled !== 'boolean' ||
    !isSoundId(draft.sound) ||
    !draft.schedule
  ) {
    return false
  }

  if (draft.schedule.type === 'daily') return true
  if (draft.schedule.type === 'once') {
    return typeof draft.schedule.date === 'string' && DATE_PATTERN.test(draft.schedule.date)
  }
  if (draft.schedule.type === 'weekdays') {
    return (
      Array.isArray(draft.schedule.days) &&
      draft.schedule.days.length > 0 &&
      draft.schedule.days.every(
        (day) => Number.isInteger(day) && Number(day) >= 0 && Number(day) <= 6,
      )
    )
  }

  return false
}

export function parseTime(time: string): [number, number, number] {
  const [hours, minutes, seconds] = time.split(':').map(Number)
  return [hours, minutes, seconds]
}

function localDateFromIso(date: string, time: string): Date {
  const [year, month, day] = date.split('-').map(Number)
  const [hours, minutes, seconds] = parseTime(time)
  return new Date(year, month - 1, day, hours, minutes, seconds, 0)
}

export function getNextOccurrence(alarm: Alarm, after: Date = new Date()): Date | null {
  if (!alarm.enabled) return null

  if (alarm.schedule.type === 'once') {
    const occurrence = localDateFromIso(alarm.schedule.date, alarm.time)
    return occurrence.getTime() > after.getTime() ? occurrence : null
  }

  const [hours, minutes, seconds] = parseTime(alarm.time)
  const candidate = new Date(after)
  candidate.setHours(hours, minutes, seconds, 0)

  for (let offset = 0; offset <= 7; offset += 1) {
    if (offset > 0) candidate.setDate(candidate.getDate() + 1)
    const isFuture = candidate.getTime() > after.getTime()
    const isScheduledDay =
      alarm.schedule.type === 'daily' || alarm.schedule.days.includes(candidate.getDay())

    if (isFuture && isScheduledDay) return new Date(candidate)
  }

  return null
}

export function describeSchedule(schedule: AlarmSchedule): string {
  if (schedule.type === 'daily') return 'Every day'
  if (schedule.type === 'once') {
    return new Intl.DateTimeFormat('en', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(localDateFromIso(schedule.date, '12:00:00'))
  }

  if (schedule.days.length === 5 && [1, 2, 3, 4, 5].every((day) => schedule.days.includes(day))) {
    return 'Weekdays'
  }
  if (schedule.days.length === 2 && [0, 6].every((day) => schedule.days.includes(day))) {
    return 'Weekends'
  }

  return WEEKDAYS.filter((day) => schedule.days.includes(day.value))
    .map((day) => day.short)
    .join(' · ')
}
