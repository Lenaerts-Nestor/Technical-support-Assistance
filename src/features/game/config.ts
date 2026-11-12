/**
 * Every number that shapes how the game feels, in one place so balancing is a matter of
 * editing this file. Distances are in arena pixels (the arena is `ARENA.width` wide no matter
 * how large the canvas is drawn), times in seconds, speeds in pixels per second.
 */

/**
 * The view is `width` by `height`. The arena is as wide as the view, so enemies still walk in
 * from its sides; it is taller than the view, and the camera rises with the hero (by up to
 * `CAMERA.maxRise`) when they climb the ledges. `groundY` is where the ground is drawn when
 * the camera is all the way down.
 */
export const ARENA = { width: 1280, height: 640, groundY: 540 } as const

export const CAMERA = {
  maxRise: 200,
  /** The camera keeps the hero about this far above the bottom of its rise. */
  lead: 170,
  /** How quickly it catches up, per second. */
  follow: 5,
} as const

/** The height of each tier of ledges above the one below it, and how many there are. */
export const TIER = { step: 160, count: 3 } as const

/** Numbers every hero shares. What differs (health, speed, size, moves) is in `heroes.ts`. */
export const PLAYER = {
  maxHp: 100,
  groundAccel: 3200,
  airAccel: 2200,
  jumpSpeed: 920,
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

/** The downward dive some heroes have in the air: after one it has to recharge, so it cannot be chained. */
export const DIVE = {
  cooldown: 1.6,
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
  /** The blow is dangerous between these two moments, and the strike frames of the animation play then. */
  hitStart: number
  hitEnd: number
  /** From here on the next hit of the combo (or a dash or jump) may interrupt the recovery. */
  cancelAt: number
  damage: number
  /** How much this hit chips away at an enemy's poise (see `EnemyStats.poise`). */
  poise: number
  stamina: number
  /** How far the blow reaches in front of the hero's middle... */
  reach: number
  /** ...behind it (a tail swipe, or a burst all round), above the head and below the feet. A little by default. */
  back?: number
  rise?: number
  below?: number
  knockback: number
  /** Forward speed given at `hitStart`. */
  lunge: number
  hitStop: number
  shake: number
  /** Which of the hero's moves (`SpriteInfo.moves`) plays. The wind-up frames run until `hitStart`, the strike frames until `hitEnd`. */
  move: string
  /** An upward leap given at `hitStart`. */
  hop?: number
  /** A dive: this downward speed at `hitStart`, and the attack ends on landing. */
  plunge?: number
  /** Bounces the hero up this fast off whatever the blow lands on (a dive that hits something). */
  bounce?: number
  /** Cannot be hurt while the blow is out (a rush). */
  rush?: boolean
  /** Sends a wave of rock along the ground at `hitStart`. */
  wave?: { speed: number; life: number; damage: number; height: number; halfWidth: number; poise: number; knockback: number }
}

/**
 * `light` and `heavy` are the two attack buttons. The others are the single blows some heroes
 * have instead of their light chain: in the air (rising, diving, or straight ahead) and out of a dash.
 */
export type ComboKind = 'light' | 'heavy' | 'airUp' | 'airDown' | 'airForward' | 'dashAttack'

/** After a combo hit the next press continues the chain for this long; after that it starts over. */
export const COMBO_WINDOW = 0.32

/** An enemy that is staggered or recovering from its own attack takes this much more damage. */
export const VULNERABLE_BONUS = 1.3

/** Poise damage wears off if an enemy is left alone this long. */
export const POISE_RESET = 2

/**
 * The enemies. Imps leap, demons cut, lancers run you through from afar, archers keep their
 * distance and shoot, brutes slam the ground, and the warlord is the boss of every fifth round.
 */
export type EnemyKind = 'imp' | 'demon' | 'lancer' | 'archer' | 'brute' | 'warlord'

/** A wave of rock a slam sends along the ground; jump or dash it. */
export type WaveStats = { speed: number; life: number; damage: number; height: number; halfWidth: number; blockCost: number }

/** What the boss can do besides the slam: a charge across the arena, and a roar that calls imps. */
export type BossStats = {
  chargeWindup: number
  chargeSpeed: number
  /** The longest a charge lasts if it meets no wall. */
  chargeTime: number
  chargeDamage: number
  chargeBlockCost: number
  /** How many imps a roar calls in. */
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
  /**
   * The way it attacks: a leap at the player, a sideways chop, an overhead slam, a long run with
   * the spear levelled, an arrow, or the boss's moves.
   */
  style: 'leap' | 'swing' | 'slam' | 'lance' | 'shoot' | 'boss'
  /** It starts an attack once the player is this close (and on its level). */
  attackRange: number
  windup: number
  /** How long the strike stays dangerous (chop and slam), or how long a lance run lasts. */
  active: number
  recover: number
  attackCooldown: number
  /** Forward reach and height of a chop or slam, from the enemy's middle. */
  reach: number
  hitHeight: number
  leapSpeed: number
  leapLift: number
  /** Whether it climbs the ledges to get at the player (and drops off them). */
  canJump: boolean
  /** An archer backs away from a player closer than this. */
  keepAway?: number
  /** The speed of a lance run, or of an arrow. */
  dashSpeed?: number
  wave?: WaveStats
  boss?: BossStats
}

const base = {
  heavy: false,
  knockScale: 1,
  hurtTime: 0.28,
  poise: 0,
  staggerTime: 0.3,
  active: 0,
  reach: 0,
  hitHeight: 0,
  leapSpeed: 0,
  leapLift: 0,
  canJump: true,
} as const

export const ENEMIES: Record<EnemyKind, EnemyStats> = {
  imp: {
    ...base,
    hp: 30,
    halfWidth: 18,
    height: 58,
    labelHeight: 72,
    speed: 175,
    damage: 7,
    score: 10,
    blockCost: 8,
    style: 'leap',
    attackRange: 160,
    windup: 0.42,
    recover: 0.45,
    attackCooldown: 0.9,
    leapSpeed: 380,
    leapLift: 460,
  },
  demon: {
    ...base,
    hp: 90,
    halfWidth: 26,
    height: 88,
    labelHeight: 104,
    speed: 105,
    damage: 15,
    score: 25,
    knockScale: 0.6,
    hurtTime: 0.35,
    poise: 30,
    staggerTime: 0.95,
    blockCost: 18,
    style: 'swing',
    attackRange: 104,
    windup: 0.55,
    active: 0.14,
    recover: 0.6,
    attackCooldown: 1,
    reach: 112,
    hitHeight: 80,
  },
  lancer: {
    ...base,
    hp: 75,
    halfWidth: 22,
    height: 88,
    labelHeight: 100,
    speed: 125,
    damage: 18,
    score: 30,
    knockScale: 0.7,
    poise: 22,
    staggerTime: 0.9,
    blockCost: 22,
    style: 'lance',
    // It sets its spear from well back, then runs the whole way.
    attackRange: 360,
    windup: 0.7,
    active: 0.5,
    recover: 0.75,
    attackCooldown: 1.6,
    reach: 40,
    hitHeight: 70,
    dashSpeed: 760,
  },
  archer: {
    ...base,
    hp: 55,
    halfWidth: 20,
    height: 84,
    labelHeight: 98,
    speed: 95,
    damage: 11,
    score: 25,
    knockScale: 0.9,
    hurtTime: 0.3,
    poise: 12,
    staggerTime: 0.8,
    blockCost: 12,
    style: 'shoot',
    attackRange: 620,
    windup: 0.8,
    active: 0.12,
    recover: 0.5,
    attackCooldown: 1.7,
    keepAway: 230,
    dashSpeed: 640,
  },
  brute: {
    ...base,
    hp: 230,
    halfWidth: 46,
    height: 100,
    labelHeight: 118,
    speed: 52,
    damage: 28,
    score: 60,
    heavy: true,
    knockScale: 0.25,
    hurtTime: 0.4,
    poise: 85,
    staggerTime: 1.4,
    blockCost: 42,
    style: 'slam',
    attackRange: 150,
    windup: 0.95,
    active: 0.16,
    recover: 1.1,
    attackCooldown: 1.5,
    reach: 145,
    hitHeight: 90,
    wave: { speed: 360, life: 1, damage: 14, height: 34, halfWidth: 22, blockCost: 15 },
    canJump: false,
  },
  warlord: {
    ...base,
    hp: 700,
    halfWidth: 54,
    height: 130,
    labelHeight: 156,
    speed: 62,
    damage: 30,
    score: 500,
    heavy: true,
    knockScale: 0.1,
    hurtTime: 0.4,
    poise: 240,
    staggerTime: 1.8,
    blockCost: 50,
    style: 'boss',
    attackRange: 175,
    windup: 0.85,
    active: 0.17,
    recover: 1.1,
    attackCooldown: 1.3,
    reach: 175,
    hitHeight: 120,
    wave: { speed: 400, life: 1.2, damage: 16, height: 38, halfWidth: 24, blockCost: 16 },
    boss: { chargeWindup: 0.8, chargeSpeed: 680, chargeTime: 1.5, chargeDamage: 34, chargeBlockCost: 60, summon: 2, roarWindup: 0.7, enrageAt: 0.5 },
    canJump: false,
  },
}

/** What each kind of enemy costs out of a round's budget. */
export const COST: Record<EnemyKind, number> = { imp: 1, demon: 2, lancer: 2, archer: 2, brute: 5, warlord: 20 }

/** Elites (from `ROUNDS.eliteFromRound`) are wreathed in shadow: tougher, quicker and worth more. */
export const ELITE = { hp: 1.7, power: 1.25, speed: 1.15, score: 2, poise: 1.5 } as const

export const ROUNDS = {
  firstDelay: 1,
  /** The rounds each kind first turns up in. Imps and demons are there from the start. */
  unlock: { imp: 1, demon: 1, lancer: 2, archer: 3, brute: 4, warlord: 5 } as Record<EnemyKind, number>,
  eliteFromRound: 6,
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
