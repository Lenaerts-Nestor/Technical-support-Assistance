/** How a run gets harder round by round: the formulas for budget, crowd size and pace. */
import { COST, ROUNDS } from './config'
import type { EnemyKind } from './config'

/** How much enemy there is to fight in a round: it grows every round, a little faster as it goes. */
const plainBudget = (round: number) => 6 + 4 * round + 2 * Math.floor(round / 3)

/** Every fifth round is the boss. */
export const isBossRound = (round: number) => round % ROUNDS.bossEvery === 0

/** Boss rounds have a smaller crowd of their own: the boss is the main course. */
export const roundBudget = (round: number) => (isBossRound(round) ? Math.round(plainBudget(round) * 0.4) + COST.warlord : plainBudget(round))

/** How many enemies may be on screen at once. */
export const maxAlive = (round: number) => (isBossRound(round) ? 5 : Math.min(8, 4 + Math.floor(round / 2)))

/** How many of the tough kinds may be on screen at once. */
export const maxOf = (kind: EnemyKind, round: number) =>
  kind === 'orc' ? Math.min(3, 1 + Math.floor(round / 3)) : kind === 'ogre' ? (round >= 7 ? 2 : 1) : kind === 'warlord' ? 1 : 99

/** Seconds between arrivals. */
export const spawnInterval = (round: number) => Math.max(0.8, 2.4 - 0.1 * round)

/** From round five on, every enemy has a little more health than the one before it did... */
export const enemyHealthScale = (round: number) => 1 + 0.08 * Math.max(0, round - 4)

/** ...and hits a little harder, so a build that out-heals the crowd is caught up with eventually. */
export const enemyPower = (round: number) => 1 + 0.06 * Math.max(0, round - 4)
