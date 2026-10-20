import { CARD, CARD_HEADER, COUNT_BADGE, INPUT, SECTION_LABEL } from '../../../shared/ui/styles'
import { PlayIcon } from '../../nvx/components/icons'
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

/** The login for new terminals, and the saved units: one click on a unit opens its terminal. */
export function ConnectCard({ username, password, onUsername, onPassword, groups, onOpen }: ConnectCardProps) {
  const withUnits = groups.filter((g) => g.units.length > 0)
  const total = groups.reduce((sum, g) => sum + g.units.length, 0)
  return (
    <section className={CARD} aria-label="Login and saved units">
      <header className={CARD_HEADER}>
        <h3 className={SECTION_LABEL}>Login</h3>
      </header>
      <div className="space-y-3 p-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-ink-muted mb-1 block text-xs font-medium">Username</span>
            <input className={INPUT} value={username} autoComplete="off" spellCheck={false} onChange={(e) => onUsername(e.target.value)} />
          </label>
          <label className="block">
            <span className="text-ink-muted mb-1 block text-xs font-medium">Password</span>
            <input className={INPUT} type="password" value={password} autoComplete="off" onChange={(e) => onPassword(e.target.value)} />
          </label>
        </div>
        <p className="text-ink-faint text-xs">Used for the terminals you open next. The password stays in memory and is gone when the app closes.</p>
      </div>
      <header className="border-line-soft bg-subtle flex items-center gap-2 border-y px-4 py-2">
        <h3 className={`${SECTION_LABEL} flex items-center gap-2`}>
          Saved units <span className={COUNT_BADGE}>{total}</span>
        </h3>
      </header>
      {withUnits.length === 0 ? (
        <p className="text-ink-muted px-4 py-5 text-sm">No saved units yet. Add them on the Device API page, or open a terminal by typing an IP address.</p>
      ) : (
        <div className="max-h-72 overflow-y-auto py-1">
          {withUnits.map((group) => (
            <div key={group.id}>
              {withUnits.length > 1 && <p className="text-ink-faint px-4 pt-2 pb-1 text-[11px] font-semibold tracking-wide uppercase">{group.name}</p>}
              <ul>
                {group.units.map((unit) => (
                  <li key={unit.id}>
                    <button
                      type="button"
                      onClick={() => onOpen(unit)}
                      className="hover:bg-subtle group flex w-full items-center gap-3 px-4 py-2 text-left"
                      aria-label={`Open a terminal for ${unit.label || unit.ip}`}
                    >
                      <PlayIcon className="text-brand h-3.5 w-3.5 shrink-0" />
                      <span className="min-w-0 flex-1">
                        <span className="text-ink block truncate text-sm font-medium">{unit.label || unit.ip}</span>
                        <span className="text-ink-muted block font-mono text-xs">{unit.ip}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
