import { useState } from 'react'
import type { ReactNode } from 'react'
import { Modal } from '../../../shared/ui/Modal'
import { GHOST_BTN_MD, PRIMARY_BTN } from '../../../shared/ui/styles'

export type ImportMode<M extends string> = {
  id: M
  label: string
  description: string
  disabled?: boolean
}

type ImportDialogProps<M extends string> = {
  title: string
  /** What was found, in a sentence or two. */
  summary: ReactNode
  /** Leave empty when there is nothing to choose — the dialog is then a plain confirmation. */
  modes?: ImportMode<M>[]
  confirmLabel: string
  onConfirm: (mode: M) => void
  onCancel: () => void
}

/** "Here is what the file holds — how should it come in?" with the options as radio buttons. */
export function ImportDialog<M extends string>({
  title,
  summary,
  modes = [],
  confirmLabel,
  onConfirm,
  onCancel,
}: ImportDialogProps<M>) {
  const [mode, setMode] = useState<M | null>(modes.find((m) => !m.disabled)?.id ?? null)

  return (
    <Modal
      title={title}
      onClose={onCancel}
      footer={
        <>
          <button type="button" onClick={onCancel} className={GHOST_BTN_MD}>
            Cancel
          </button>
          <button
            type="button"
            disabled={modes.length > 0 && mode === null}
            onClick={() => onConfirm(mode as M)}
            className={PRIMARY_BTN}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="text-ink-muted space-y-3 text-sm leading-relaxed">
        <div>{summary}</div>
        {modes.length > 0 && (
          <fieldset className="space-y-2">
            <legend className="sr-only">How to import</legend>
            {modes.map((m) => (
              <label
                key={m.id}
                className={`border-line flex items-start gap-2.5 rounded-lg border p-2.5 ${
                  m.disabled ? 'opacity-50' : 'hover:bg-subtle cursor-pointer'
                } ${mode === m.id ? 'border-brand-line bg-brand-soft' : ''}`}
              >
                <input
                  type="radio"
                  name="import-mode"
                  className="mt-1"
                  disabled={m.disabled}
                  checked={mode === m.id}
                  onChange={() => setMode(m.id)}
                />
                <span>
                  <span className="text-ink block font-medium">{m.label}</span>
                  <span className="text-xs">{m.description}</span>
                </span>
              </label>
            ))}
          </fieldset>
        )}
      </div>
    </Modal>
  )
}
