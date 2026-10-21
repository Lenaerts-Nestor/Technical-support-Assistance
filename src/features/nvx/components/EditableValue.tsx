import { useState } from 'react'
import { ICON_BTN, INPUT, SELECT } from '../../../shared/ui/styles'
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
  /** The new value waiting to be sent with the other edits, if this one has been edited. */
  pending: SettingValue | undefined
  /** Set the new value, or `undefined` to take the edit back. Nothing is sent until the edits are reviewed together. */
  onEdit: (value: SettingValue | undefined) => void
}

/**
 * A value in an answer. With changes allowed it has a pencil that turns it into a small editor for its
 * kind. An edit is only collected (shown beside the old value); the edits of a unit are sent together.
 */
export function EditableValue({ path, raw, text, enabled, pending, onEdit }: EditableValueProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const kind = typeof raw

  if (!editing) {
    const edited = pending !== undefined
    return (
      <span className="flex flex-wrap items-start gap-x-2 gap-y-0.5">
        {edited ? (
          <>
            <span className="text-brand-strong font-semibold break-all">{String(pending)}</span>
            <span className="text-ink-faint break-all line-through">{text}</span>
          </>
        ) : (
          <span className="text-ink font-medium break-all">{text}</span>
        )}
        {enabled && isEditable(path, raw) && (
          <span className="flex shrink-0 gap-1">
            <button
              type="button"
              className={ICON_BTN}
              aria-label={`Change ${path}`}
              onClick={() => {
                setDraft(edited ? String(pending) : text)
                setEditing(true)
              }}
            >
              <PencilIcon className="h-3 w-3" />
            </button>
            {edited && (
              <button type="button" className={`${ICON_BTN} px-1.5 leading-none`} aria-label={`Undo the change to ${path}`} title="Undo this change" onClick={() => onEdit(undefined)}>
                ×
              </button>
            )}
          </span>
        )}
      </span>
    )
  }

  const parsed: SettingValue | null =
    kind === 'boolean' ? draft === 'true' : kind === 'number' ? (draft.trim() !== '' && Number.isFinite(Number(draft)) ? Number(draft) : null) : draft
  /** Keep what was typed as an edit (or drop the edit when it is the device's own value again) and close the editor. */
  const commit = () => {
    if (parsed !== null) onEdit(parsed === raw ? undefined : parsed)
    setEditing(false)
  }

  return (
    <span className="flex flex-wrap items-center gap-2">
      {kind === 'boolean' ? (
        <select
          className={SELECT}
          value={draft}
          autoFocus
          aria-label={`New value for ${path}`}
          onChange={(e) => {
            const next = e.target.value === 'true'
            onEdit(next === raw ? undefined : next)
            setEditing(false)
          }}
          onBlur={() => setEditing(false)}
        >
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
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commit()
            } else if (e.key === 'Escape') {
              e.preventDefault()
              setEditing(false)
            }
          }}
        />
      )}
      {parsed === null && <span className="text-xs text-rose-300">Enter a number.</span>}
    </span>
  )
}
