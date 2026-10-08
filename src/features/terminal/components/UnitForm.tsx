import { useState } from 'react'
import type { FormEvent } from 'react'
import type { UnitDraft } from '../useUnits'
import { Modal } from './Modal'
import { GHOST_BTN_MD, INPUT_LG, PRIMARY_BTN, SECTION_LABEL } from '../../../shared/ui/styles'

type UnitFormProps = {
  /** Present when editing an existing card. */
  initial?: UnitDraft
  onSave: (draft: UnitDraft) => void
  onCancel: () => void
}

/** Add / edit a unit card: a name and an address — never credentials. */
export function UnitForm({ initial, onSave, onCancel }: UnitFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [host, setHost] = useState(initial?.host ?? '')
  const [port, setPort] = useState(String(initial?.port ?? 22))
  const [model, setModel] = useState(initial?.model ?? '')

  const portNumber = Number(port)
  const portValid = Number.isInteger(portNumber) && portNumber >= 1 && portNumber <= 65535
  const valid = host.trim() !== '' && portValid

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!valid) return
    onSave({
      name: name.trim() || host.trim(),
      host: host.trim(),
      port: portNumber,
      model: model.trim(),
    })
  }

  return (
    <Modal title={initial ? 'Edit unit' : 'Add unit'} onClose={onCancel}>
      <form onSubmit={submit} className="space-y-3">
        <label className="block space-y-1">
          <span className={SECTION_LABEL}>Name</span>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Lobby NVX"
            className={INPUT_LG}
          />
        </label>
        <div className="grid grid-cols-[1fr_6rem] gap-3">
          <label className="block space-y-1">
            <span className={SECTION_LABEL}>IP address</span>
            <input
              value={host}
              onChange={(e) => setHost(e.target.value)}
              placeholder="192.168.1.50"
              spellCheck={false}
              className={INPUT_LG}
            />
          </label>
          <label className="block space-y-1">
            <span className={SECTION_LABEL}>Port</span>
            <input
              value={port}
              onChange={(e) => setPort(e.target.value)}
              inputMode="numeric"
              className={INPUT_LG}
            />
          </label>
        </div>
        <label className="block space-y-1">
          <span className={SECTION_LABEL}>Model (optional)</span>
          <input
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="NVX"
            className={INPUT_LG}
          />
        </label>
        <p className="text-ink-faint text-xs">
          The username and password are asked for when you open a terminal and are never saved.
        </p>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onCancel} className={GHOST_BTN_MD}>
            Cancel
          </button>
          <button type="submit" disabled={!valid} className={`${PRIMARY_BTN} disabled:opacity-40`}>
            {initial ? 'Save' : 'Add unit'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
