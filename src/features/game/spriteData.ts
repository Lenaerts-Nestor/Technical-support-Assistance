/**
 * What is known about each character's sprite sheets, read off the frames: how big a frame is,
 * how many each clip has, where the feet and the middle of the body sit, and the attacks the
 * character's clips hold, each split into wind-up, strike (the slash effect is drawn into these
 * frames) and recovery. Pure data, so the rules can use it without loading any images.
 *
 * The three heroes and the Shadeflit are from the SHADOW Series pack; the rest from the Tiny
 * RPG packs (100x100 frames).
 */

export type SpriteId = 'huntress' | 'hallokin' | 'warden' | 'flit' | 'soldier' | 'orc' | 'demon' | 'monster'

export type ClipId =
  | 'idle'
  | 'walk'
  | 'jump'
  | 'fall'
  | 'dash'
  | 'hurt'
  | 'death'
  | 'attack01'
  | 'attack02'
  | 'attack03'
  | 'dashAttack'
  | 'airUp'
  | 'airDown'
  | 'airForward'

/** Inclusive frame ranges of an attack, in one clip. */
export type Phases = { clip: ClipId; windup: readonly [number, number]; strike: readonly [number, number]; recover: readonly [number, number] }

export type SpriteInfo = {
  frameW: number
  frameH: number
  frames: Partial<Record<ClipId, number>>
  /** The attacks this character's clips hold, by name. A clip may hold more than one. */
  moves: Record<string, Phases>
  /** A held frame for the guard (only the Warden has one). */
  guard?: { clip: ClipId; frame: number }
  /**
   * For clips whose artist moved the body forward inside the frame (a dash drawn as travel), how
   * far forward it is in each frame, in art pixels. The game moves the character itself, so the
   * drawing takes this back out; otherwise the body would run ahead and snap back when the clip ends.
   */
  shift?: Partial<Record<ClipId, readonly number[]>>
  /** The row of the frame the feet stand on, and the column of the middle of the body. */
  footY: number
  centerX: number
  /** Body height in art pixels (idle), its left and right edge, and the middle of the head, for sizing and framing portraits. */
  bodyHeight: number
  bodyLeft: number
  bodyRight: number
  headX: number
}

const tiny = (frames: SpriteInfo['frames'], moves: SpriteInfo['moves'], footY: number, centerX: number, bodyHeight: number): SpriteInfo => ({
  frameW: 100,
  frameH: 100,
  frames,
  moves,
  footY,
  centerX,
  bodyHeight,
  bodyLeft: centerX - 8,
  bodyRight: centerX + 8,
  headX: centerX,
})

