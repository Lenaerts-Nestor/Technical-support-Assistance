import { CARD, INPUT } from '../../../shared/ui/styles'
import type { NvxGroup, NvxUnit } from '../../nvx/types'

type ConnectCardProps = {
  username: string
  password: string
  onUsername: (username: string) => void
  onPassword: (password: string) => void
  /** The saved units, by group. */
  groups: NvxGroup[]
  /** Open a terminal for a saved unit with this login. */
  onOpen: (unit: NvxUnit) => void
}

const LABEL = 'text-ink-muted mb-0.5 block text-[11px] font-medium'

/** The login for new terminals, and the saved units as chips: one click on a unit opens its terminal. */
export function ConnectCard({ username, password, onUsername, onPassword, groups, onOpen }: ConnectCardProps) {
  const units = groups.flatMap((group) => group.units.map((unit) => ({ unit, group })))
  return (
    <section className={`${CARD} space-y-2.5 p-3`} aria-label="Login and saved units">
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className={LABEL}>Username</span>
          <input className={`${INPUT} py-1`} value={username} autoComplete="off" spellCheck={false} onChange={(e) => onUsername(e.target.value)} />
        </label>
        <label className="block">
          <span className={LABEL}>Password</span>
          <input
            className={`${INPUT} py-1`}
            type="password"
            value={password}
            autoComplete="off"
            title="Kept in memory only, gone when the app closes. Used for the terminals you open next."
            onChange={(e) => onPassword(e.target.value)}
          />
        </label>
      </div>
      <div>
        <span className={LABEL}>Saved units{units.length > 0 && ` · click to open`}</span>
        {units.length === 0 ? (
          <p className="text-ink-faint text-xs">None yet. Add them on the Device API page, or use Add terminal.</p>
        ) : (
          <ul className="flex max-h-24 flex-wrap gap-1.5 overflow-y-auto">
            {units.map(({ unit, group }) => (
              <li key={unit.id}>
                <button
                  type="button"
                  onClick={() => onOpen(unit)}
                  title={`${unit.ip}${groups.length > 1 ? ` · ${group.name}` : ''}`}
                  aria-label={`Open a terminal for ${unit.label || unit.ip}`}
                  className="border-line hover:border-brand hover:text-brand text-ink rounded-md border px-2 py-0.5 text-xs font-medium transition-colors"
                >
                  {unit.label || unit.ip}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
