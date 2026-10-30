/**
 * How a run gets harder round by round. The crowd stays small: the challenge grows with what
 * comes (new kinds of enemy, elites, tougher bodies), not with how many come at once.
 */
import { COST, ROUNDS } from './config'
import type { EnemyKind } from './config'

/** How much enemy a round of slaying holds: a few more each round. */
const plainBudget = (round: number) => 7 + 2 * round + 2 * Math.floor(round / 3)

/** Every fifth round is the boss. */
export const isBossRound = (round: number) => round % ROUNDS.bossEvery === 0

/** The boss round's budget is the boss plus a small escort that keeps coming while it lives. */
export const roundBudget = (round: number) => (isBossRound(round) ? COST.warlord + Math.round(plainBudget(round) * 0.5) : plainBudget(round))

/** How many enemies may be on screen at once: few, and slowly more. */
export const maxAlive = (round: number) => (isBossRound(round) ? 3 : Math.min(5, 2 + Math.floor((round + 1) / 3)))

/** How many of one kind may be on screen at once, so a crowd is always a mix. */
export const maxOf = (kind: EnemyKind, round: number) =>
  ({ imp: 3, demon: 2 + Math.floor(round / 8), lancer: 2, archer: round >= 9 ? 2 : 1, brute: round >= 9 ? 2 : 1, warlord: 1 })[kind]

/** Whether a kind turns up yet. */
export const unlocked = (kind: EnemyKind, round: number) => round >= ROUNDS.unlock[kind]

/** Seconds between arrivals. */
export const spawnInterval = (round: number) => Math.max(1.2, 2.8 - 0.1 * round)

/** The chance that an enemy comes as an elite. */
export const eliteChance = (round: number) => (round < ROUNDS.eliteFromRound ? 0 : Math.min(0.45, 0.12 + 0.04 * (round - ROUNDS.eliteFromRound)))

/** From round two on, every enemy has more health than the one before it did... */
export const enemyHealthScale = (round: number) => 1 + 0.08 * Math.max(0, round - 1)

/** ...and hits a little harder, so a build that out-heals the crowd is caught up with eventually. */
export const enemyPower = (round: number) => 1 + 0.05 * Math.max(0, round - 1)
