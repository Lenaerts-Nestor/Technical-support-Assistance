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
    <div className="flex rounded-md bg-white/70 p-0.5 text-xs font-medium ring-1 ring-inset ring-black/5">
      {OPTIONS.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`rounded px-2 py-1 capitalize transition-colors ${
            mode === opt
              ? 'bg-slate-900 text-white'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}
