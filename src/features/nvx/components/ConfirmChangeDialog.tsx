import { useState } from 'react'
import { Modal } from '../../../shared/ui/Modal'
import { CHIP, GHOST_BTN_MD, PRIMARY_BTN } from '../../../shared/ui/styles'
import { OUTCOME_LABEL, describeForm, formatHeaderLines } from '../nvxData'
import type { ChangeLogEntry, DeviceRequest, NvxUnit } from '../types'

export type PendingRequest = {
  unit: NvxUnit
  request: DeviceRequest
  /** Things worth reading before sending (an empty object, which the device deletes). Nothing is blocked. */
  warnings: string[]
  /** For a change to properties: one line each, `path: old → new`. */
  lines: string[]
  /** The request carries the edits collected in the results table, which are cleared once it has been applied. */
  fromEdits?: boolean
}

type ConfirmChangeDialogProps = {
  pending: PendingRequest
  onSend: () => Promise<ChangeLogEntry>
  onClose: () => void
}

const OUTCOME_STYLE = {
  applied: 'border-emerald-500/40 text-emerald-300',
  restart: 'border-amber-500/40 text-amber-300',
  failed: 'border-rose-500/40 text-rose-300',
} as const

/** The body as it will go: indented when it is JSON, as typed otherwise. */
function showBody(body: string): string {
  try {
    return JSON.stringify(JSON.parse(body) as unknown, null, 2)
  } catch {
    return body
  }
}

/**
 * Shows exactly what is about to be sent, with a warning for anything risky, and waits for a yes.
 * Afterwards it shows what the device said, in the device's own words.
 */
export function ConfirmChangeDialog({ pending, onSend, onClose }: ConfirmChangeDialogProps) {
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState<ChangeLogEntry | null>(null)
  const { unit, request, warnings, lines } = pending
  const label = unit.label || unit.ip
  const headers = formatHeaderLines(request.headers)

  const send = async () => {
    setSending(true)
    setDone(await onSend())
    setSending(false)
  }

  return (
    <Modal
      title={done ? `Sent to ${label}` : `Send to ${label}?`}
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
            <button type="button" className={PRIMARY_BTN} disabled={sending} onClick={() => void send()}>
              {sending ? 'Sending…' : warnings.length > 0 ? 'Send anyway' : 'Send'}
            </button>
          </>
        )
      }
    >
      <div className="space-y-3 text-sm">
        <p className="text-ink-muted">
          {label} <span className="font-mono text-xs">({unit.ip})</span>
        </p>
        {!done && (
          <>
            <pre className="bg-canvas border-line max-h-60 overflow-auto rounded-md border p-3 font-mono text-xs whitespace-pre-wrap">
              <span className="text-amber-300 font-bold">{request.method}</span> {request.path}
              {headers && `\n${headers}`}
              {request.form ? `\n\nform-data\n${describeForm(request.form).join('\n')}` : request.body && `\n\n${showBody(request.body)}`}
            </pre>
            {lines.length > 0 && (
              <ul className="space-y-1 font-mono text-xs break-all">
                {lines.map((line) => (
                  <li key={line} className="text-ink">
                    {line}
                  </li>
                ))}
              </ul>
            )}
            {warnings.length > 0 && (
              <div role="alert" className="rounded-md border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-amber-200">
                {warnings.map((w) => (
                  <p key={w}>{w}</p>
                ))}
              </div>
            )}
            <p className="text-ink-muted">This goes to the device straight away. Some settings only take effect after a restart.</p>
          </>
        )}
        {done && (
          <div className="space-y-2">
            <ul className="bg-canvas border-line space-y-1 rounded-md border p-3 font-mono text-xs break-all">
              {done.lines.map((line) => (
                <li key={line} className="text-ink">
                  {line}
                </li>
              ))}
            </ul>
            <span className={`${CHIP} ${OUTCOME_STYLE[done.outcome]}`}>{OUTCOME_LABEL[done.outcome]}</span>
            <p className="text-ink-muted break-words">{done.detail}</p>
          </div>
        )}
      </div>
    </Modal>
  )
}
