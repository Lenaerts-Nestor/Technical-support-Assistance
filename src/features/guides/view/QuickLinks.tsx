import { useEffect, useRef, useState } from 'react'
import { ChevronDownIcon, ExternalLinkIcon, LinkIcon } from '../components/icons'
import { GHOST_BTN_MD } from '../../../shared/ui/styles'
import type { GuideLink } from '../types'

const host = (url: string) => {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}

/**
 * External reference links as a dropdown in the guide's top bar: out of the
 * way while reading, one click away when needed. Closes on Escape, on a click
 * elsewhere, and after a link is followed.
 */
export function QuickLinksMenu({ links }: { links: GuideLink[] }) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (links.length === 0) return null

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`${GHOST_BTN_MD} ${open ? 'border-line-strong bg-subtle text-ink' : ''}`}
      >
        <LinkIcon className="h-4 w-4" />
        Quick links
        <span className="bg-subtle text-ink-muted rounded px-1.5 text-[11px] font-semibold">
          {links.length}
        </span>
        <ChevronDownIcon className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="menu"
          className="border-line-strong bg-surface shadow-card absolute top-full right-0 z-30 mt-2 max-h-[70vh] w-96 max-w-[90vw] overflow-y-auto rounded-xl border p-1.5 shadow-xl"
        >
          {links.map((link) => (
            <a
              key={link.id}
              role="menuitem"
              href={link.url}
              target="_blank"
              rel="noreferrer"
              onClick={() => setOpen(false)}
              className="group hover:bg-subtle flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors"
            >
              <span className="min-w-0 flex-1">
                <span className="group-hover:text-brand-strong text-ink block truncate text-sm font-semibold">
                  {link.title || link.url}
                </span>
                {link.description && (
                  <span className="text-ink-muted mt-0.5 block text-xs leading-snug">
                    {link.description}
                  </span>
                )}
                <span className="text-ink-faint mt-0.5 block truncate text-[11px]">
                  {host(link.url)}
                </span>
              </span>
              <ExternalLinkIcon className="text-ink-faint group-hover:text-brand mt-0.5 h-4 w-4 shrink-0" />
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
