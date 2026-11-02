import { ICON_BASE } from '../../shared/ui/iconBase'
import type { IconProps } from '../../shared/ui/iconBase'

export function ClockIcon({ className }: IconProps) {
  return (
    <svg {...ICON_BASE} className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  )
}

export function CalendarIcon({ className }: IconProps) {
  return (
    <svg {...ICON_BASE} className={className} aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M8 2v4M16 2v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
    </svg>
  )
}

export function CloseIcon({ className }: IconProps) {
  return (
    <svg {...ICON_BASE} className={className} aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  )
}

/** A five-point star: outlined when idle, filled when starred. */
export function StarIcon({ className, filled = false }: IconProps & { filled?: boolean }) {
  return (
    <svg {...ICON_BASE} fill={filled ? 'currentColor' : 'none'} strokeWidth={1.8} className={className} aria-hidden="true">
      <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" />
    </svg>
  )
}
