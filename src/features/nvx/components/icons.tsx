import { ICON_BASE } from '../../../shared/ui/iconBase'
import type { IconProps } from '../../../shared/ui/iconBase'

export function PlayIcon({ className }: IconProps) {
  return (
    <svg {...ICON_BASE} className={className}>
      <path d="M7 5v14l12-7L7 5Z" />
    </svg>
  )
}

export function PencilIcon({ className }: IconProps) {
  return (
    <svg {...ICON_BASE} className={className}>
      <path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3ZM14 7l3 3" />
    </svg>
  )
}

export function ChevronIcon({ open, className = 'h-4 w-4' }: { open: boolean; className?: string }) {
  return (
    <svg {...ICON_BASE} strokeWidth={2.5} className={`${className} transition-transform ${open ? 'rotate-90' : ''}`}>
      <path d="m9 6 6 6-6 6" />
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
