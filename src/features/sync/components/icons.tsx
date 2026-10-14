import { ICON_BASE as base } from '../../../shared/ui/iconBase'
import type { IconProps } from '../../../shared/ui/iconBase'

export { DownloadIcon, FolderIcon, SyncIcon } from '../../guides/components/icons'

export function UploadIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 15V3M7 8l5-5 5 5M5 21h14" />
    </svg>
  )
}

export function LinksIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1" />
      <path d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1" />
    </svg>
  )
}

export function TextsIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 5h16M4 10h16M4 15h10" />
      <path d="M4 20h7" />
    </svg>
  )
}

export function BookIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M5 3h11a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
    </svg>
  )
}

export function ArchiveIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="3" y="4" width="18" height="4" rx="1" />
      <path d="M5 8v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8M10 12h4" />
    </svg>
  )
}
