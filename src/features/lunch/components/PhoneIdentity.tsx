import { useMemo } from 'react'
import { nameKey } from '../roster'
import { PUBLISHERS } from '../../shift/config'
import { useSharedShift } from '../../shift/sharedShiftContext'
import { SECTION_LABEL, SELECT } from '../../../shared/ui/styles'

/**
 * "I am …" for a phone, where the sidebar that normally holds it is gone. Copy for Teams only shares the
 * shifts with the team once this is Kevin C or Nestor, so a phone that
 * has never been told who is holding it needs the picker on the page. The publishers are always in the
 * list, because a phone that has no roster and has seen no published schedule would otherwise have nobody
 * to pick. Renders nothing while the shared shift is switched off.
 */
export function PhoneIdentity() {
  const { enabled, me, setMe, choices, canPublish } = useSharedShift()
  const options = useMemo(() => {
    const seen = new Map<string, string>()
    for (const name of [...choices, ...PUBLISHERS]) if (!seen.has(nameKey(name))) seen.set(nameKey(name), name)
    return [...seen.values()].sort((a, b) => a.localeCompare(b))
  }, [choices])
  if (!enabled) return null

  return (
    <div>
      <label className="flex items-center gap-3">
        <span className={SECTION_LABEL}>I am</span>
        <select value={me ?? ''} onChange={(e) => setMe(e.target.value || null)} className={`${SELECT} min-h-11 flex-1 !text-base`}>
          <option value="">Not selected</option>
          {options.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </label>
      {!canPublish && (
        <p className="text-ink-muted mt-1.5 text-xs">
          Optional. Shows your lunch shift here.
        </p>
      )}
    </div>
  )
}
