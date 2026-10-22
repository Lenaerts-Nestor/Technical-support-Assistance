import { ICON_BASE } from '../../../shared/ui/iconBase'
import type { IconProps } from '../../../shared/ui/iconBase'

export function SearchIcon({ className }: IconProps) {
  return (
    <svg {...ICON_BASE} className={className} aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}

export function SwapIcon({ className }: IconProps) {
  return (
    <svg {...ICON_BASE} className={className} aria-hidden="true">
      <path d="M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7" />
    </svg>
  )
}

export function AlertIcon({ className }: IconProps) {
  return (
    <svg {...ICON_BASE} className={className} aria-hidden="true">
      <path d="M12 4 2.5 20h19L12 4ZM12 10v4M12 17.2v.01" />
    </svg>
  )
}

export function DownloadIcon({ className }: IconProps) {
  return (
    <svg {...ICON_BASE} className={className} aria-hidden="true">
      <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
    </svg>
  )
}

export function UploadIcon({ className }: IconProps) {
  return (
    <svg {...ICON_BASE} className={className} aria-hidden="true">
      <path d="M12 15V3M7 8l5-5 5 5M5 21h14" />
    </svg>
  )
}

/** Sort arrow for a column heading: both arrows when idle, one when sorted. */
export function SortIcon({ className, direction }: IconProps & { direction?: 'asc' | 'desc' }) {
  return (
    <svg {...ICON_BASE} className={className} aria-hidden="true">
      <path d="m8 9 4-4 4 4" opacity={direction === 'desc' ? 0.3 : 1} />
      <path d="m8 15 4 4 4-4" opacity={direction === 'asc' ? 0.3 : 1} />
    </svg>
  )
}

export function RefreshIcon({ className }: IconProps) {
  return (
    <svg {...ICON_BASE} className={className} aria-hidden="true">
      <path d="M20 11a8 8 0 0 0-14-4.5L4 9M4 4v5h5M4 13a8 8 0 0 0 14 4.5L20 15M20 20v-5h-5" />
    </svg>
  )
}

export function CheckIcon({ className }: IconProps) {
  return (
    <svg {...ICON_BASE} className={className} aria-hidden="true">
      <path d="m5 12.5 4.5 4.5L19 7" />
    </svg>
  )
}
