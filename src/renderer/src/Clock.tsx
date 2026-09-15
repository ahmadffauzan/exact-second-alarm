import { useEffect, useState } from 'react'

const timeFormatter = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

const dateFormatter = new Intl.DateTimeFormat('en', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  year: 'numeric',
})

export function Clock(): React.JSX.Element {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const update = (): void => setNow(new Date())
    const delay = 1_000 - (Date.now() % 1_000)
    let interval: number
    const timeout = window.setTimeout(() => {
      update()
      interval = window.setInterval(update, 1_000)
    }, delay)

    return () => {
      window.clearTimeout(timeout)
      window.clearInterval(interval)
    }
  }, [])

  const [hours, minutes, seconds] = timeFormatter.format(now).split(':')

  return (
    <section className="clock-card" aria-label="Current time">
      <div className="eyebrow">
        <span className="live-dot" aria-hidden="true" />
        Live local time
      </div>
      <div className="clock-time" role="timer" aria-label={timeFormatter.format(now)}>
        <span>{hours}</span>
        <span className="clock-colon">:</span>
        <span>{minutes}</span>
        <span className="clock-colon">:</span>
        <span className="clock-seconds">{seconds}</span>
      </div>
      <p className="clock-date">{dateFormatter.format(now)}</p>
    </section>
  )
}
