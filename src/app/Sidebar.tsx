import type { PageId } from './navigation'
import { NAV_ITEMS } from './navigation'
import { useFolder } from './appDataContext'
import { useGuidesToOrganize } from '../features/sync/useGuidesToOrganize'
import type { FolderStatus } from '../features/sync/useFolderLifecycle'
import { ICON_BTN } from '../shared/ui/styles'
import { ICON_BASE } from '../shared/ui/iconBase'
import { SidebarClock } from './SidebarClock'
import { SidebarMascots } from './SidebarMascots'

const ICONS: Record<PageId, React.ReactElement> = {
  voiceCall: (
    <path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.46.57 3.6a1 1 0 0 1-.25 1L6.6 10.8Z" />
  ),
  rma: (
    <path d="m12 2 8 4.5v9L12 20l-8-4.5v-9L12 2Zm0 2.3L6.2 7.5 12 10.7l5.8-3.2L12 4.3ZM5 9.2v5.6l6 3.4v-5.6L5 9.2Zm14 0-6 3.4v5.6l6-3.4V9.2Z" />
  ),
  cases: (
    <path d="M9 4h6a2 2 0 0 1 2 2v1h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h3V6a2 2 0 0 1 2-2Zm0 3h6V6H9v1Z" />
  ),
  guides: (
    <path d="M5 3h11a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm0 2v10h12V6a1 1 0 0 0-1-1H5Z" />
  ),
  links: (
    <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7a5 5 0 0 0 0 10h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1ZM8 13h8v-2H8v2Zm9-6h-4v1.9h4a3.1 3.1 0 0 1 0 6.2h-4V17h4a5 5 0 0 0 0-10Z" />
  ),
  nvx: (
    <path d="M4 4h16a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Zm1 2v3h14V6H5Zm-1 7h16a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1Zm1 2v3h14v-3H5Zm2-8.5h2v2H7v-2Zm0 9h2v2H7v-2Z" />
  ),
  terminal: (
    <path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm0 2v12h16V6H4Zm2.2 2.6 1.4-1.4 4.2 4.2-4.2 4.2-1.4-1.4 2.8-2.8-2.8-2.8ZM12.5 15h5v2h-5v-2Z" />
  ),
  calendar: (
    <path d="M7 2v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7Zm-2 8h14v10H5V10Zm2 2v2h2v-2H7Zm4 0v2h2v-2h-2Zm4 0v2h2v-2h-2Zm-8 4v2h2v-2H7Zm4 0v2h2v-2h-2Z" />
  ),
  sync: (
    <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8Zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3Z" />
  ),
  kevinGuide: (
    <path d="M12 2 4 6v5c0 4.7 3.2 8.9 8 10 4.8-1.1 8-5.3 8-10V6l-8-4Zm-1.2 13.4L7.4 12l1.4-1.4 2 2 4.4-4.4 1.4 1.4-5.8 5.8Z" />
  ),
}

/** Colour + wording of the folder-status dot on the Sync entry. */
const FOLDER_DOT: Record<FolderStatus, { tone: string; label: string; pulse?: boolean }> = {
  unsupported: { tone: 'bg-ink-faint', label: 'Folder sync is not available in this browser' },
  idle: { tone: 'bg-ink-faint', label: 'No folder linked' },
  checking: { tone: 'bg-sky-400', label: 'Checking the linked folder', pulse: true },
  reconnect: { tone: 'bg-amber-400', label: 'The linked folder needs permission' },
  ready: { tone: 'bg-emerald-400', label: 'Folder linked' },
  saving: { tone: 'bg-sky-400', label: 'Saving to the linked folder', pulse: true },
  saved: { tone: 'bg-emerald-400', label: 'Folder in sync' },
  error: { tone: 'bg-rose-400', label: 'Sync error' },
}

type SidebarProps = {
  current: PageId
  onNavigate: (page: PageId) => void
  /** Icons only, to give the page beside it more room. */
  compact?: boolean
  /** The page needs the room, so the user's toggle is off until it lets go. */
  lockedCompact?: boolean
  onToggle: () => void
}

type NavButtonProps = {
  id: PageId
  label: string
  active: boolean
  compact: boolean
  onNavigate: (page: PageId) => void
  /** Status text for the Sync entry, shown as a dot and read out by screen readers. */
  status?: { tone: string; label: string; pulse?: boolean }
}

