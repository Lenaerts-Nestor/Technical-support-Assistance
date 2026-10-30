/**
 * The places the fight moves through: a new one every time a boss falls (every fifth round),
 * cycling the wetlands, the hollow and the abyss. A place decides how the arena looks and where
 * the ledges are: three tiers of them above the ground, staggered so each can be reached with a
 * jump from the one below. Ledges that meet a side of the arena are where enemies can walk in
 * high up. Pure data, so the rules can put the ledges in the world.
 */
import { ARENA, ROUNDS, TIER } from './config'

export type BiomeId = 'wetlands' | 'hollow' | 'abyss'

/** A ledge you can jump up onto and stand on: solid from above, open from below. */
export type Platform = {
  /** Where its middle is, how wide the part you can stand on is, and how high the surface is. */
  cx: number
  width: number
  y: number
}

export type BiomeDef = {
  id: BiomeId
  name: string
  blurb: string
  platforms: readonly Platform[]
}

/** The height of the first tier: about as high as a full jump reaches, so a held jump gets you up and a hop does not. */
export const LEDGE = TIER.step

/** A ledge from `left` to `right` on tier `tier` (1 is the lowest). */
const span = (left: number, right: number, tier: number): Platform => ({ cx: (left + right) / 2, width: right - left, y: tier * TIER.step })

const W = ARENA.width

export const BIOMES: Record<BiomeId, BiomeDef> = {
  wetlands: {
    id: 'wetlands',
    name: 'The Drowned Wetlands',
    blurb: 'Mist over black water and dead reeds.',
    platforms: [span(0, 320, 1), span(560, 720, 1), span(960, W, 1), span(240, 560, 2), span(720, 1040, 2), span(480, 800, 3)],
  },
  hollow: {
    id: 'hollow',
    name: 'The Hollow',
    blurb: 'A sunken wood where nothing grows.',
    platforms: [span(0, 280, 1), span(500, 780, 1), span(1000, W, 1), span(180, 480, 2), span(800, 1100, 2), span(380, 620, 3), span(660, 900, 3)],
  },
  abyss: {
    id: 'abyss',
    name: 'The Abyssal Gate',
    blurb: 'The gate is open, and they come from every height.',
    platforms: [span(120, 440, 1), span(840, 1160, 1), span(0, 300, 2), span(490, 790, 2), span(980, W, 2), span(260, 560, 3), span(720, 1020, 3)],
  },
}

export const BIOME_ORDER: readonly BiomeId[] = ['wetlands', 'hollow', 'abyss']

/** The biome a round is fought in: five rounds each, so a new one follows every boss. */
export const biomeForRound = (round: number): BiomeId => BIOME_ORDER[Math.floor((round - 1) / ROUNDS.bossEvery) % BIOME_ORDER.length]

/** The first round of a stretch in one biome. */
export const startsBiome = (round: number) => (round - 1) % ROUNDS.bossEvery === 0

export const ledgeLeft = (p: Platform) => p.cx - p.width / 2
export const ledgeRight = (p: Platform) => p.cx + p.width / 2

/** The heights at which enemies can walk in from each side: the ground, and any ledge that meets that side. */
export function entrances(platforms: readonly Platform[]): { left: number[]; right: number[] } {
  const left = [0]
  const right = [0]
  for (const p of platforms) {
    if (ledgeLeft(p) <= 0) left.push(p.y)
    if (ledgeRight(p) >= ARENA.width) right.push(p.y)
  }
  return { left, right }
}

/** Which tier a height is on: 0 for the ground, 1 to 3 for the ledges. */
export const tierOf = (y: number) => Math.round(y / TIER.step)
