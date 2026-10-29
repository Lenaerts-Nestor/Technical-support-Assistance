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
  maxStamina: 100,
  /** Stamina regained per second, starting `staminaDelay` after the last spend. */
  staminaRegen: 36,
  staminaDelay: 0.7,
  /** Regeneration continues at this share while the shield is up. */
  blockRegenShare: 0.35,
} as const

export const DASH = {
  speed: 780,
  time: 0.17,
  cooldown: 0.5,
  invuln: 0.24,
  stamina: 18,
} as const

export const SHIELD = {
  /** A block raised no longer than this before the hit lands is a parry. */
  parryWindow: 0.16,
  /** Walking speed while the shield is up. */
  moveShare: 0.35,
  /** After lowering the shield it cannot be raised again for this long, so a parry cannot be spammed. */
  cooldown: 0.28,
  /** Turning round with the shield up leaves the back open for this long. */
  turnDelay: 0.14,
  parryStamina: 22,
  parryScore: 25,
  /** The push a blocked hit gives. */
  knock: 170,
} as const

export type AttackStep = {
  duration: number
  /** The blade is dangerous between these two moments. */
  hitStart: number
  hitEnd: number
  /** From here on the next hit of the combo (or a dash or jump) may interrupt the recovery. */
  cancelAt: number
  damage: number
  /** How much this hit chips away at an enemy's poise (see `EnemyStats.poise`). */
  poise: number
  stamina: number
  reach: number
  knockback: number
  /** Forward speed given at `hitStart`. */
  lunge: number
  hitStop: number
  shake: number
  /** Sword arm angle in radians, relative to resting: negative is raised, positive is swung down. */
  swing: { from: number; to: number }
}

export type ComboKind = 'light' | 'heavy'

/** The light combo: two quick cuts, then a slower finisher with knockback. */
const LIGHT_COMBO: readonly AttackStep[] = [
  { duration: 0.3, hitStart: 0.07, hitEnd: 0.15, cancelAt: 0.2, damage: 10, poise: 8, stamina: 0, reach: 116, knockback: 190, lunge: 140, hitStop: 0.045, shake: 2, swing: { from: -1.35, to: 0.95 } },
  { duration: 0.3, hitStart: 0.07, hitEnd: 0.15, cancelAt: 0.2, damage: 10, poise: 8, stamina: 0, reach: 116, knockback: 190, lunge: 140, hitStop: 0.045, shake: 2, swing: { from: 1.05, to: -1.25 } },
  { duration: 0.52, hitStart: 0.17, hitEnd: 0.27, cancelAt: 0.52, damage: 16, poise: 14, stamina: 0, reach: 132, knockback: 430, lunge: 270, hitStop: 0.1, shake: 6, swing: { from: -2.3, to: 1.3 } },
]

/** The heavy combo: a slow overhead chop, then a rising cut. Costs stamina, breaks poise. */
const HEAVY_COMBO: readonly AttackStep[] = [
  { duration: 0.64, hitStart: 0.26, hitEnd: 0.36, cancelAt: 0.46, damage: 26, poise: 40, stamina: 22, reach: 128, knockback: 300, lunge: 190, hitStop: 0.09, shake: 5, swing: { from: -2.45, to: 1.25 } },
  { duration: 0.72, hitStart: 0.24, hitEnd: 0.34, cancelAt: 0.72, damage: 34, poise: 55, stamina: 26, reach: 142, knockback: 540, lunge: 250, hitStop: 0.13, shake: 8, swing: { from: 1.5, to: -2.1 } },
]

export const COMBOS: Record<ComboKind, readonly AttackStep[]> = { light: LIGHT_COMBO, heavy: HEAVY_COMBO }

/** After a combo hit the next press continues the chain for this long; after that it starts over. */
export const COMBO_WINDOW = 0.32

/** With no direction held, a swing turns towards an enemy this close. */
export const AIM_ASSIST_RANGE = 170

/** An enemy that is staggered or recovering from its own attack takes this much more damage. */
export const VULNERABLE_BONUS = 1.3