function NavButton({ id, label, active, compact, onNavigate, status }: NavButtonProps) {
  const title = compact ? (status ? `${label} — ${status.label}` : label) : status?.label
  return (
    <button
      type="button"
      onClick={() => onNavigate(id)}
      title={title}
      aria-label={compact ? title : undefined}
      aria-current={active ? 'page' : undefined}
      className={`relative flex items-center rounded-lg py-2 text-sm font-medium transition-colors ${
        compact ? 'justify-center px-0' : 'gap-3 pr-3 pl-4'
      } ${
        active
          ? `bg-brand-soft text-brand-strong before:bg-brand before:absolute before:inset-y-1.5 before:left-0 before:w-[3px] before:rounded-full before:content-[""] ${
              compact ? 'ring-brand-line ring-1' : ''
            }`
          : 'text-ink-muted hover:bg-subtle hover:text-ink'
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        className={`fill-current ${compact ? 'h-5 w-5' : 'h-4 w-4'} ${active ? '' : 'text-ink-faint'}`}
        aria-hidden="true"
      >
        {ICONS[id]}
      </svg>
      {!compact && label}
      {status && (
        <>
          <span
            aria-hidden="true"
            className={`${status.tone} ${status.pulse ? 'animate-pulse' : ''} h-2 w-2 rounded-full ${
              compact ? 'absolute top-1.5 right-3' : 'ml-auto'
            }`}
          />
          {!compact && <span className="sr-only">{`: ${status.label}`}</span>}
        </>
      )}
    </button>
  )
}

export function Sidebar({
  current,
  onNavigate,
  compact = false,
  lockedCompact = false,
  onToggle,
}: SidebarProps) {
  const folder = useFolder()
  const toOrganize = useGuidesToOrganize()
  const syncStatus =
    toOrganize > 0 && ['ready', 'saving', 'saved'].includes(folder.status)
      ? { tone: 'bg-amber-400', label: 'Folder linked — guides can be organized into their own folders' }
      : FOLDER_DOT[folder.status]
  const visible = NAV_ITEMS.filter((item) => !item.hidden)
  const main = visible.filter((item) => item.placement !== 'bottom')
  const bottom = visible.filter((item) => item.placement === 'bottom')

  return (
    <aside
      className={`border-line-strong bg-surface flex shrink-0 flex-col border-r py-5 transition-[width] duration-200 ${
        compact ? 'w-16 px-2' : 'w-60 px-3'
      }`}
    >
      <div className={compact ? 'flex flex-col items-center gap-3 pb-5' : 'flex items-start justify-between gap-2 pb-5 pl-3'}>
        <SidebarClock compact={compact} />
        <button
          type="button"
          onClick={onToggle}
          disabled={lockedCompact}
          aria-expanded={!compact}
          aria-label={compact ? 'Expand sidebar' : 'Collapse sidebar'}
          title={
            lockedCompact
              ? 'This page is using the space'
              : compact
                ? 'Expand sidebar'
                : 'Collapse sidebar'
          }
          className={`${ICON_BTN} shrink-0 ${compact ? 'order-first' : ''}`}
        >
          <svg
            {...ICON_BASE}
            className={`h-4 w-4 transition-transform ${compact ? 'rotate-180' : ''}`}
            aria-hidden="true"
          >
            <path d="m15 6-6 6 6 6" />
          </svg>
        </button>
      </div>

      <nav className="border-line-soft flex flex-col gap-0.5 border-t pt-4">
        {main.map((item) => (
          <NavButton
            key={item.id}
            id={item.id}
            label={item.label}
            active={item.id === current}
            compact={compact}
            onNavigate={onNavigate}
          />
        ))}
      </nav>

      {/* Too narrow for pictures once the sidebar is icons-only. */}
      {!compact && <SidebarMascots />}

      {bottom.length > 0 && (
        <nav
          aria-label="Sync"
          className="border-line-soft mt-auto flex flex-col gap-0.5 border-t pt-4"
        >
          {bottom.map((item) => (
            <NavButton
              key={item.id}
              id={item.id}
              label={item.label}
              active={item.id === current}
              compact={compact}
              onNavigate={onNavigate}
              status={item.id === 'sync' ? syncStatus : undefined}
            />
          ))}
        </nav>
      )}
    </aside>
  )
}
