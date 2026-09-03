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
