/**
 * Every number that shapes how the game feels, in one place so balancing is a matter of
 * editing this file. Distances are in arena pixels (the arena is `ARENA.width` wide no matter
 * how large the canvas is drawn), times in seconds, speeds in pixels per second.
 */

export const ARENA = { width: 960, height: 480, groundY: 412 } as const

/** Numbers every hero shares. What differs (health, speed, size, moves) is in `heroes.ts`. */
export const PLAYER = {
  maxHp: 100,
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

/** The attack animations a character has. Each hero's moves are timed to these frames. */
export type AttackClip = 'attack01' | 'attack02' | 'attack03'

export type AttackStep = {
  duration: number
  /** The blow is dangerous between these two moments, and the strike frames of the animation play then. */
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
  /** Which animation to play. The wind-up frames run until `hitStart`, the strike frames until `hitEnd`. */
  clip: AttackClip
  /** An upward leap given at `hitStart` (the pounce). */
  hop?: number
  /** Cannot be hurt while the blow is out (a rush). */
  rush?: boolean
  /** Sends a wave of rock along the ground at `hitStart`. */
  wave?: { speed: number; life: number; damage: number; height: number; halfWidth: number; poise: number; knockback: number }
}

/** `light` and `heavy` are the two attack buttons. */
export type ComboKind = 'light' | 'heavy'

/** After a combo hit the next press continues the chain for this long; after that it starts over. */
export const COMBO_WINDOW = 0.32

/** An enemy that is staggered or recovering from its own attack takes this much more damage. */
export const VULNERABLE_BONUS = 1.3

/** Poise damage wears off if an enemy is left alone this long. */
export const POISE_RESET = 2

export type EnemyKind = 'goblin' | 'orc' | 'ogre' | 'warlord'

/** A wave of rock the ogre's slam sends along the ground; jump or dash it. */
export type WaveStats = { speed: number; life: number; damage: number; height: number; halfWidth: number; blockCost: number }

/** What the boss can do besides the ogre's slam: a charge across the arena, and a roar that calls goblins. */
export type BossStats = {
  chargeWindup: number
  chargeSpeed: number
  /** The longest a charge lasts if it meets no wall. */
  chargeTime: number
  chargeDamage: number
  chargeBlockCost: number
  /** How many goblins a roar calls in. */
  summon: number
  roarWindup: number
  /** Below this share of health it is enraged: faster, and its slam throws a wave both ways. */
  enrageAt: number
}

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
  style: 'leap' | 'swing' | 'slam' | 'boss'
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
  /** Whether it hops up to a ledge to get at a player standing on one. */
  canJump: boolean
  wave?: WaveStats
  boss?: BossStats
}

export const ENEMIES: Record<EnemyKind, EnemyStats> = {
  goblin: {
    hp: 20,
    halfWidth: 22,
    height: 75,
    labelHeight: 96,
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
    canJump: true,
  },
  orc: {
    hp: 70,
    halfWidth: 34,
    height: 145,
    labelHeight: 168,
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
    hitHeight: 100,
    leapSpeed: 0,
    leapLift: 0,
    canJump: true,
  },
  ogre: {
    hp: 190,
    halfWidth: 62,
    height: 140,
    labelHeight: 164,
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
    hitHeight: 100,
    leapSpeed: 0,
    leapLift: 0,
    wave: { speed: 340, life: 0.85, damage: 14, height: 34, halfWidth: 22, blockCost: 15 },
    canJump: false,
  },
  warlord: {
    hp: 540,
    halfWidth: 72,
    height: 200,
    labelHeight: 236,
    speed: 58,
    damage: 30,
    score: 500,
    heavy: true,
    knockScale: 0.1,
    hurtTime: 0.4,
    poise: 220,
    staggerTime: 1.8,
    blockCost: 50,
    style: 'boss',
    attackRange: 195,
    windup: 0.85,
    active: 0.17,
    recover: 1.15,
    attackCooldown: 1.35,
    reach: 195,
    hitHeight: 130,
    leapSpeed: 0,
    leapLift: 0,
    wave: { speed: 370, life: 0.95, damage: 16, height: 38, halfWidth: 24, blockCost: 16 },
    boss: { chargeWindup: 0.8, chargeSpeed: 640, chargeTime: 1.2, chargeDamage: 34, chargeBlockCost: 60, summon: 2, roarWindup: 0.7, enrageAt: 0.5 },
    canJump: false,
  },
}

/** What each kind of enemy costs out of a round's budget. */
export const COST: Record<EnemyKind, number> = { goblin: 1, orc: 3, ogre: 8, warlord: 30 }

export const ROUNDS = {
  firstDelay: 1,
  /** Round one gets goblins only; tougher kinds appear from these rounds on. */
  orcFromRound: 2,
  ogreFromRound: 4,
  /** Every this many rounds the round is a boss fight. */
  bossEvery: 5,
  /** How long the "Round cleared" banner shows before the menu opens. */
  clearedTime: 1.7,
  /** The share of maximum health given back when a round is cleared. */
  healShare: 0.35,
  /** Spawns start this far outside the visible arena, beyond the enemy's own half width. */
  margin: 30,
} as const

export const SCORE = {
  /** A kill within this many seconds of the last one keeps the streak going. */
  streakTime: 3,
  /** Each kill in a streak adds this to the score multiplier, up to the maximum. */
  streakStep: 0.1,
  maxMultiplier: 2.5,
  clearBonus: 100,
  flawlessBase: 75,
  flawlessPerRound: 25,
} as const
