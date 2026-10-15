import { ICON_BASE } from '../../../shared/ui/iconBase'
import type { IconProps } from '../../../shared/ui/iconBase'

export function ChevronLeftIcon({ className }: IconProps) {
  return (
    <svg {...ICON_BASE} className={className} aria-hidden="true">
      <path d="m15 6-6 6 6 6" />
    </svg>
  )
}

export function ChevronRightIcon({ className }: IconProps) {
  return (
    <svg {...ICON_BASE} className={className} aria-hidden="true">
      <path d="m9 6 6 6-6 6" />
    </svg>
  )
}