export const SPRITES: Record<SpriteId, SpriteInfo> = {
  huntress: {
    frameW: 240,
    frameH: 128,
    frames: { idle: 12, walk: 8, jump: 4, fall: 4, dash: 4, airUp: 4, airDown: 4, attack01: 3, attack02: 5, attack03: 5, dashAttack: 3, hurt: 1, death: 10 },
    moves: {
      // The quick cut has its slash in every frame, so it has no wind-up of its own.
      cut: { clip: 'attack01', windup: [0, 0], strike: [0, 1], recover: [2, 2] },
      reap: { clip: 'attack02', windup: [0, 0], strike: [1, 3], recover: [4, 4] },
      phantom: { clip: 'attack03', windup: [0, 0], strike: [1, 3], recover: [4, 4] },
      dashCut: { clip: 'dashAttack', windup: [0, 0], strike: [1, 1], recover: [2, 2] },
      rising: { clip: 'airUp', windup: [0, 0], strike: [1, 2], recover: [3, 3] },
      plunge: { clip: 'airDown', windup: [0, 0], strike: [1, 2], recover: [3, 3] },
    },
    shift: { attack03: [0, 0, 78, 78, 80], dashAttack: [0, 78, 78] },
    footY: 79,
    centerX: 118,
    bodyHeight: 38,
    bodyLeft: 111,
    bodyRight: 125,
    headX: 119,
  },
  hallokin: {
    frameW: 192,
    frameH: 128,
    frames: { idle: 6, walk: 4, jump: 3, fall: 3, hurt: 1, attack01: 7, attack02: 6, airForward: 5 },
    moves: {
      ember: { clip: 'attack01', windup: [0, 1], strike: [2, 4], recover: [5, 6] },
      pillar: { clip: 'attack02', windup: [0, 1], strike: [2, 4], recover: [5, 5] },
      comet: { clip: 'airForward', windup: [0, 0], strike: [1, 3], recover: [4, 4] },
    },
    footY: 79,
    centerX: 57,
    bodyHeight: 22,
    bodyLeft: 51,
    bodyRight: 63,
    headX: 57,
  },
  warden: {
    frameW: 247,
    frameH: 87,
    frames: { idle: 14, walk: 14, attack01: 10, attack02: 9, attack03: 14, hurt: 1, death: 33 },
    moves: {
      // `attack01` is two blows: a long sweep along the ground, then a slash straight up.
      sweep: { clip: 'attack01', windup: [0, 1], strike: [2, 3], recover: [4, 5] },
      uppercut: { clip: 'attack01', windup: [6, 6], strike: [7, 8], recover: [9, 9] },
      tail: { clip: 'attack02', windup: [0, 1], strike: [2, 5], recover: [6, 8] },
      // Curl up, roll along the ground, burst out in a crescent.
      roll: { clip: 'attack03', windup: [0, 2], strike: [3, 9], recover: [10, 13] },
    },
    guard: { clip: 'attack03', frame: 1 },
    footY: 86,
    centerX: 100,
    bodyHeight: 57,
    bodyLeft: 47,
    bodyRight: 119,
    headX: 106,
  },
  flit: {
    frameW: 277,
    frameH: 161,
    frames: { idle: 6, walk: 6, hurt: 1, attack01: 8 },
    // A held stance, then the run with the spear levelled.
    moves: { lance: { clip: 'attack01', windup: [0, 1], strike: [2, 7], recover: [7, 7] } },
    footY: 105,
    centerX: 62,
    bodyHeight: 40,
    bodyLeft: 36,
    bodyRight: 89,
    headX: 64,
  },
  soldier: tiny(
    { idle: 6, walk: 8, attack01: 6, attack02: 6, attack03: 9, hurt: 4, death: 4 },
    {
      chop: { clip: 'attack01', windup: [0, 2], strike: [3, 4], recover: [5, 5] },
      // The bow: drawn over seven frames, loosed on the eighth.
      shoot: { clip: 'attack03', windup: [0, 6], strike: [7, 7], recover: [8, 8] },
    },
    60,
    49,
    21,
  ),
  orc: tiny(
    { idle: 6, walk: 8, attack01: 6, attack02: 6, hurt: 4, death: 4 },
    {
      chop: { clip: 'attack01', windup: [0, 2], strike: [3, 4], recover: [5, 5] },
      slam: { clip: 'attack02', windup: [0, 2], strike: [3, 4], recover: [5, 5] },
    },
    57,
    53,
    15,
  ),
  demon: tiny(
    { idle: 6, walk: 8, attack01: 7, attack02: 7, hurt: 4, death: 4 },
    {
      thrust: { clip: 'attack01', windup: [0, 3], strike: [4, 6], recover: [6, 6] },
      slash: { clip: 'attack02', windup: [0, 2], strike: [3, 4], recover: [5, 6] },
    },
    59,
    53,
    20,
  ),
  monster: tiny(
    { idle: 6, walk: 8, attack01: 8, attack02: 8, hurt: 4, death: 4 },
    {
      claw: { clip: 'attack01', windup: [0, 3], strike: [4, 5], recover: [6, 7] },
      pounce: { clip: 'attack02', windup: [0, 4], strike: [5, 6], recover: [7, 7] },
    },
    57,
    51,
    15,
  ),
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
