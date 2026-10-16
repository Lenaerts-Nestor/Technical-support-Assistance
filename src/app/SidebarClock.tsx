import { useEffect, useState } from 'react'

/** 24-hour "HH:MM", zero-padded so it never shifts width ("09:05", "14:13"). */
function formatTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** The current time, ticking over on the minute. */
function useClock(): string {
  const [time, setTime] = useState(() => formatTime(new Date()))
  useEffect(() => {
    const id = window.setInterval(() => setTime(formatTime(new Date())), 1000)
    return () => window.clearInterval(id)
  }, [])
  return time
}

/** Big, heavy 24h clock for the top of the sidebar. */
export function SidebarClock({ compact }: { compact: boolean }) {
  const time = useClock()
  return (
    <time
      dateTime={time}
      title="Current time"
      className={`text-brand-strong font-mono leading-none font-extrabold tracking-tight tabular-nums ${
        compact ? 'text-sm' : 'text-3xl'
      }`}
    >
      {time}
    </time>
  )
}
