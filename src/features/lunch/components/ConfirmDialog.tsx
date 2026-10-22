import type { ReactNode } from 'react'
import { Modal } from '../../../shared/ui/Modal'
import { DANGER_BTN, GHOST_BTN_MD, PRIMARY_BTN } from '../../../shared/ui/styles'

type ConfirmDialogProps = {
  title: string
  children: ReactNode
  confirmLabel: string
  /** Styles the confirm button as destructive. */
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/** A yes/no question in the shared dialog. Esc or a click outside cancels. */
export function ConfirmDialog({ title, children, confirmLabel, danger, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <Modal
      title={title}
      onClose={onCancel}
      footer={
        <>
          <button type="button" className={GHOST_BTN_MD} onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className={danger ? DANGER_BTN : PRIMARY_BTN} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="text-ink-soft space-y-2 text-sm">{children}</div>
    </Modal>
  )
}
