import type { HTMLAttributes } from 'react'
import { GripIcon } from '../components/icons'

/** The six-dot handle that starts a drag. Pair with `useSortable`'s `handleProps`. */
export function GripHandle({
  handleProps,
  label,
  className = '',
}: {
  handleProps: HTMLAttributes<HTMLElement>
  label: string
  className?: string
}) {
  return (
    <span
      {...handleProps}
      role="img"
      aria-label={label}
      title="Drag to reorder"
      className={`text-ink-faint hover:text-ink-muted flex cursor-grab touch-none items-center rounded p-0.5 active:cursor-grabbing ${className}`}
    >
      <GripIcon className="h-4 w-4" />
    </span>
  )
}
