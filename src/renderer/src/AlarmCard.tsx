import { CalendarDays, Pencil, Trash2 } from 'lucide-react'
import { Alarm, describeSchedule, getNextOccurrence } from '@shared/alarm'

interface AlarmCardProps {
  alarm: Alarm
  onEdit: (alarm: Alarm) => void
  onDelete: (alarm: Alarm) => void
  onToggle: (alarm: Alarm, enabled: boolean) => void
}

const nextFormatter = new Intl.DateTimeFormat('en', {
  weekday: 'short',
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

export function AlarmCard({
  alarm,
  onEdit,
  onDelete,
  onToggle,
}: AlarmCardProps): React.JSX.Element {
  const next = getNextOccurrence(alarm)

  return (
    <article className={`alarm-card ${alarm.enabled ? '' : 'alarm-card--disabled'}`}>
      <div className="alarm-card__top">
        <span className="alarm-label">{alarm.label}</span>
        <label className="toggle">
          <span className="sr-only">
            {alarm.enabled ? 'Disable' : 'Enable'} {alarm.label}
          </span>
          <input
            type="checkbox"
            checked={alarm.enabled}
            onChange={(event) => onToggle(alarm, event.target.checked)}
          />
          <span className="toggle__track" aria-hidden="true">
            <span className="toggle__thumb" />
          </span>
        </label>
      </div>

      <p className="alarm-time">{alarm.time}</p>

      <div className="alarm-meta">
        <span>
          <CalendarDays size={16} strokeWidth={3} aria-hidden="true" />
          {describeSchedule(alarm.schedule)}
        </span>
        <span className={`status ${alarm.enabled ? 'status--on' : ''}`}>
          {alarm.enabled ? 'Armed' : 'Off'}
        </span>
      </div>

      <div className="next-ring">
        {next ? `NEXT · ${nextFormatter.format(next)}` : 'NO UPCOMING RING'}
      </div>

      <div className="alarm-actions">
        <button className="button button--small" type="button" onClick={() => onEdit(alarm)}>
          <Pencil size={17} strokeWidth={3} aria-hidden="true" />
          Edit
        </button>
        <button
          className="icon-button icon-button--danger"
          type="button"
          aria-label={`Delete ${alarm.label}`}
          onClick={() => onDelete(alarm)}
        >
          <Trash2 size={19} strokeWidth={3} aria-hidden="true" />
        </button>
      </div>
    </article>
  )
}
