/**
 * What a round asks of the player. Some are won by putting the whole wave down; others by
 * gathering soul shards scattered over the ledges, or by lighting shrines on different tiers,
 * while the enemies keep coming. Those send the player up and down the level instead of letting
 * them hold one spot. Every fifth round is the boss, won when it falls.
 */
import { ledgeLeft, tierOf } from './biomes'
import type { Platform } from './biomes'
import { ROUNDS } from './config'

type Rng = () => number

export type ObjectiveKind = 'slay' | 'shards' | 'shrines' | 'boss'

/** A soul shard waiting to be picked up, hovering over a ledge. */
export type Shard = { x: number; y: number; taken: boolean }

/** A shrine: stand by it until it is lit. It cools again slowly while nobody is there. */
export type Shrine = { x: number; y: number; charge: number; lit: boolean }

export type Objective = {
  kind: ObjectiveKind
  shards: Shard[]
  shrines: Shrine[]
}

export const OBJECTIVE = {
  /** How close the hero must come to a shard to take it. */
  pickupRange: 36,
  shardScore: 40,
  shardHeal: 4,
  /** Seconds of standing by a shrine to light it, how far from it counts, and how fast it cools. */
  shrineTime: 3.5,
  shrineRange: 56,
  shrineDecay: 0.12,
  shrineScore: 80,
} as const

/** The kind of round: the boss every fifth, otherwise a cycle of slay, shards, shrines, shards. */
export function objectiveKindFor(round: number): ObjectiveKind {
  if (round % ROUNDS.bossEvery === 0) return 'boss'
  return (['slay', 'shards', 'shrines', 'shards'] as const)[(round - 1) % ROUNDS.bossEvery]
}

/** How many shards or shrines a round asks for. */
export const shardsFor = (round: number) => Math.min(6, 3 + Math.floor(round / 4))
export const shrinesFor = (round: number) => (round >= 8 ? 3 : 2)

/**
 * Spots on the ledges, one per tier first (highest first) so the hunt always covers the whole
 * height of the level, then anywhere. Never two on the same ledge if it can be helped.
 */
function spotsOnLedges(platforms: readonly Platform[], count: number, rng: Rng): { x: number; y: number }[] {
  const ledges = [...platforms]
  const spots: { x: number; y: number }[] = []
  const used = new Set<Platform>()
  const place = (p: Platform) => {
    used.add(p)
    const margin = Math.min(40, p.width / 4)
    spots.push({ x: ledgeLeft(p) + margin + rng() * (p.width - margin * 2), y: p.y })
  }
  const tiers = [...new Set(ledges.map((p) => tierOf(p.y)))].sort((a, b) => b - a)
  for (const tier of tiers) {
    if (spots.length >= count) break
    const options = ledges.filter((p) => tierOf(p.y) === tier)
    place(options[Math.floor(rng() * options.length)])
  }
  while (spots.length < count) {
    const free = ledges.filter((p) => !used.has(p))
    const options = free.length > 0 ? free : ledges
    if (options.length === 0) break
    place(options[Math.floor(rng() * options.length)])
    if (free.length === 0) used.clear()
  }
  return spots
}

export function createObjective(round: number, platforms: readonly Platform[], rng: Rng): Objective {
  const kind = objectiveKindFor(round)
  const objective: Objective = { kind, shards: [], shrines: [] }
  if (kind === 'shards') objective.shards = spotsOnLedges(platforms, shardsFor(round), rng).map((s) => ({ ...s, taken: false }))
  if (kind === 'shrines') objective.shrines = spotsOnLedges(platforms, shrinesFor(round), rng).map((s) => ({ ...s, charge: 0, lit: false }))
  return objective
}

/** How far along the objective is, as done and needed (the slay and boss rounds count elsewhere). */
export function objectiveProgress(o: Objective): { done: number; needed: number } {
  if (o.kind === 'shards') return { done: o.shards.filter((s) => s.taken).length, needed: o.shards.length }
  if (o.kind === 'shrines') return { done: o.shrines.filter((s) => s.lit).length, needed: o.shrines.length }
  return { done: 0, needed: 0 }
}

/** What the round asks, in a few words, for the screen. */
export function objectiveText(kind: ObjectiveKind): string {
  return { slay: 'Defeat every enemy', shards: 'Gather the soul shards', shrines: 'Light the shrines', boss: 'Defeat the boss' }[kind]
}
