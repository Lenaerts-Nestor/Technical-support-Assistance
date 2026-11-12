import { clock, lunchAlert } from '../features/dashboard/dashboardData'
import { useMinute } from '../features/dashboard/useMinute'
import { useSharedShift } from '../features/shift/sharedShiftContext'

/**
 * Tells the user their lunch is close: it blinks from 10 minutes before their shift's lunch window and
 * goes away 10 minutes after it started. Nothing to dismiss; it needs "I am" and today's published shifts.
 * With reduced motion it simply stays lit (see index.css).
 */
export function SidebarLunchAlert({ compact }: { compact: boolean }) {
  const { myShift } = useSharedShift()
  const alert = lunchAlert(myShift, useMinute())
  if (!alert || !myShift) return null

  const title = alert.phase === 'soon' ? 'Lunch soon' : "It's lunch time"
  const detail =
    alert.phase === 'soon'
      ? `Shift ${myShift} starts in ${alert.minutes} ${alert.minutes === 1 ? 'minute' : 'minutes'} (${clock(alert.start)})`
      : `Shift ${myShift} lunch started at ${clock(alert.start)}`
  const bell = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0" aria-hidden="true">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  )

  if (compact) {
    return (
      <div
        role="status"
        title={`${title}: ${detail}`}
        aria-label={`${title}: ${detail}`}
        className="lunch-blink border-warning/60 bg-warning-surface text-warning mx-auto flex h-9 w-9 items-center justify-center rounded-lg border"
      >
        {bell}
      </div>
    )
  }

  return (
    <div
      role="status"
      className="lunch-blink border-warning/60 bg-warning-surface flex items-center gap-2.5 rounded-xl border px-3 py-2.5"
    >
      <span className="text-warning">{bell}</span>
      <div className="min-w-0">
        <p className="text-ink text-[13px] leading-tight font-bold">{title}</p>
        <p className="text-ink-soft mt-0.5 text-[11px] leading-snug">{detail}</p>
      </div>
    </div>
  )
}
