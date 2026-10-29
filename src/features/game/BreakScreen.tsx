import type { Category, UpgradeId } from './upgrades'
import { UPGRADES, upgradeById } from './upgrades'
import { WEAPONS } from './weapons'
import type { World } from './types'

/** Chip colours by kind of upgrade. The screen is always dark, whichever page theme is on. */
const CATEGORY: Record<Category, { label: string; chip: string }> = {
  offense: { label: 'Offense', chip: 'border-rose-400/50 bg-rose-400/15 text-rose-200' },
  defense: { label: 'Defense', chip: 'border-sky-400/50 bg-sky-400/15 text-sky-200' },
  stamina: { label: 'Stamina', chip: 'border-emerald-400/50 bg-emerald-400/15 text-emerald-200' },
  utility: { label: 'Utility', chip: 'border-amber-300/50 bg-amber-300/15 text-amber-100' },
}

type BreakScreenProps = {
  world: World
  picked: UpgradeId | null
  onPick: (id: UpgradeId) => void
  onContinue: () => void
}

/** The pause between rounds: what the round paid, one upgrade to take, and the weapon rack. */
export function BreakScreen({ world, picked, onPick, onContinue }: BreakScreenProps) {
  const { summary } = world
  if (!summary) return null
  const owned = UPGRADES.filter((u) => (world.upgrades[u.id] ?? 0) > 0)

  return (
    <div role="dialog" aria-label={`Round ${summary.round} cleared. Choose an upgrade.`} className="absolute inset-0 overflow-y-auto bg-black/75 text-white backdrop-blur-[2px]">
      <div className="mx-auto flex min-h-full max-w-3xl flex-col justify-center gap-3 px-4 py-4">
        <header className="text-center">
          <p className="text-2xl font-extrabold tracking-tight">Round {summary.round} cleared</p>
          <p className="text-xs text-white/75">
            {summary.kills} kill{summary.kills === 1 ? '' : 's'} · {summary.parries} parr{summary.parries === 1 ? 'y' : 'ies'} · +{summary.clearBonus} clear
            {summary.flawlessBonus > 0 && <span className="font-bold text-[#ffd27a]"> · +{summary.flawlessBonus} flawless</span>} · healed {summary.healed}
          </p>
          <p className="text-sm font-bold">
            Score <span className="text-[#ffd27a]">{world.score}</span>
          </p>
        </header>

        <div>
          <p className="mb-1.5 text-center text-[11px] font-bold tracking-[0.12em] text-white/70 uppercase">Choose an upgrade</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {world.offer.map((id, index) => {
              const upgrade = upgradeById(id)
              const level = world.upgrades[id] ?? 0
              const taken = picked === id
              const chosenOther = picked !== null && !taken
              return (
                <button
                  key={id}
                  type="button"
                  disabled={picked !== null}
                  aria-pressed={taken}
                  onClick={() => onPick(id)}
                  className={`flex flex-col gap-1.5 rounded-lg border p-3 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffd27a] ${
                    taken
                      ? 'border-[#ffd27a] bg-[#ffd27a]/15 ring-2 ring-[#ffd27a]/60'
                      : chosenOther
                        ? 'border-white/10 bg-white/5 opacity-40'
                        : 'border-white/20 bg-white/10 hover:border-[#ffd27a]/70 hover:bg-white/15'
                  }`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className={`rounded border px-1.5 py-0.5 text-[10px] font-bold tracking-wide uppercase ${CATEGORY[upgrade.category].chip}`}>
                      {CATEGORY[upgrade.category].label}
                    </span>
                    <kbd className="rounded border border-white/25 px-1.5 text-[11px] font-bold text-white/70">{index + 1}</kbd>
                  </span>
                  <span className="text-base font-extrabold">{upgrade.name}</span>
                  <span className="text-xs leading-snug text-white/80">{upgrade.text}</span>
                  <span className="mt-auto text-[11px] font-semibold text-white/60">
                    {level === 0 ? 'New' : `Level ${level} → ${level + 1}`}
                    {upgrade.max > 1 && ` · max ${upgrade.max}`}
                  </span>
                </button>
              )
            })}
          </div>
          {owned.length > 0 && (
            <p className="mt-1.5 text-center text-[11px] text-white/60">
              Yours so far: {owned.map((u) => `${u.name}${(world.upgrades[u.id] ?? 0) > 1 ? ` ×${world.upgrades[u.id]}` : ''}`).join(' · ')}
            </p>
          )}
        </div>

        <div>
          <p className="mb-1.5 text-center text-[11px] font-bold tracking-[0.12em] text-white/70 uppercase">Weapon</p>
          <ul className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {WEAPONS.map((weapon) => (
              <li
                key={weapon.id}
                title={weapon.available ? weapon.tagline : `${weapon.tagline} Not in the game yet.`}
                className={`rounded-md border px-2 py-1.5 text-[11px] leading-tight ${
                  weapon.available ? 'border-[#ffd27a]/70 bg-[#ffd27a]/10' : 'border-white/10 bg-white/5 opacity-50'
                }`}
              >
                <span className="block font-bold">{weapon.name}</span>
                <span className="block text-white/65">{weapon.available ? 'Equipped' : 'Coming soon'}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="text-center">
          <button
            type="button"
            disabled={picked === null}
            onClick={onContinue}
            className="inline-flex items-center justify-center rounded-lg bg-linear-to-b from-[#ffd27a] to-[#f5a93a] px-5 py-2 text-sm font-extrabold text-[#2a1a05] shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {picked === null ? 'Pick an upgrade to continue' : `Start round ${world.round + 1}  (Enter)`}
          </button>
        </div>
      </div>
    </div>
  )
}
