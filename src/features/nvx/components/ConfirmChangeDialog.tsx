import { useState } from 'react'
import { Modal } from '../../../shared/ui/Modal'
import { CHIP, GHOST_BTN_MD, PRIMARY_BTN } from '../../../shared/ui/styles'
import { OUTCOME_LABEL } from '../nvxData'
import type { ChangeLogEntry, NvxUnit } from '../types'

export type PendingChange = {
  unit: NvxUnit
  /** The partial object that will be sent to /Device. */
  body: Record<string, unknown>
  /** One line per property, `path: old → new`. */
  lines: string[]
}

type ConfirmChangeDialogProps = {
  change: PendingChange
  onApply: () => Promise<ChangeLogEntry>
  onClose: () => void
}

const OUTCOME_STYLE = {
  applied: 'border-emerald-500/40 text-emerald-300',
  restart: 'border-amber-500/40 text-amber-300',
  failed: 'border-rose-500/40 text-rose-300',
} as const

/**
 * Shows exactly what is about to be sent and waits for a yes. Afterwards it shows what the device
 * said, in the device's own words, and what it now reports.
 */
export function ConfirmChangeDialog({ change, onApply, onClose }: ConfirmChangeDialogProps) {
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState<ChangeLogEntry | null>(null)
  const label = change.unit.label || change.unit.ip

  const apply = async () => {
    setSending(true)
    setDone(await onApply())
    setSending(false)
  }

  return (
    <Modal
      title={done ? `Change on ${label}` : `Change ${label}?`}
      onClose={onClose}
      footer={
        done ? (
          <button type="button" className={PRIMARY_BTN} onClick={onClose}>
            Close
          </button>
        ) : (
          <>
            <button type="button" className={GHOST_BTN_MD} disabled={sending} onClick={onClose}>
              Cancel
            </button>
            <button type="button" className={PRIMARY_BTN} disabled={sending} onClick={() => void apply()}>
              {sending ? 'Sending…' : 'Apply change'}
            </button>
          </>
        )
      }
    >
      <div className="space-y-3 text-sm">
        <p className="text-ink-muted">
          {label} <span className="font-mono text-xs">({change.unit.ip})</span>
        </p>
        <ul className="bg-canvas border-line space-y-1 rounded-md border p-3 font-mono text-xs break-all">
          {(done ? done.lines : change.lines).map((line) => (
            <li key={line} className="text-ink">
              {line}
            </li>
          ))}
        </ul>
        {done ? (
          <div className="space-y-2">
            <span className={`${CHIP} ${OUTCOME_STYLE[done.outcome]}`}>{OUTCOME_LABEL[done.outcome]}</span>
            <p className="text-ink-muted">{done.detail}</p>
          </div>
        ) : (
          <>
            <p className="text-ink-muted">This changes the device straight away. Some settings only take effect after a restart.</p>
            <details className="text-ink-muted">
              <summary className="cursor-pointer text-xs">What will be sent</summary>
              <pre className="bg-canvas border-line mt-2 max-h-48 overflow-auto rounded-md border p-3 font-mono text-xs whitespace-pre-wrap">
                POST /Device{'\n'}
                {JSON.stringify(change.body, null, 2)}
              </pre>
            </details>
          </>
        )}
      </div>
    </Modal>
  )
}
