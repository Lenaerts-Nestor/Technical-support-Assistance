import type { PageId } from './navigation'
import { NAV_ITEMS, isDesktopApp, isNavItemVisible } from './navigation'
import { useAppUpdateData, useFolder } from './appDataContext'
import { hasPendingUpdate } from '../features/sync/appUpdate'
import { useGuidesToOrganize } from '../features/sync/useGuidesToOrganize'
import { useSharedShift } from '../features/shift/sharedShiftContext'
import type { FolderStatus } from '../features/sync/useFolderLifecycle'
import { ICON_BTN } from '../shared/ui/styles'
import { ICON_BASE } from '../shared/ui/iconBase'
import { ThemeSwitcher } from '../shared/theme/ThemeSwitcher'
import { ArrowRightIcon, NavIcon } from './navIcons'
import { SidebarStatus } from './SidebarStatus'
import { SidebarIdentity } from './SidebarIdentity'
import { SidebarTimers } from './SidebarTimers'

/** Colour + wording of the folder-status dot on the Sync entry. */
const FOLDER_DOT: Record<FolderStatus, { tone: string; label: string; pulse?: boolean }> = {
  unsupported: { tone: 'bg-ink-faint', label: 'Folder sync is not available in this browser' },
  idle: { tone: 'bg-ink-faint', label: 'No folder linked' },
  checking: { tone: 'bg-info', label: 'Checking the linked folder', pulse: true },
  reconnect: { tone: 'bg-warning', label: 'The linked folder needs permission' },
  ready: { tone: 'bg-success', label: 'Folder linked' },
  saving: { tone: 'bg-info', label: 'Saving to the linked folder', pulse: true },
  saved: { tone: 'bg-success', label: 'Folder in sync' },
  error: { tone: 'bg-danger', label: 'Sync error' },
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
  className?: string
}

function NavButton({ id, label, active, compact, onNavigate, status, className = '' }: NavButtonProps) {
  const title = compact ? (status ? `${label} — ${status.label}` : label) : status?.label
  return (
    <button
      type="button"
      onClick={() => onNavigate(id)}
      title={title}
      aria-label={compact ? title : undefined}
      aria-current={active ? 'page' : undefined}
      className={`relative flex h-9 items-center rounded-lg text-sm font-semibold transition-colors ${
        compact ? 'w-full justify-center px-0' : 'gap-2.5 px-3'
      } ${active ? 'bg-brand-soft text-brand-strong' : 'text-ink-soft hover:text-ink hover:bg-hover'} ${className}`}
    >
      <NavIcon
        id={id}
        className={`shrink-0 ${compact ? 'h-5 w-5' : 'h-[18px] w-[18px]'} ${active ? '' : 'text-ink-muted'}`}
      />
      {!compact && <span className="truncate">{label}</span>}
      {!compact && active && !status && <ArrowRightIcon className="ml-auto h-3.5 w-3.5 shrink-0" />}
      {status && (
        <>
          <span
            aria-hidden="true"
            className={`${status.tone} ${status.pulse ? 'animate-pulse' : ''} h-2 w-2 rounded-full ${
              compact ? 'absolute top-1.5 right-2.5' : 'ml-auto shrink-0'
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
  const { state: update } = useAppUpdateData()
  const { canPublish } = useSharedShift()
  const syncStatus = hasPendingUpdate(update)
    ? { tone: 'bg-brand', label: `A new version (${update?.available?.version ?? ''}) of the app is available`.replace(' ()', ''), pulse: true }
    : toOrganize > 0 && ['ready', 'saving', 'saved'].includes(folder.status)
      ? { tone: 'bg-warning', label: 'Folder linked — guides can be organized into their own folders' }
      : FOLDER_DOT[folder.status]
  const audience = { desktop: isDesktopApp(), publisher: canPublish }
  const visible = NAV_ITEMS.filter((item) => isNavItemVisible(item, audience))
  const main = visible.filter((item) => item.placement !== 'bottom')
  const bottom = visible.filter((item) => item.placement === 'bottom')

  return (
    <aside
      // Hidden on a phone: the page gets the whole width (the website opens on the Lunch Planner there).
      className={`border-sidebar-line bg-sidebar hidden h-full shrink-0 flex-col overflow-hidden border-r py-4 transition-[width] duration-200 md:flex ${
        compact ? 'w-16 px-2' : 'w-[244px] px-3'
      }`}
    >
      {/* Fixed height: only the page list scrolls, so the timers, "I am" and Sync never leave the screen. */}
      <div className={compact ? 'flex flex-col items-center gap-3 pb-4' : 'flex items-center gap-2 pb-4'}>
        <SidebarStatus compact={compact} />
        <button
          type="button"
          onClick={onToggle}
          disabled={lockedCompact}
          aria-expanded={!compact}
          aria-label={compact ? 'Expand sidebar' : 'Collapse sidebar'}
          title={lockedCompact ? 'This page is using the space' : compact ? 'Expand sidebar' : 'Collapse sidebar'}
          className={`${ICON_BTN} flex h-9 w-9 shrink-0 items-center justify-center ${compact ? 'order-first' : ''}`}
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

      <nav aria-label="Pages" className="border-sidebar-line flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto border-t pt-3">
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

      <div className="border-sidebar-line mt-3 flex shrink-0 flex-col gap-3 border-t pt-3">
        <SidebarTimers compact={compact} />
        <SidebarIdentity compact={compact} />
        <div className={compact ? 'flex flex-col items-center gap-2' : 'flex items-center gap-2'}>
          {bottom.length > 0 && (
            <nav aria-label="Sync" className={compact ? 'w-full' : 'min-w-0 flex-1'}>
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
          <ThemeSwitcher />
        </div>
      </div>
    </aside>
  )
}
