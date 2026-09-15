import { useMemo, useState } from 'react'
import { Play, X } from 'lucide-react'
import { Alarm, AlarmDraft, ScheduleType, SOUND_PRESETS, SoundId, WEEKDAYS } from '@shared/alarm'
import { previewSound } from './sound'

interface AlarmFormProps {
  alarm: Alarm | null
  onCancel: () => void
  onSave: (draft: AlarmDraft) => Promise<void>
}

function todayIso(): string {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60_000
  return new Date(now.getTime() - offset).toISOString().slice(0, 10)
}

function nextDefaultTime(): string {
  const date = new Date(Date.now() + 5 * 60_000)
  return [date.getHours(), date.getMinutes(), date.getSeconds()]
    .map((part) => String(part).padStart(2, '0'))
    .join(':')
}

export function AlarmForm({ alarm, onCancel, onSave }: AlarmFormProps): React.JSX.Element {
  const initial = useMemo(
    () => ({
      label: alarm?.label ?? '',
      time: alarm?.time ?? nextDefaultTime(),
      scheduleType: alarm?.schedule.type ?? ('daily' as ScheduleType),
      date: alarm?.schedule.type === 'once' ? alarm.schedule.date : todayIso(),
      days: alarm?.schedule.type === 'weekdays' ? alarm.schedule.days : [1, 2, 3, 4, 5],
      sound: alarm?.sound ?? ('pulse' as SoundId),
    }),
    [alarm],
  )
  const [label, setLabel] = useState(initial.label)
  const [time, setTime] = useState(initial.time)
  const [scheduleType, setScheduleType] = useState<ScheduleType>(initial.scheduleType)
  const [date, setDate] = useState(initial.date)
  const [days, setDays] = useState<number[]>(initial.days)
  const [sound, setSound] = useState<SoundId>(initial.sound)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const toggleDay = (day: number): void => {
    setDays((current) =>
      current.includes(day) ? current.filter((item) => item !== day) : [...current, day].sort(),
    )
  }

  const submit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault()
    setError('')

    if (!label.trim()) {
      setError('Give this alarm a name.')
      return
    }
    if (!/^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(time)) {
      setError('Enter a complete 24-hour time including seconds.')
      return
    }
    if (scheduleType === 'weekdays' && days.length === 0) {
      setError('Choose at least one day.')
      return
    }
    if (scheduleType === 'once') {
      const occurrence = new Date(`${date}T${time}`)
      if (Number.isNaN(occurrence.getTime()) || occurrence.getTime() <= Date.now()) {
        setError('Choose a one-time alarm in the future.')
        return
      }
    }

    const schedule =
      scheduleType === 'once'
        ? ({ type: 'once', date } as const)
        : scheduleType === 'weekdays'
          ? ({ type: 'weekdays', days } as const)
          : ({ type: 'daily' } as const)

    setSaving(true)
    try {
      await onSave({
        id: alarm?.id,
        label: label.trim(),
        time,
        schedule,
        sound,
        enabled: alarm?.enabled ?? true,
      })
    } catch {
      setError('Could not save the alarm. Please try again.')
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="alarm-form-title">
        <header className="modal__header">
          <div>
            <p className="eyebrow">{alarm ? 'Tune the details' : 'Make some noise'}</p>
            <h2 id="alarm-form-title">{alarm ? 'Edit alarm' : 'New alarm'}</h2>
          </div>
          <button className="icon-button" type="button" aria-label="Close" onClick={onCancel}>
            <X size={24} strokeWidth={3} aria-hidden="true" />
          </button>
        </header>

        <form onSubmit={(event) => void submit(event)}>
          <label className="field">
            <span>Alarm name</span>
            <input
              autoFocus
              type="text"
              maxLength={80}
              placeholder="Morning launch"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
            />
          </label>

          <label className="field">
            <span>Exact time · HH:MM:SS</span>
            <input
              className="time-input"
              type="time"
              step="1"
              required
              value={time}
              onChange={(event) => setTime(event.target.value)}
            />
          </label>

          <fieldset>
            <legend>Repeat</legend>
            <div className="segmented">
              {(
                [
                  ['once', 'One time'],
                  ['daily', 'Every day'],
                  ['weekdays', 'Pick days'],
                ] as const
              ).map(([value, title]) => (
                <button
                  key={value}
                  className={scheduleType === value ? 'is-active' : ''}
                  type="button"
                  onClick={() => setScheduleType(value)}
                >
                  {title}
                </button>
              ))}
            </div>
          </fieldset>

          {scheduleType === 'once' && (
            <label className="field">
              <span>Date</span>
              <input
                type="date"
                min={todayIso()}
                required
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </label>
          )}

          {scheduleType === 'weekdays' && (
            <fieldset>
              <legend>Days</legend>
              <div className="weekday-picker">
                {WEEKDAYS.map((day) => (
                  <button
                    key={day.value}
                    className={days.includes(day.value) ? 'is-active' : ''}
                    type="button"
                    aria-pressed={days.includes(day.value)}
                    aria-label={day.long}
                    onClick={() => toggleDay(day.value)}
                  >
                    {day.short.slice(0, 1)}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          <fieldset>
            <legend>Sound</legend>
            <div className="sound-list">
              {SOUND_PRESETS.map((preset) => (
                <div
                  key={preset.id}
                  className={`sound-option ${sound === preset.id ? 'is-active' : ''}`}
                >
                  <label>
                    <input
                      className="sr-only"
                      type="radio"
                      name="sound"
                      checked={sound === preset.id}
                      onChange={() => setSound(preset.id)}
                    />
                    <span>
                      <strong>{preset.name}</strong>
                      <small>{preset.description}</small>
                    </span>
                  </label>
                  <button
                    className="sound-preview"
                    type="button"
                    aria-label={`Preview ${preset.name}`}
                    onClick={(event) => {
                      event.preventDefault()
                      previewSound(preset.id)
                    }}
                  >
                    <Play size={17} fill="currentColor" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          </fieldset>

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <footer className="modal__actions">
            <button className="button button--ghost" type="button" onClick={onCancel}>
              Cancel
            </button>
            <button className="button button--primary" type="submit" disabled={saving}>
              {saving ? 'Saving…' : alarm ? 'Save changes' : 'Set alarm'}
            </button>
          </footer>
        </form>
      </section>
    </div>
  )
}
