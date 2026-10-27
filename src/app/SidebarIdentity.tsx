import { PUBLISHERS } from '../features/shift/config'
import { useSharedShift } from '../features/shift/sharedShiftContext'
import { SELECT } from '../shared/ui/styles'

/**
 * Optional "I am …" picker, above the theme switcher. There are no accounts: the choice stays in
 * this browser and only decides which shift to show — and whether Copy for Teams also shares the shifts.
 */
export function SidebarIdentity({ compact }: { compact: boolean }) {
  const { enabled, me, setMe, choices, canPublish } = useSharedShift()
  if (!enabled) return null

  if (compact) {
    return (
      <div
        title={me ? `You are ${me}. Expand the sidebar to change.` : 'Expand the sidebar to say who you are.'}
        className="text-ink-soft mx-auto flex h-8 w-8 items-center justify-center rounded-full border border-line-strong text-xs font-bold"
      >
        {me ? me.charAt(0).toUpperCase() : '?'}
      </div>
    )
  }

  return (
    <div className="px-3">
      <label htmlFor="sidebar-identity" className="text-ink-muted mb-2 block text-[11px] font-bold tracking-[0.1em] uppercase">
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
