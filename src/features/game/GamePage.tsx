import { useState } from 'react'
import { GameSession } from './GameSession'
import { CLIMB_LEVELS, TOWER, metres } from './climb'
import type { GameMode } from './types'
import { CARD, PAGE_SUBTITLE, PAGE_TITLE, SECTION_LABEL } from '../../shared/ui/styles'

type ModeInfo = { id: GameMode; name: string; kind: string; blurb: string; facts: string[] }

const MODES: ModeInfo[] = [
  {
    id: 'survival',
    name: 'Last Stand',
    kind: 'Fighting survival',
    blurb: 'Hold the ledges against demons, lancers, archers and brutes coming through the gates. Round after round, a boss every fifth.',
    facts: ['Fight, dodge, parry', 'Upgrades between rounds', 'Ends when your health does'],
  },
  {
    id: 'climb',
    name: 'Jump Hunter',
    kind: 'Jump climb',
    blurb: 'Jump up a tower of ledges as high as you can, past archers on the walls and demons and ogres on the ledges. A miss drops you to a ledge below, but the ground ends the climb.',
    facts: [`${CLIMB_LEVELS.length} levels, ${metres(TOWER.summit)} m to the summit`, 'The Huntress, with her moves', 'Ends when you hit the ground'],
  },
]

/**
 * The Break room: opens on a choice between its two games. The page stays mounted when you switch
 * pages (see App.tsx), so a game in progress is not lost; going back to the choice does end it.
 */
export function GamePage() {
  const [mode, setMode] = useState<GameMode | null>(null)

  if (mode) return <GameSession key={mode} mode={mode} onBack={() => setMode(null)} />

  return (
    <div className="mx-auto max-w-[1180px] space-y-5 px-4 py-7 sm:px-8">
      <header>
        <h2 className={PAGE_TITLE}>Break room</h2>
        <p className={PAGE_SUBTITLE}>Pick a game.</p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMode(m.id)}
            className={`${CARD} hover:border-line-strong focus-visible:outline-focus space-y-3 p-5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2`}
          >
            <p className={SECTION_LABEL}>{m.kind}</p>
            <p className="text-ink text-2xl font-extrabold tracking-tight">{m.name}</p>
            <p className="text-ink-muted text-sm">{m.blurb}</p>
            <ul className="text-ink-faint list-inside list-disc space-y-0.5 text-xs">
              {m.facts.map((fact) => (
                <li key={fact}>{fact}</li>
              ))}
            </ul>
          </button>
        ))}
      </div>
    </div>
  )
}
