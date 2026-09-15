import { useEffect, useMemo, useState } from 'react'
import { AlarmClock, Plus, ShieldCheck } from 'lucide-react'
import { Alarm, AlarmDraft, getNextOccurrence, RingEvent } from '@shared/alarm'
import { AlarmCard } from './AlarmCard'
import { AlarmForm } from './AlarmForm'
import { Clock } from './Clock'
import { RingingOverlay } from './RingingOverlay'

export default function App(): React.JSX.Element {
  const [alarms, setAlarms] = useState<Alarm[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Alarm | null | undefined>(undefined)
  const [ringQueue, setRingQueue] = useState<RingEvent[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    void window.alarmApi
      .list()
      .then(setAlarms)
      .catch(() => setError('Could not load your saved alarms.'))
      .finally(() => setLoading(false))

    const unsubscribeRing = window.alarmApi.onRing((event) => {
      setRingQueue((current) =>
        current.some(
          (item) => item.alarm.id === event.alarm.id && item.scheduledFor === event.scheduledFor,
        )
          ? current
          : [...current, event],
      )
      if (event.alarm.schedule.type === 'once') {
        setAlarms((current) =>
          current.map((alarm) =>
            alarm.id === event.alarm.id ? { ...alarm, enabled: false } : alarm,
          ),
        )
      }
    })
    const unsubscribeChanged = window.alarmApi.onChanged(setAlarms)

    return () => {
      unsubscribeRing()
      unsubscribeChanged()
    }
  }, [])

  const sortedAlarms = useMemo(
    () =>
      [...alarms].sort((left, right) => {
        if (left.enabled !== right.enabled) return left.enabled ? -1 : 1
        const leftTime = getNextOccurrence(left)?.getTime() ?? Number.MAX_SAFE_INTEGER
        const rightTime = getNextOccurrence(right)?.getTime() ?? Number.MAX_SAFE_INTEGER
        return leftTime - rightTime
      }),
    [alarms],
  )

  const update = async (action: () => Promise<Alarm[]>): Promise<void> => {
    setError('')
    try {
      setAlarms(await action())
    } catch {
      setError('Something went wrong. Your change was not saved.')
    }
  }

  const save = async (draft: AlarmDraft): Promise<void> => {
    const updated = await window.alarmApi.save(draft)
    setAlarms(updated)
    setEditing(undefined)
  }

  const remove = async (alarm: Alarm): Promise<void> => {
    if (!window.confirm(`Delete “${alarm.label}”?`)) return
    await update(() => window.alarmApi.remove(alarm.id))
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <a className="brand" href="#main" aria-label="Exact Second home">
          <span className="brand__mark">
            <AlarmClock size={25} strokeWidth={3} aria-hidden="true" />
          </span>
          <span>
            EXACT
            <br />
            SECOND
          </span>
        </a>
        <div className="precision-note">
          <ShieldCheck size={18} strokeWidth={3} aria-hidden="true" />
          <span>
            ARMED LOCALLY
            <small>Keep the app open or minimized</small>
          </span>
        </div>
      </header>

      <main id="main">
        <Clock />

        <section className="alarm-section" aria-labelledby="alarm-heading">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Your schedule</p>
              <h1 id="alarm-heading">
                Alarms <span>{alarms.length.toString().padStart(2, '0')}</span>
              </h1>
            </div>
            <button
              className="button button--primary"
              type="button"
              onClick={() => setEditing(null)}
            >
              <Plus size={21} strokeWidth={3.5} aria-hidden="true" />
              New alarm
            </button>
          </div>

          {error && (
            <p className="page-error" role="alert">
              {error}
            </p>
          )}

          {loading ? (
            <div className="loading-state">Loading your alarms…</div>
          ) : sortedAlarms.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon" aria-hidden="true">
                <AlarmClock size={48} strokeWidth={2.5} />
              </div>
              <h2>Quiet for now.</h2>
              <p>Create an alarm and choose the exact second it should ring.</p>
              <button
                className="button button--primary"
                type="button"
                onClick={() => setEditing(null)}
              >
                <Plus size={20} strokeWidth={3.5} aria-hidden="true" />
                Create first alarm
              </button>
            </div>
          ) : (
            <div className="alarm-grid">
              {sortedAlarms.map((alarm) => (
                <AlarmCard
                  key={alarm.id}
                  alarm={alarm}
                  onEdit={setEditing}
                  onDelete={(item) => void remove(item)}
                  onToggle={(item, enabled) =>
                    void update(() => window.alarmApi.setEnabled(item.id, enabled))
                  }
                />
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="app-footer">
        <span>Exact Second v1.0</span>
        <span>Windows · Local only · No snooze</span>
      </footer>

      {editing !== undefined && (
        <AlarmForm alarm={editing} onCancel={() => setEditing(undefined)} onSave={save} />
      )}
      {ringQueue[0] && (
        <RingingOverlay
          event={ringQueue[0]}
          onDismiss={() => setRingQueue((current) => current.slice(1))}
        />
      )}
    </div>
  )
}
