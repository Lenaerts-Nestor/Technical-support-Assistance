import { useLayoutEffect, useRef } from 'react'
import type { ReactNode, TextareaHTMLAttributes } from 'react'

/**
 * Form fields for the guide editor. Same colour tokens as the rest of the app,
 * but with a firmer border, more padding and a visible label so it is obvious
 * where to type and what each box is for. Exported under the same names as the
 * shared ones so an editor file only changes its import.
 */

const FIELD =
  'w-full rounded-lg border border-line-strong bg-canvas text-ink transition-colors placeholder:text-ink-faint hover:border-ink-faint focus:border-brand focus:ring-2 focus:ring-brand/30 focus:outline-none'

export const INPUT = `${FIELD} px-3 py-2 text-[15px]`
export const INPUT_HEADING = `${FIELD} px-3 py-2 text-base font-semibold`
export const INPUT_TITLE = `${FIELD} px-3 py-2.5 text-lg font-semibold tracking-tight`
export const TEXTAREA = `${FIELD} resize-y px-3 py-2 text-[15px] leading-relaxed`
export const SELECT =
  'rounded-lg border border-line-strong bg-canvas px-2.5 py-2 text-sm font-medium text-ink transition-colors hover:border-ink-faint focus:border-brand focus:ring-2 focus:ring-brand/30 focus:outline-none'

/** A labelled control: the label sits above and clicking it focuses the field. */
export function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string
  hint?: string
  className?: string
  children: ReactNode
}) {
  return (
    <label className={`block ${className ?? ''}`}>
      <span className="mb-1.5 flex items-baseline gap-2">
        <span className="text-ink-muted text-xs font-semibold">{label}</span>
        {hint && <span className="text-ink-faint text-[11px]">{hint}</span>}
      </span>
      {children}
    </label>
  )
}

/** Small uppercase heading over a group of fields. */
export function GroupLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={`text-ink-muted text-[11px] font-semibold tracking-[0.08em] uppercase ${className ?? ''}`}>
      {children}
    </p>
  )
}

/**
 * A textarea that grows with its text, so a long step or note is readable in
 * full instead of scrolling inside a two-line box.
 */
export function AutoTextarea({
  className = TEXTAREA,
  value,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const fit = () => {
      el.style.height = 'auto'
      // +2 for the borders: scrollHeight leaves them out.
      el.style.height = `${el.scrollHeight + 2}px`
    }
    fit()
    // Wrapping changes with the width, and a block un-collapsing goes from 0 wide to its width.
    let lastWidth = el.offsetWidth
    const ro = new ResizeObserver(() => {
      if (el.offsetWidth !== lastWidth) {
        lastWidth = el.offsetWidth
        fit()
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [value])

  return (
    <textarea
      rows={1}
      {...rest}
      ref={ref}
      value={value}
      className={`${className.replace('resize-y', '')} resize-none overflow-hidden`}
    />
  )
}
