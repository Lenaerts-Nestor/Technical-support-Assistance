import { ICON_BASE } from '../../../shared/ui/iconBase'
import type { IconProps } from '../../../shared/ui/iconBase'

// Shared with other features, re-exported so this file stays the one place
// cases components import an icon from. The old ClearIcon was the same drawing
// as TrashIcon, so it is gone in favour of the shared one.
export { CopyIcon, TrashIcon } from '../../../shared/ui/icons'

export function WarnIcon({ className }: IconProps) {
  return (
    <svg {...ICON_BASE} className={className}>
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3l-8.5-14.1a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  )
}

export function BoldIcon({ className }: IconProps) {
  return (
    <svg {...ICON_BASE} className={className}>
      <path d="M7 4h6a3.5 3.5 0 0 1 0 7H7z" />
      <path d="M7 11h7a3.5 3.5 0 0 1 0 7H7z" />
    </svg>
  )
}

export function BulletListIcon({ className }: IconProps) {
  return (
    <svg {...ICON_BASE} className={className}>
      <path d="M4 6h.01M4 12h.01M4 18h.01" />
      <path d="M9 6h11M9 12h11M9 18h11" />
    </svg>
  )
}

export function IndentIcon({ className }: IconProps) {
  return (
    <svg {...ICON_BASE} className={className}>
      <path d="M4 5h16M12 10h8M12 15h8M4 20h16" />
      <path d="m4 9 3 3-3 3" />
    </svg>
  )
}

export function OutdentIcon({ className }: IconProps) {
  return (
    <svg {...ICON_BASE} className={className}>
      <path d="M4 5h16M12 10h8M12 15h8M4 20h16" />
      <path d="m7 9-3 3 3 3" />
    </svg>
  )
}

export function ChevronDownIcon({ className }: IconProps) {
  return (
    <svg {...ICON_BASE} className={className}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}
