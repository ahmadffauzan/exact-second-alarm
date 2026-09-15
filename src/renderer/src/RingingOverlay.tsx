import { useEffect, useState } from 'react'
import { BellRing } from 'lucide-react'
import { RingEvent } from '@shared/alarm'
import { startAlarmSound } from './sound'

interface RingingOverlayProps {
  event: RingEvent
  onDismiss: () => void
}

export function RingingOverlay({ event, onDismiss }: RingingOverlayProps): React.JSX.Element {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const stop = startAlarmSound(event.alarm.sound)
    const timer = window.setInterval(() => setNow(new Date()), 250)
    return () => {
      stop()
      window.clearInterval(timer)
    }
  }, [event])

  const time = [now.getHours(), now.getMinutes(), now.getSeconds()]
    .map((part) => String(part).padStart(2, '0'))
    .join(':')

  return (
    <section className="ringing" role="alertdialog" aria-modal="true" aria-labelledby="ring-title">
      <div className="ringing__burst" aria-hidden="true">
        <BellRing size={80} strokeWidth={2.5} />
      </div>
      <p className="ringing__kicker">Alarm ringing</p>
      <h2 id="ring-title">{event.alarm.label}</h2>
      <p className="ringing__time">{time}</p>
      <p className="ringing__scheduled">SET FOR {event.alarm.time}</p>
      <button className="button button--dismiss" type="button" onClick={onDismiss} autoFocus>
        Dismiss alarm
      </button>
    </section>
  )
}
