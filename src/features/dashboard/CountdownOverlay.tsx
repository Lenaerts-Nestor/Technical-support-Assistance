import { useEffect, useRef, useState } from 'react'
import { TIMERS, formatCountdown } from './timers'
import type { TimerKind } from './timers'
import { PRIMARY_BTN } from '../../shared/ui/styles'

/** A full-window countdown over the page. Esc, the button or a click outside closes it. */
export function CountdownOverlay({ kind, onClose }: { kind: TimerKind; onClose: () => void }) {
  const { label, minutes, message } = TIMERS[kind]
  // Counted against a fixed end time, so a throttled background tab still shows the right figure.
  const [endsAt] = useState(() => Date.now() + minutes * 60_000)
  const [now, setNow] = useState(() => Date.now())
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    ref.current?.focus()
    const tick = window.setInterval(() => setNow(Date.now()), 250)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      window.clearInterval(tick)
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  const left = endsAt - now
  const done = left <= 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-6 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={`${label} timer`}
        className="flex flex-col items-center gap-6 text-center text-white focus:outline-none"
      >
        <p className="text-2xl font-bold tracking-tight sm:text-3xl">{done ? `Your ${label.toLowerCase()} is over` : message}</p>
        <p
          role="timer"
          aria-live="off"
          className={`text-[clamp(5rem,22vw,16rem)] leading-none font-black tracking-tight tabular-nums ${done ? 'text-rose-400' : ''}`}
        >
          {formatCountdown(left)}
        </p>
        <button type="button" onClick={onClose} className={`${PRIMARY_BTN} px-6 py-3 text-base`}>
          Close
        </button>
      </div>
    </div>
  )
}
