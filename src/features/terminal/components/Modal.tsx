import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { CARD } from '../../../shared/ui/styles'

type ModalProps = { title: string; onClose: () => void; children: ReactNode }

/** Centered dialog over a dimmed backdrop; Esc and a backdrop click close it. */
export function Modal({ title, onClose, children }: ModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div role="dialog" aria-modal="true" aria-label={title} className={`${CARD} w-full max-w-md p-5`}>
        <h3 className="text-ink mb-4 text-base font-semibold tracking-tight">{title}</h3>
        {children}
      </div>
    </div>
  )
}
