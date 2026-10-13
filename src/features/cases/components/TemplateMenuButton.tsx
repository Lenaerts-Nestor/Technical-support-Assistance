import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { GROUP_TONES } from '../casesData'
import type { TemplateMenu } from '../types'
import { ChevronDownIcon } from './icons'

type TemplateMenuButtonProps = {
  menu: TemplateMenu
  /** Key into GROUP_TONES, so the menu carries its group's colour. */
  toneId: string
  onInsert: (id: string) => void
}

/** Gap between the button and its menu, and the minimum margin to the viewport. */
const GAP = 4
const MARGIN = 8

/**
 * A button that opens a small menu of related templates. The menu is drawn in
 * a portal with fixed positioning, so it floats over the panel: opening it never
 * pushes other buttons around and the panel's scroll area can't clip it. It
 * closes on pick, outside click, Escape, resize, or when anything scrolls.
 */
export function TemplateMenuButton({ menu, toneId, onInsert }: TemplateMenuButtonProps) {
  const tone = GROUP_TONES[toneId] ?? GROUP_TONES.default
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Place the menu under the button (above it when there is no room), before
  // the browser paints so it never flashes in the wrong spot.
  useLayoutEffect(() => {
    const trigger = triggerRef.current
    const el = menuRef.current
    if (!open || !trigger || !el) return
    const anchor = trigger.getBoundingClientRect()
    el.style.minWidth = `${anchor.width}px`
    const { width, height } = el.getBoundingClientRect()
    const below = window.innerHeight - anchor.bottom - GAP - MARGIN
    const above = anchor.top - GAP - MARGIN
    const top = height > below && above > below ? anchor.top - GAP - height : anchor.bottom + GAP
    const left = Math.min(anchor.left, window.innerWidth - width - MARGIN)
    el.style.top = `${Math.max(MARGIN, top)}px`
    el.style.left = `${Math.max(MARGIN, left)}px`
  }, [open])

  // Move focus into the menu when it opens.
  useEffect(() => {
    if (open) menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus({ preventScroll: true })
  }, [open])

  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    const onScroll = (e: Event) => {
      if (!menuRef.current?.contains(e.target as Node)) close()
    }
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node
      if (!menuRef.current?.contains(target) && !triggerRef.current?.contains(target)) close()
    }
    document.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('resize', close)
    // Capture phase so scrolling the panel (not just the window) is noticed.
    window.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('resize', close)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [open])

  const onMenuKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
      triggerRef.current?.focus()
      return
    }
    if (e.key === 'Tab') {
      setOpen(false)
      return
    }
    const step = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])
    const at = items.indexOf(document.activeElement as HTMLElement)
    items[(at + step + items.length) % items.length]?.focus()
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`border-line bg-canvas text-ink-muted flex items-center justify-between gap-1.5 rounded-md border px-2.5 py-1.5 text-left text-xs font-medium transition-colors ${open ? tone.open : tone.hover}`}
      >
        <span className="min-w-0">{menu.label}</span>
        <ChevronDownIcon
          className={`h-3 w-3 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-label={menu.label}
            onKeyDown={onMenuKeyDown}
            className="border-line-strong bg-surface fixed z-50 flex w-max max-w-72 flex-col gap-0.5 rounded-lg border p-1 shadow-lg shadow-black/40"
          >
            {menu.options.map((option) => (
              <button
                key={option.id}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false)
                  onInsert(option.id)
                }}
                className={`text-ink-muted rounded-md border border-transparent px-2.5 py-1.5 text-left text-xs font-medium transition-colors focus-visible:bg-subtle focus-visible:text-ink focus-visible:outline-none ${tone.hover}`}
              >
                {option.label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  )
}