/** Poise damage wears off if an enemy is left alone this long. */
export const POISE_RESET = 2

export type EnemyKind = 'goblin' | 'orc' | 'ogre'

/** A wave of rock the ogre's slam sends along the ground; jump or dash it. */
export type WaveStats = { speed: number; life: number; damage: number; height: number; halfWidth: number; blockCost: number }

export type EnemyStats = {
  hp: number
  halfWidth: number
  height: number
  /** Where health bars and warnings float: above the tallest part of the drawing (horns, ears). */
  labelHeight: number
  speed: number
  damage: number
  score: number
  /** Heavy enemies shove the player aside instead of being shoved. */
  heavy: boolean
  /** How strongly knockback moves it: 1 is normal, less is heavier. */
  knockScale: number
  /** The pause (and flinch) after a hit that breaks poise. 0 poise means every hit does. */
  hurtTime: number
  /** How much poise damage it shrugs off before it staggers. 0: every hit staggers it. */
  poise: number
  staggerTime: number
  /** What a blocked hit from it costs the player in stamina. */
  blockCost: number
  /** The way it attacks: a leap at the player, a sideways chop, or an overhead slam. */
  style: 'leap' | 'swing' | 'slam'
  /** It starts an attack once the player is this close. */
  attackRange: number
  windup: number
  /** How long the strike stays dangerous (chop and slam). */
  active: number
  recover: number
  attackCooldown: number
  /** Forward reach and height of a chop or slam, from the enemy's middle. */
  reach: number
  hitHeight: number
  leapSpeed: number
  leapLift: number
  wave?: WaveStats
}

export const ENEMIES: Record<EnemyKind, EnemyStats> = {
  goblin: {
    hp: 20,
    halfWidth: 18,
    height: 72,
    labelHeight: 88,
    speed: 165,
    damage: 7,
    score: 10,
    heavy: false,
    knockScale: 1,
    hurtTime: 0.28,
    poise: 0,
    staggerTime: 0.28,
    blockCost: 8,
    style: 'leap',
    attackRange: 150,
    windup: 0.42,
    active: 0,
    recover: 0.45,
    attackCooldown: 0.9,
    reach: 0,
    hitHeight: 0,
    leapSpeed: 360,
    leapLift: 440,
  },
  orc: {
    hp: 70,
    halfWidth: 30,
    height: 165,
    labelHeight: 195,
    speed: 92,
    damage: 16,
    score: 25,
    heavy: false,
    knockScale: 0.6,
    hurtTime: 0.35,
    poise: 30,
    staggerTime: 0.95,
    blockCost: 18,
    style: 'swing',
    attackRange: 108,
    windup: 0.55,
    active: 0.14,
    recover: 0.6,
    attackCooldown: 1,
    reach: 118,
    hitHeight: 140,
    leapSpeed: 0,
    leapLift: 0,
  },
  ogre: {
    hp: 190,
    halfWidth: 56,
    height: 225,
    labelHeight: 252,
    speed: 48,
    damage: 30,
    score: 60,
    heavy: true,
    knockScale: 0.25,
    hurtTime: 0.4,
    poise: 85,
    staggerTime: 1.4,
    blockCost: 45,
    style: 'slam',
    attackRange: 175,
    windup: 0.95,
    active: 0.16,
    recover: 1.1,
    attackCooldown: 1.5,
    reach: 170,
    hitHeight: 210,
    leapSpeed: 0,
    leapLift: 0,
    wave: { speed: 340, life: 0.85, damage: 14, height: 34, halfWidth: 22, blockCost: 15 },
  },
}

export const SPAWN = {
  firstDelay: 1,
  interval: 2.4,
  fastestInterval: 1.2,
  maxAlive: 5,
  /** A stand-in for the round system: tougher enemies are mixed in after this many kills. */
  orcAfterKills: 3,
  ogreAfterKills: 8,
  maxOrcs: 2,
  maxOgres: 1,
  /** Spawns start this far outside the visible arena, beyond the enemy's own half width. */
  margin: 30,
} as const
