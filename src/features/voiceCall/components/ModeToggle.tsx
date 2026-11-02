import type { NoteMode } from '../types'

type ModeToggleProps = {
  mode: NoteMode
  onChange: (mode: NoteMode) => void
}

const OPTIONS: NoteMode[] = ['text', 'bullets']

/**
 * Segmented Text / Bullets switch on each note card. "Bullets" makes Copy notes
 * emit that section's lines as bullet points. The chosen side is raised and bold
 * as well as lighter, so it does not rely on colour.
 */
export function ModeToggle({ mode, onChange }: ModeToggleProps) {
  return (
    <div role="group" aria-label="Note format" className="border-line bg-field flex rounded-lg border p-0.5 text-xs">
      {OPTIONS.map((opt) => (
        <button
          key={opt}
          type="button"
          aria-pressed={mode === opt}
          onClick={() => onChange(opt)}
          className={`rounded-md border px-2.5 py-1 capitalize transition-colors ${
            mode === opt
              ? 'border-line-strong bg-surface-hi text-ink font-bold shadow-btn-soft'
              : 'text-ink-muted hover:text-ink border-transparent font-medium'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}
