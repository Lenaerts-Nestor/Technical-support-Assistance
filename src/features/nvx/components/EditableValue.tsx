import { useState } from 'react'
import { GHOST_BTN, ICON_BTN, INPUT, SELECT } from '../../../shared/ui/styles'
import { isEditable } from '../nvxData'
import { PencilIcon } from './icons'
import type { SettingValue } from '../types'

type EditableValueProps = {
  path: string
  /** The value as the device sent it, so its kind (text, number, true/false) is known. */
  raw: unknown
  text: string
  /** Whether changes are allowed right now. */
  enabled: boolean
  /** Called with the new value when "Change…" is pressed; the page asks for confirmation. */
  onSubmit: (value: SettingValue) => void
}

/** A value in an answer. With changes allowed it has a pencil that turns it into a small editor for its kind. */
export function EditableValue({ path, raw, text, enabled, onSubmit }: EditableValueProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const kind = typeof raw

  if (!editing) {
    return (
      <span className="flex items-start gap-2">
        <span className="text-ink font-medium break-all">{text}</span>
        {enabled && isEditable(path, raw) && (
          <button
            type="button"
            className={`${ICON_BTN} shrink-0`}
            aria-label={`Change ${path}`}
            onClick={() => {
              setDraft(text)
              setEditing(true)
            }}
          >
            <PencilIcon className="h-3 w-3" />
          </button>
        )}
      </span>
    )
  }

  const parsed: SettingValue | null =
    kind === 'boolean' ? draft === 'true' : kind === 'number' ? (draft.trim() !== '' && Number.isFinite(Number(draft)) ? Number(draft) : null) : draft
  const changed = parsed !== null && parsed !== raw
  const submit = () => {
    if (parsed !== null && changed) {
      onSubmit(parsed)
      setEditing(false)
    }
  }

  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      {kind === 'boolean' ? (
        <select className={SELECT} value={draft} aria-label={`New value for ${path}`} onChange={(e) => setDraft(e.target.value)}>
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      ) : (
        <input
          className={`${INPUT} min-w-[12rem] flex-1 font-mono`}
          value={draft}
          autoFocus
          spellCheck={false}
          autoComplete="off"
          aria-label={`New value for ${path}`}
          aria-invalid={parsed === null}
          inputMode={kind === 'number' ? 'decimal' : undefined}
          onChange={(e) => setDraft(e.target.value)}
        />
      )}
      <button type="submit" className={GHOST_BTN} disabled={!changed}>
        Change…
      </button>
      <button type="button" className={GHOST_BTN} onClick={() => setEditing(false)}>
        Cancel
      </button>
      {parsed === null && <span className="text-xs text-rose-300">Enter a number.</span>}
    </form>
  )
}
