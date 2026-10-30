import { useState } from 'react'
import { CountdownOverlay } from '../features/dashboard/CountdownOverlay'
import { TIMERS } from '../features/dashboard/timers'
import type { TimerKind } from '../features/dashboard/timers'
import { GHOST_BTN } from '../shared/ui/styles'

/** "Break" and "Lunch" buttons above "I am". Personal countdowns only: nothing is saved or shared. */
export function SidebarTimers({ compact }: { compact: boolean }) {
  const [active, setActive] = useState<TimerKind | null>(null)
  return (
    <>
      <div className={compact ? 'flex flex-col gap-1.5' : 'flex gap-2 px-3'}>
        {(Object.keys(TIMERS) as TimerKind[]).map((kind) => (
          <button
            key={kind}
            type="button"
            onClick={() => setActive(kind)}
            title={`${TIMERS[kind].label} — ${TIMERS[kind].minutes} minute timer`}
            aria-label={`Start ${TIMERS[kind].label.toLowerCase()} timer`}
            className={`${GHOST_BTN} ${compact ? 'px-0' : 'flex-1'}`}
          >
            {compact ? TIMERS[kind].label.charAt(0) : TIMERS[kind].label}
          </button>
        ))}
      </div>
      {active && <CountdownOverlay key={active} kind={active} onClose={() => setActive(null)} />}
    </>
  )
}
