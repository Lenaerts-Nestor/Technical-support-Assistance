import { useState } from 'react'
import type { MouseEvent } from 'react'
import { WEAPON_ICONS } from './art/weaponIcons'
import { WEAPON_LIST } from './weapons'
import type { WeaponId } from './weapons'

export function WeaponIcon({ id, className = 'h-6 w-6' }: { id: WeaponId; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {WEAPON_ICONS[id].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  )
}

type LoadoutPickerProps = {
  loadout: readonly [WeaponId, WeaponId]
  /** `fromMouse` is true for a click, so the page can hand the keyboard back to the game. */
  onAssign: (slot: 0 | 1, weapon: WeaponId, fromMouse: boolean) => void
  /** Less text, for the break and game-over screens. */
  compact?: boolean
}

/**
 * Choose the two weapons to carry. Pick a slot, then a weapon for it; the slot then moves on to
 * the other one, so two clicks fill both. A weapon already in the other slot trades places.
 */
export function LoadoutPicker({ loadout, onAssign, compact = false }: LoadoutPickerProps) {
  const [slot, setSlot] = useState<0 | 1>(0)

  const assign = (id: WeaponId) => (event: MouseEvent) => {
    onAssign(slot, id, event.detail > 0)
    setSlot(slot === 0 ? 1 : 0)
  }

  return (
    <div className="w-full">
      <div role="group" aria-label="Weapon slot to fill" className="mb-1.5 flex items-center justify-center gap-1.5 text-[11px] font-bold text-white/80">
        {([0, 1] as const).map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={slot === s}
            onClick={() => setSlot(s)}
            className={`rounded-md border px-2.5 py-1 transition focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#ffd27a] ${
              slot === s ? 'border-[#ffd27a] bg-[#ffd27a]/20 text-white' : 'border-white/20 bg-white/5 hover:bg-white/10'
            }`}
          >
            Slot {s + 1}: {WEAPON_LIST.find((x) => x.id === loadout[s])?.name}
          </button>
        ))}
        <span className="text-white/55">· Q swaps in the fight</span>
      </div>
      <ul className={`grid gap-1.5 ${compact ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 lg:grid-cols-4'}`}>
        {WEAPON_LIST.map((weapon) => {
          const slotOf = loadout.indexOf(weapon.id)
          return (
            <li key={weapon.id}>
              <button
                type="button"
                onClick={assign(weapon.id)}
                title={compact ? weapon.tagline : undefined}
                aria-pressed={slotOf >= 0}
                className={`flex h-full w-full flex-col gap-1 rounded-lg border p-2 text-left transition focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#ffd27a] ${
                  slotOf >= 0 ? 'border-[#ffd27a]/80 bg-[#ffd27a]/10' : 'border-white/15 bg-white/5 hover:border-white/40 hover:bg-white/10'
                }`}
              >
                <span className="flex items-center gap-2 text-white">
                  <WeaponIcon id={weapon.id} className={compact ? 'h-5 w-5 shrink-0' : 'h-6 w-6 shrink-0'} />
                  <span className={`font-extrabold ${compact ? 'text-[11px]' : 'text-xs'}`}>{weapon.name}</span>
                  {slotOf >= 0 && <span className="ml-auto rounded bg-[#ffd27a] px-1.5 text-[10px] font-extrabold text-[#2a1a05]">{slotOf + 1}</span>}
                </span>
                {!compact && (
                  <>
                    <span className="text-[11px] leading-snug text-white/70">{weapon.tagline}</span>
                    <ul className="mt-auto space-y-0.5 pt-1 text-[10px] text-white/55">
                      {weapon.traits.map((trait) => (
                        <li key={trait}>· {trait}</li>
                      ))}
                    </ul>
                  </>
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
