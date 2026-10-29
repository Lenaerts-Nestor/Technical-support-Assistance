/**
 * The places the fight moves through: a new one every time a boss falls (every fifth round),
 * cycling cave, jungle, overgrown cave. A biome decides how the arena looks and where the
 * ledges are. Pure data, so the rules can put the ledges in the world.
 */
import { ROUNDS } from './config'

export type BiomeId = 'cave' | 'jungle' | 'overgrown'

/** A ledge you can jump up onto and stand on: solid from above, open from below. */
export type Platform = {
  /** Where its middle is, how wide the part you can stand on is, and how high the surface is. */
  cx: number
  width: number
  y: number
  /** Which baked picture draws it. */
  sprite: 'plat_a' | 'plat_b'
}

export type BiomeDef = {
  id: BiomeId
  name: string
  blurb: string
  platforms: readonly Platform[]
}

/** About as high as a full jump reaches, so a held jump gets you up and a hop does not. */
export const LEDGE = 105

export const BIOMES: Record<BiomeId, BiomeDef> = {
  cave: {
    id: 'cave',
    name: 'The Hollow',
    blurb: 'A dark cave of broken rock.',
    platforms: [
      { cx: 215, width: 300, y: LEDGE, sprite: 'plat_a' },
      { cx: 750, width: 260, y: LEDGE, sprite: 'plat_b' },
    ],
  },
  jungle: {
    id: 'jungle',
    name: 'The Thicket',
    blurb: 'Vines and roots have taken the cave.',
    platforms: [
      { cx: 160, width: 260, y: LEDGE, sprite: 'plat_b' },
      { cx: 480, width: 260, y: LEDGE, sprite: 'plat_b' },
      { cx: 800, width: 260, y: LEDGE, sprite: 'plat_b' },
    ],
  },
  overgrown: {
    id: 'overgrown',
    name: 'The Overgrowth',
    blurb: 'Rock and rot under a green glow.',
    platforms: [
      { cx: 300, width: 300, y: LEDGE, sprite: 'plat_a' },
      { cx: 680, width: 260, y: LEDGE, sprite: 'plat_b' },
    ],
  },
}

export const BIOME_ORDER: readonly BiomeId[] = ['cave', 'jungle', 'overgrown']

/** The biome a round is fought in: five rounds each, so a new one follows every boss. */
export const biomeForRound = (round: number): BiomeId => BIOME_ORDER[Math.floor((round - 1) / ROUNDS.bossEvery) % BIOME_ORDER.length]

/** The first round of a stretch in one biome. */
export const startsBiome = (round: number) => (round - 1) % ROUNDS.bossEvery === 0
