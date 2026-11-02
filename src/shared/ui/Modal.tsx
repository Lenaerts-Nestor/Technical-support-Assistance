import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { CARD } from './styles'

type ModalProps = {
  title: string
  onClose: () => void
  children: ReactNode
  /** Buttons along the bottom edge. */
  footer?: ReactNode
  /** Width of the dialog; defaults to a form-sized `max-w-lg`. */
  className?: string
}

/** A centred dialog. Esc or a click outside closes it; focus starts on the dialog itself. */
export function Modal({ title, onClose, children, footer, className = 'max-w-lg' }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null)
  // The latest handler, so a parent that passes a new function on every render does not re-run the effect below.
  const closeRef = useRef(onClose)
  useEffect(() => {
    closeRef.current = onClose
  })

  useEffect(() => {
    // A field inside the dialog may already have asked for focus (autoFocus); do not take it away.
    if (!ref.current?.contains(document.activeElement)) ref.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeRef.current()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

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
        className={`${CARD} max-h-[80vh] w-full ${className} overflow-y-auto p-5 focus:outline-none`}
      >
        <h3 className="text-ink text-base font-semibold tracking-tight">{title}</h3>
        <div className="mt-3">{children}</div>
        {footer && <div className="mt-5 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  )
}
