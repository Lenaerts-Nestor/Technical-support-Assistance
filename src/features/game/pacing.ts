/** How a run gets harder round by round: the formulas for budget, crowd size and pace. */
import type { EnemyKind } from './config'

/** How much enemy there is to fight in a round: it grows every round, a little faster as it goes. */
export const roundBudget = (round: number) => 6 + 4 * round + 2 * Math.floor(round / 3)

/** How many enemies may be on screen at once. */
export const maxAlive = (round: number) => Math.min(8, 4 + Math.floor(round / 2))

/** How many of the tough kinds may be on screen at once. */
export const maxOf = (kind: EnemyKind, round: number) =>
  kind === 'orc' ? Math.min(3, 1 + Math.floor(round / 3)) : kind === 'ogre' ? (round >= 7 ? 2 : 1) : 99

/** Seconds between arrivals. */
export const spawnInterval = (round: number) => Math.max(0.8, 2.4 - 0.1 * round)

/** From round five on, every enemy has a little more health than the one before it did... */
export const enemyHealthScale = (round: number) => 1 + 0.08 * Math.max(0, round - 4)

/** ...and hits a little harder, so a build that out-heals the crowd is caught up with eventually. */
export const enemyPower = (round: number) => 1 + 0.06 * Math.max(0, round - 4)
