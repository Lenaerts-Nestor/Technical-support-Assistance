import type { NoteMode } from '../types'

type ModeToggleProps = {
  mode: NoteMode
  onChange: (mode: NoteMode) => void
}

const OPTIONS: NoteMode[] = ['text', 'bullets']

/**
 * Segmented Text / Bullets switch on each note card. "Bullets" makes Copy notes
 * emit that section's lines as bullet points.
 */
export function ModeToggle({ mode, onChange }: ModeToggleProps) {
  return (
    <div className="border-line bg-canvas flex rounded-lg border p-0.5 text-xs font-medium">
      {OPTIONS.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`rounded-md px-2.5 py-1 capitalize transition-colors ${
            mode === opt
              ? 'bg-brand text-on-brand'
              : 'text-ink-muted hover:bg-subtle hover:text-ink'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}
