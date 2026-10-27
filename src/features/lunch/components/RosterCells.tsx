import { useState } from 'react'
import { LANGUAGES } from '../config'
import { knownLanguages } from '../coverage'
import type { Agent, ShiftNo } from '../types'
import { INPUT } from '../../../shared/ui/styles'

/** The editable cells of the roster table. One small component per kind of value. */

const FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'

type NameCellProps = {
  agent: Agent
  /** True when another agent already has this name. */
  isTaken: (name: string, exceptId: string) => boolean
  onRename: (name: string) => void
}

/** Edits on blur or Enter. An empty or duplicate name is refused: the old one comes back. */
export function NameCell({ agent, isTaken, onRename }: NameCellProps) {
  const [draft, setDraft] = useState<string | null>(null)
  const value = draft ?? agent.name
  const invalid = draft !== null && (draft.trim() === '' || isTaken(draft, agent.id))

  const commit = () => {
    if (draft !== null && !invalid && draft.trim() !== agent.name) onRename(draft.trim())
    setDraft(null)
  }
  return (
    <input
      value={value}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape') {
          setDraft(null)
          e.currentTarget.blur()
        }
      }}
      aria-label="Agent name"
      aria-invalid={invalid}
      title={invalid ? 'Needs a name that no other agent has' : undefined}
      className={`${INPUT} min-w-36 ${invalid ? '!border-rose-400/80' : ''}`}
    />
  )
}

type LanguageCellProps = { agent: Agent; agents: Agent[]; onChange: (languages: string[]) => void }

/** Every language as a toggle, so a multi-select needs no popup and works from the keyboard. */
export function LanguageCell({ agent, agents, onChange }: LanguageCellProps) {
  const codes = new Map(LANGUAGES.map((l) => [l.name, l.code]))
  return (
    <div role="group" aria-label={`Languages of ${agent.name}`} className="flex flex-wrap gap-1">
      {knownLanguages(agents).map((language) => {
        const on = agent.languages.includes(language)
        return (
          <button
            key={language}
            type="button"
            aria-pressed={on}
            title={language}
            aria-label={language}
            onClick={() => onChange(on ? agent.languages.filter((l) => l !== language) : [...agent.languages, language])}
            className={`${FOCUS} rounded-md border px-1.5 py-0.5 text-[11px] font-bold tracking-wide transition-colors ${
              on
                ? 'border-brand-line bg-brand-soft text-brand-strong'
                : 'border-line text-ink-faint hover:border-line-strong hover:text-ink-soft'
            }`}
          >
            {codes.get(language) ?? language}
          </button>
        )
      })}
    </div>
  )
}

type YesNoCellProps = { label: string; on: boolean; onChange: (on: boolean) => void }

/** A Yes/No switch. The label is read out together with the agent's name. */
export function YesNoCell({ label, on, onChange }: YesNoCellProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`${FOCUS} w-14 rounded-md border px-2 py-1 text-xs font-bold transition-colors ${
        on
          ? 'border-emerald-400/60 bg-emerald-400/15 text-emerald-200'
          : 'border-line-strong bg-field/60 text-ink-muted hover:text-ink'
      }`}
    >
      {on ? 'Yes' : 'No'}
    </button>
  )
}

type ShiftCellProps = { label: string; value: ShiftNo | null; onChange: (value: ShiftNo | null) => void }

const SHIFT_BUTTON: Record<ShiftNo, string> = {
  1: 'border-sky-300 bg-sky-400 text-sky-950 shadow-[0_0_0_1px_rgb(125_211_252/0.5)]',
  2: 'border-green-300 bg-green-400 text-green-950 shadow-[0_0_0_1px_rgb(134_239_172/0.5)]',
}

/** Shift 1 / Shift 2 as two buttons side by side. Pressing the lit one again clears the value. */
export function ShiftCell({ label, value, onChange }: ShiftCellProps) {
  return (
    <div role="group" aria-label={label} className="inline-flex gap-1">
      {([1, 2] as const).map((shift) => {
        const on = value === shift
        return (
          <button
            key={shift}
            type="button"
            aria-pressed={on}
            aria-label={`Shift ${shift}`}
            title={on ? `Shift ${shift} (click to clear)` : `Shift ${shift}`}
            onClick={() => onChange(on ? null : shift)}
            className={`${FOCUS} w-9 rounded-md border px-2 py-1 text-xs font-extrabold transition-colors ${
              on ? SHIFT_BUTTON[shift] : 'border-line-strong bg-field/60 text-ink-muted hover:text-ink'
            }`}
          >
            {shift}
          </button>
        )
      })}
    </div>
  )
}
