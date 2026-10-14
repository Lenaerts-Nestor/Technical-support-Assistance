import { ICON_BASE } from '../../../shared/ui/iconBase'
import type { IconProps } from '../../../shared/ui/iconBase'

export function SearchIcon({ className }: IconProps) {
  return (
    <svg {...ICON_BASE} className={className}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}

export function FolderIcon({ className }: IconProps) {
  return (
    <svg {...ICON_BASE} className={className}>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
    </svg>
  )
}

export function LinkIcon({ className }: IconProps) {
  return (
    <svg {...ICON_BASE} className={className}>
      <path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1" />
    </svg>
  )
}

export function ChevronRightIcon({ className }: IconProps) {
  return (
    <svg {...ICON_BASE} className={className}>
      <path d="m9 6 6 6-6 6" />
    </svg>
  )
}

export function PencilIcon({ className }: IconProps) {
  return (
    <svg {...ICON_BASE} className={className}>
      <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z" />
    </svg>
  )
}

export function CloseIcon({ className }: IconProps) {
  return (
    <svg {...ICON_BASE} className={className}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  )
}

export function CheckIcon({ className }: IconProps) {
  return (
    <svg {...ICON_BASE} className={className}>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  )
}

export function ArrowLeftIcon({ className }: IconProps) {
  return (
    <svg {...ICON_BASE} className={className}>
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </svg>
  )
}

export function ArrowRightIcon({ className }: IconProps) {
  return (
    <svg {...ICON_BASE} className={className}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

/** Six dots: the "drag me" handle. */
export function GripIcon({ className }: IconProps) {
  return (
    <svg {...ICON_BASE} className={className}>
      <path d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01" strokeWidth={3} />
    </svg>
  )
}
