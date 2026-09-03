/**
 * Icons used by more than one feature. The drawing style lives next door in
 * `iconBase.ts`.
 *
 * Feature-specific glyphs stay in their own feature's `components/icons.tsx`.
 * Only move one here when a second feature actually needs it.
 */

import { ICON_BASE } from './iconBase'
import type { IconProps } from './iconBase'

export function CopyIcon({ className }: IconProps) {
  return (
    <svg {...ICON_BASE} className={className}>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h8" />
    </svg>
  )
}

export function PlusIcon({ className }: IconProps) {
  return (
    <svg {...ICON_BASE} className={className}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

/** Also the "clear this away" glyph — Cases used to call this one ClearIcon. */
export function TrashIcon({ className }: IconProps) {
  return (
    <svg {...ICON_BASE} className={className}>
      <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
    </svg>
  )
}
