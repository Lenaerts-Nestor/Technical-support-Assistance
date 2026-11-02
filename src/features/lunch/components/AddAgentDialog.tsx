import { useState } from 'react'
import type { FormEvent } from 'react'
import { Modal } from '../../../shared/ui/Modal'
import { PlusIcon } from '../../../shared/ui/icons'
import { GHOST_BTN_MD, INPUT_LG, PRIMARY_BTN, SECTION_LABEL } from '../../../shared/ui/styles'
import type { AddResult } from '../useLunchPlanner'

type AddAgentDialogProps = {
  /** Adds the agent; the dialog closes only when it says `added`, otherwise it explains why not. */
  onAdd: (name: string) => AddResult
  onClose: () => void
}

/**
 * "Add agent" as a small popup, so the form takes no room in the agent table. Enter adds, Esc or a click
 * outside cancels; a duplicate or empty name is explained in place and the typed name is kept.
 */
export function AddAgentDialog({ onAdd, onClose }: AddAgentDialogProps) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const result = onAdd(name)
    if (result === 'added') onClose()
    else setError(result === 'duplicate' ? 'An agent with that name is already in the table.' : 'Type a name first.')
  }

  return (
    <Modal
      title="Add agent"
      onClose={onClose}
      className="max-w-sm"
      footer={
        <>
          <button type="button" className={GHOST_BTN_MD} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="add-agent-form" className={PRIMARY_BTN}>
            <PlusIcon className="h-4 w-4" />
            Add agent
          </button>
        </>
      }
    >
      <form id="add-agent-form" onSubmit={submit} noValidate>
        <label className="block">
          <span className={SECTION_LABEL}>Agent name</span>
          <input
            autoFocus
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setError('')
            }}
            placeholder="Agent name"
            aria-invalid={error !== ''}
            aria-describedby={error ? 'add-agent-error' : 'add-agent-hint'}
            className={`${INPUT_LG} mt-1.5`}
          />
        </label>
        {error ? (
          <p id="add-agent-error" role="alert" className="mt-2 text-sm font-semibold text-rose-300">
            {error}
          </p>
        ) : (
          <p id="add-agent-hint" className="text-ink-muted mt-2 text-xs">
            Languages, chat, early shift and availability are set in the table once the agent is added.
          </p>
        )}
      </form>
    </Modal>
  )
}
