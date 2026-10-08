import { useState } from 'react'
import type { FormEvent } from 'react'
import type { Credentials, Unit } from '../types'
import { Modal } from './Modal'
import { GHOST_BTN_MD, INPUT_LG, PRIMARY_BTN, SECTION_LABEL } from '../../../shared/ui/styles'

type ConnectDialogProps = {
  unit: Unit
  /** Pre-filled from an earlier terminal on this unit in the same visit. */
  initial?: Credentials
  onConnect: (credentials: Credentials) => void
  onCancel: () => void
}

/** Asks for the username and password each time; they are never written down. */
export function ConnectDialog({ unit, initial, onConnect, onCancel }: ConnectDialogProps) {
  const [username, setUsername] = useState(initial?.username ?? '')
  const [password, setPassword] = useState(initial?.password ?? '')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (username) onConnect({ username, password })
  }

  return (
    <Modal title={`Connect to ${unit.name}`} onClose={onCancel}>
      <form onSubmit={submit} className="space-y-3">
        <p className="text-ink-muted text-xs">
          {unit.host}:{unit.port}
        </p>
        <label className="block space-y-1">
          <span className={SECTION_LABEL}>Username</span>
          <input
            autoFocus={!initial?.username}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            className={INPUT_LG}
          />
        </label>
        <label className="block space-y-1">
          <span className={SECTION_LABEL}>Password</span>
          <input
            autoFocus={!!initial?.username}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="off"
            className={INPUT_LG}
          />
        </label>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onCancel} className={GHOST_BTN_MD}>
            Cancel
          </button>
          <button type="submit" disabled={!username} className={`${PRIMARY_BTN} disabled:opacity-40`}>
            Connect
          </button>
        </div>
      </form>
    </Modal>
  )
}
