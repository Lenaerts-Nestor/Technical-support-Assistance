type AllowChangesProps = {
  on: boolean
  onChange: (on: boolean) => void
}

/** On when the page starts; switch it off to make the page read only. Every change still asks for a review. */
export function AllowChanges({ on, onChange }: AllowChangesProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      title={on ? 'Changes are allowed. Each one still asks you to confirm.' : 'Read only. Switch on to edit values on a device.'}
      className={`ml-auto flex items-center gap-2.5 rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors ${
        on ? 'border-brand bg-brand-soft text-brand-strong' : 'border-line text-ink-muted hover:text-ink'
      }`}
    >
      <span aria-hidden="true" className={`relative h-4 w-7 rounded-full transition-colors ${on ? 'bg-brand' : 'bg-line-strong'}`}>
        <span className={`bg-canvas absolute top-0.5 h-3 w-3 rounded-full transition-all ${on ? 'left-3.5' : 'left-0.5'}`} />
      </span>
      {on ? 'Changes allowed' : 'Read only'}
    </button>
  )
}
