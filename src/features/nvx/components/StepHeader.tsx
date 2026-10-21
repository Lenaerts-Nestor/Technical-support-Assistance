import type { ReactNode } from 'react'
import { CARD_HEADER, SECTION_LABEL } from '../../../shared/ui/styles'
import { CheckIcon } from './icons'

/**
 * Where a step of the flow stands, which decides how loudly its number shouts:
 * `done` is satisfied (green tick), `next` is the one to do now (accent, glowing),
 * `idle` is waiting on an earlier step (quiet).
 */
export type StepState = 'done' | 'next' | 'idle'

const BADGE: Record<StepState, string> = {
  done: 'bg-emerald-400 text-emerald-950',
  next: 'bg-brand text-on-brand shadow-glow',
  idle: 'bg-field text-ink-soft ring-1 ring-line-strong',
}

type StepHeaderProps = {
  step: number
  title: string
  state: StepState
  /** A chip or short note beside the title: what this step needs, or that it is ready. */
  status?: ReactNode
  /** Buttons for the right end of the header. */
  children?: ReactNode
}

/** The header of one numbered step of the Device API flow: 1 Connect → 2 Choose what to send → 3 Results. */
export function StepHeader({ step, title, state, status, children }: StepHeaderProps) {
  return (
    <header className={`${CARD_HEADER} flex-wrap`}>
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
        <span aria-hidden="true" className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${BADGE[state]}`}>
          {state === 'done' ? <CheckIcon className="h-3.5 w-3.5" /> : step}
        </span>
        <h3 className={`${SECTION_LABEL} text-ink`}>
          <span className="sr-only">Step {step}: </span>
          {title}
        </h3>
        {status}
      </div>
      {children}
    </header>
  )
}

const CHIP_TONE = {
  ok: 'border-emerald-400/50 bg-emerald-400/15 text-emerald-200',
  warn: 'border-amber-400/60 bg-amber-400/15 text-amber-100',
  info: 'border-sky-400/50 bg-sky-400/15 text-sky-100',
  quiet: 'border-line-strong bg-field/60 text-ink-soft',
} as const

/** A small coloured pill for a step's status. */
export function StatusChip({ tone, pulse = false, children }: { tone: keyof typeof CHIP_TONE; pulse?: boolean; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-semibold ${CHIP_TONE[tone]}`}>
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full bg-current ${pulse ? 'animate-pulse' : ''}`} />
      {children}
    </span>
  )
}
