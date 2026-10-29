/**
 * What is known about each character's sprite sheets, read off the frames: how many there are,
 * which are the wind-up, the strike (the slash effect is drawn into these) and the recovery of
 * each attack, and where the feet and the middle of the body sit in the 100x100 frame.
 * Pure data, so the rules can use it without loading any images.
 */

export type SpriteId = 'soldier' | 'orc' | 'demon' | 'monster'

export type ClipId = 'idle' | 'walk' | 'attack01' | 'attack02' | 'attack03' | 'hurt' | 'death'

/** Inclusive frame ranges of an attack animation. */
export type Phases = { windup: readonly [number, number]; strike: readonly [number, number]; recover: readonly [number, number] }

export type SpriteInfo = {
  frames: Partial<Record<ClipId, number>>
  phases: Partial<Record<'attack01' | 'attack02' | 'attack03', Phases>>
  /** The row of the frame the feet stand on, and the column of the middle of the body. */
  footY: number
  centerX: number
  /** Body height in art pixels (idle), for sizing. */
  bodyHeight: number
}

export const FRAME = 100

export const SPRITES: Record<SpriteId, SpriteInfo> = {
  soldier: {
    frames: { idle: 6, walk: 8, attack01: 6, attack02: 6, attack03: 9, hurt: 4, death: 4 },
    phases: {
      attack01: { windup: [0, 2], strike: [3, 4], recover: [5, 5] },
      attack02: { windup: [0, 2], strike: [3, 4], recover: [5, 5] },
      // Shield up and sword drawn back, then the long thrust, then the recovery.
      attack03: { windup: [0, 6], strike: [7, 7], recover: [8, 8] },
    },
    footY: 60,
    centerX: 49,
    bodyHeight: 21,
  },
  orc: {
    frames: { idle: 6, walk: 8, attack01: 6, attack02: 6, hurt: 4, death: 4 },
    phases: {
      attack01: { windup: [0, 2], strike: [3, 4], recover: [5, 5] },
      attack02: { windup: [0, 2], strike: [3, 4], recover: [5, 5] },
    },
    footY: 57,
    centerX: 53,
    bodyHeight: 15,
  },
  demon: {
    frames: { idle: 6, walk: 8, attack01: 7, attack02: 7, hurt: 4, death: 4 },
    phases: {
      attack01: { windup: [0, 3], strike: [4, 6], recover: [6, 6] },
      attack02: { windup: [0, 2], strike: [3, 4], recover: [5, 6] },
    },
    footY: 59,
    centerX: 53,
    bodyHeight: 20,
  },
  monster: {
    frames: { idle: 6, walk: 8, attack01: 8, attack02: 8, hurt: 4, death: 4 },
    phases: {
      attack01: { windup: [0, 3], strike: [4, 5], recover: [6, 7] },
      attack02: { windup: [0, 4], strike: [5, 6], recover: [7, 7] },
    },
    footY: 57,
    centerX: 51,
    bodyHeight: 15,
  },
}

export const SPRITE_IDS = Object.keys(SPRITES) as SpriteId[]

/** The frame an attack animation shows `t` of the way (0 to 1) through a phase. */
export function phaseFrame(range: readonly [number, number], t: number) {
  const [from, to] = range
  return Math.min(to, from + Math.floor(Math.max(0, Math.min(0.999, t)) * (to - from + 1)))
}

/**
 * The frame of an attack at `time` seconds in. `hitStart`, `hitEnd` and `duration` split the
 * time into wind-up, strike and recovery, and each plays its own frames across its own span,
 * so the slash lands on the very moment the rules say the blow does.
 */
export function attackFrame(phases: Phases, time: number, hitStart: number, hitEnd: number, duration: number) {
  if (time < hitStart) return phaseFrame(phases.windup, hitStart > 0 ? time / hitStart : 1)
  if (time <= hitEnd) return phaseFrame(phases.strike, hitEnd > hitStart ? (time - hitStart) / (hitEnd - hitStart) : 1)
  return phaseFrame(phases.recover, duration > hitEnd ? (time - hitEnd) / (duration - hitEnd) : 1)
}
