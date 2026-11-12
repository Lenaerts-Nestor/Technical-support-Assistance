import { useState } from 'react'
import { GHOST_BTN, PRIMARY_BTN } from '../../shared/ui/styles'
import { CountdownOverlay } from './CountdownOverlay'
import { TIMERS } from './timers'
import type { TimerKind } from './timers'

/** "Break" and "Lunch" buttons, next to the lunch roster. Personal countdowns only: nothing is saved or shared. Lunch is the primary action. */
export function TimerButtons() {
  const [active, setActive] = useState<TimerKind | null>(null)
  return (
    <>
      <div className="flex gap-2">
        {(Object.keys(TIMERS) as TimerKind[]).map((kind) => (
          <button
            key={kind}
            type="button"
            onClick={() => setActive(kind)}
            title={`${TIMERS[kind].label} — ${TIMERS[kind].minutes} minute timer`}
            aria-label={`Start ${TIMERS[kind].label.toLowerCase()} timer`}
            className={kind === 'lunch' ? `${PRIMARY_BTN} !px-3 !py-1.5 !text-[13px]` : `${GHOST_BTN} !py-1.5`}
          >
            {TIMERS[kind].label}
          </button>
        ))}
      </div>
      {active && <CountdownOverlay key={active} kind={active} onClose={() => setActive(null)} />}
    </>
  )
}
