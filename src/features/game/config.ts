/**
 * Every number that shapes how the game feels, in one place so balancing is a matter of
 * editing this file. Distances are in arena pixels (the arena is `ARENA.width` wide no matter
 * how large the canvas is drawn), times in seconds, speeds in pixels per second.
 */

export const ARENA = { width: 960, height: 480, groundY: 412 } as const

/** Drawn size of every character relative to the artwork's own units. */
export const ART_SCALE = 0.8

export const PLAYER = {
  maxHp: 100,
  halfWidth: 16,
  height: 120,
  speed: 250,
  groundAccel: 3200,
  airAccel: 2200,
  jumpSpeed: 760,
  /** Letting go of jump early caps the upward speed at this share, for a short hop. */
  jumpCut: 0.45,
  gravity: 2400,
  hurtTime: 0.28,
  /** Grace period after a hit during which nothing can hurt the player again. */
  invulnAfterHit: 0.7,
  /** How long a button press waits for the player to be able to act on it. */
  inputBuffer: 0.16,
} as const

export const DASH = {
  speed: 780,
  time: 0.17,
  cooldown: 0.65,
  invuln: 0.24,
} as const

export type AttackStep = {
  duration: number
  /** The blade is dangerous between these two moments. */
  hitStart: number
  hitEnd: number
  /** From here on the next combo hit (or a dash or jump) may interrupt the recovery. */
  cancelAt: number
  damage: number
  reach: number
  knockback: number
  /** Forward speed given at `hitStart`. */
  lunge: number
  hitStop: number
  shake: number
  /** Sword arm angle in radians, relative to resting: negative is raised, positive is swung down. */
  swing: { from: number; to: number }
}

/** The light combo: two quick cuts, then a slower finisher with knockback. */
export const LIGHT_COMBO: readonly AttackStep[] = [
  { duration: 0.3, hitStart: 0.07, hitEnd: 0.15, cancelAt: 0.2, damage: 10, reach: 116, knockback: 190, lunge: 140, hitStop: 0.045, shake: 2, swing: { from: -1.35, to: 0.95 } },
  { duration: 0.3, hitStart: 0.07, hitEnd: 0.15, cancelAt: 0.2, damage: 10, reach: 116, knockback: 190, lunge: 140, hitStop: 0.045, shake: 2, swing: { from: 1.05, to: -1.25 } },
  { duration: 0.52, hitStart: 0.17, hitEnd: 0.27, cancelAt: 0.52, damage: 16, reach: 132, knockback: 430, lunge: 270, hitStop: 0.1, shake: 6, swing: { from: -2.3, to: 1.3 } },
]

/** After a combo hit the next press continues the chain for this long; after that it starts over. */
export const COMBO_WINDOW = 0.32

/** With no direction held, a swing turns towards an enemy this close. */
export const AIM_ASSIST_RANGE = 170

export type EnemyKind = 'goblin'

export type EnemyStats = {
  hp: number
  halfWidth: number
  height: number
  speed: number
  damage: number
  score: number
  /** How strongly knockback moves it: 1 is normal, less is heavier. */
  knockScale: number
  /** The pause (and flinch) after a hit. */
  hurtTime: number
  /** It starts an attack once the player is this close. */
  attackRange: number
  windup: number
  leapSpeed: number
  leapLift: number
  recover: number
  attackCooldown: number
}

export const ENEMIES: Record<EnemyKind, EnemyStats> = {
  goblin: {
    hp: 20,
    halfWidth: 18,
    height: 72,
    speed: 165,
    damage: 7,
    score: 10,
    knockScale: 1,
    hurtTime: 0.28,
    attackRange: 150,
    windup: 0.42,
    leapSpeed: 360,
    leapLift: 440,
    recover: 0.45,
    attackCooldown: 0.9,
  },
}

export const SPAWN = {
  firstDelay: 1,
  interval: 2.4,
  fastestInterval: 1.2,
  maxAlive: 4,
  /** Spawns start this far outside the visible arena. */
  margin: 50,
} as const
