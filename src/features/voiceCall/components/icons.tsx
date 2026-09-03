import { ICON_BASE } from '../../../shared/ui/iconBase'
import type { IconProps } from '../../../shared/ui/iconBase'

// Shared with other features, re-exported so this file stays the one place
// voiceCall components import an icon from.
export { CopyIcon, PlusIcon, TrashIcon } from '../../../shared/ui/icons'

export function ChevronRightIcon({ className }: IconProps) {
  return (
    <svg {...ICON_BASE} className={className}>
      <path d="m9 6 6 6-6 6" />
    </svg>
  )
}

export function AlertIcon({ className }: IconProps) {
  return (
    <svg {...ICON_BASE} className={className}>
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  )
}

export function UsersIcon({ className }: IconProps) {
  return (
    <svg {...ICON_BASE} className={className}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13A4 4 0 0 1 16 11" />
    </svg>
  )
}

export function WrenchIcon({ className }: IconProps) {
  return (
    <svg {...ICON_BASE} className={className}>
      <path d="M14.7 6.3a4 4 0 0 1-5.4 5.4L4 17v3h3l5.3-5.3a4 4 0 0 1 5.4-5.4l-2.6 2.6-2-2 2.6-2.6Z" />
    </svg>
  )
}
