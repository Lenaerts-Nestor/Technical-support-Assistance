import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { XIcon } from '../components/icons'

/**
 * A step screenshot that stays a tidy thumbnail in the flow of the guide and
 * opens full size on click — small UI in a screenshot is unreadable at card width.
 */
export function ImageZoom({ src, alt }: { src: string; alt: string }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Click to enlarge"
        className="group border-line hover:border-brand-line relative block max-w-full cursor-zoom-in overflow-hidden rounded-lg border transition-colors"
      >
        <img src={src} alt={alt} className="block max-h-72 max-w-full" />
        <span className="bg-canvas/85 text-ink-muted group-hover:text-ink absolute right-2 bottom-2 rounded-md px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase">
          Enlarge
        </span>
      </button>
      {open &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={alt}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-black/80 p-6"
          >
            <img
              src={src}
              alt={alt}
              className="border-line-strong max-h-full max-w-full rounded-lg border object-contain shadow-2xl"
            />
            <button
              type="button"
              aria-label="Close"
              onClick={() => setOpen(false)}
              className="bg-surface text-ink-muted hover:text-ink border-line absolute top-4 right-4 rounded-lg border p-2"
            >
              <XIcon className="h-5 w-5" />
            </button>
          </div>,
          document.body,
        )}
    </>
  )
}
