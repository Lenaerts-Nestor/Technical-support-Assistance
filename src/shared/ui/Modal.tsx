import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { CARD } from './styles'

type ModalProps = {
  title: string
  onClose: () => void
  children: ReactNode
  /** Buttons along the bottom edge. */
  footer?: ReactNode
}

/** A centred dialog. Esc or a click outside closes it; focus starts on the dialog itself. */
export function Modal({ title, onClose, children, footer }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    ref.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-6 pt-[10vh]"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`${CARD} max-h-[80vh] w-full max-w-lg overflow-y-auto p-5 focus:outline-none`}
      >
        <h3 className="text-ink text-base font-semibold tracking-tight">{title}</h3>
        <div className="mt-3">{children}</div>
        {footer && <div className="mt-5 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  )
}
