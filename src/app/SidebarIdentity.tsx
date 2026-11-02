import { PUBLISHERS } from '../features/shift/config'
import { useSharedShift } from '../features/shift/sharedShiftContext'
import { SELECT } from '../shared/ui/styles'

/**
 * Optional "I am …" picker, above Sync. There are no accounts: the choice stays in
 * this browser and only decides which shift to show — and whether Copy for Teams also shares the shifts.
 * The picker carries no visible heading (the sidebar is short on room); a hidden label names it for
 * screen readers, and the line under it explains what the choice does.
 */
export function SidebarIdentity({ compact }: { compact: boolean }) {
  const { enabled, me, setMe, choices, canPublish } = useSharedShift()
  if (!enabled) return null

  if (compact) {
    return (
      <div
        title={me ? `You are ${me}. Expand the sidebar to change.` : 'Expand the sidebar to say who you are.'}
        className="text-ink-soft border-line-strong bg-surface-hi mx-auto flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold"
      >
        {me ? me.charAt(0).toUpperCase() : '?'}
      </div>
    )
  }

  return (
    <div>
      <label htmlFor="sidebar-identity" className="sr-only">
        I am
      </label>
      <select
        id="sidebar-identity"
        value={me ?? ''}
        onChange={(e) => setMe(e.target.value || null)}
        className={`${SELECT} w-full`}
      >
        <option value="">Not selected</option>
        {choices.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
      <p className="text-ink-muted mt-1.5 text-[11px] leading-snug">
        {choices.length === 0
          ? `Names appear once ${PUBLISHERS.join(' or ')} presses Copy for Teams.`
          : canPublish
            ? 'Copy for Teams also shares the shifts with the team.'
            : 'Optional. Shows your lunch shift here.'}
      </p>
    </div>
  )
}
