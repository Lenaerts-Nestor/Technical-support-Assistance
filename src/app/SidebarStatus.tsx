import { useEffect, useState } from 'react'
import { useSharedShift } from '../features/shift/sharedShiftContext'

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

/**
 * The live clock and the lunch shift the user is on, in one badge at the top of the sidebar.
 * The shift shows once today's shifts are published and the user has said who they are.
 */
export function SidebarStatus({ compact }: { compact: boolean }) {
  const time = useClock()
  const { myShift } = useSharedShift()
  const shiftText = myShift ? `You are on Shift ${myShift}` : 'No lunch shift set'

  const clock = (
    <time dateTime={time} title="Current time" className="text-ink font-mono font-bold tracking-tight tabular-nums">
      {time}
    </time>
  )

  if (compact) {
    return (
      <div className="flex flex-col items-center gap-1.5">
        <span className="text-sm leading-none">{clock}</span>
        {myShift && (
          <span
            role="status"
            title={shiftText}
            aria-label={shiftText}
            className="bg-brand-soft text-brand-strong border-brand-line rounded-md border px-1.5 py-1 text-[11px] leading-none font-extrabold"
          >
            S{myShift}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="border-line-strong bg-surface-hi flex min-w-0 flex-1 items-center justify-between gap-2 rounded-xl border px-3 py-2">
      <span role="status" aria-label={shiftText} className="flex min-w-0 items-center gap-2">
        <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${myShift ? 'bg-success' : 'bg-ink-faint'}`} />
        <span
          className={`truncate text-[11px] font-bold tracking-[0.12em] uppercase ${myShift ? 'text-brand-strong' : 'text-ink-muted'}`}
        >
          {myShift ? `Shift ${String(myShift).padStart(2, '0')}` : 'No shift'}
        </span>
      </span>
      <span className="text-sm">{clock}</span>
    </div>
  )
}
