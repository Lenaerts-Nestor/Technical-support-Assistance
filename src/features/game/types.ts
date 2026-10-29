import type { ComboKind, EnemyKind } from './config'
import type { Mods, Picks, UpgradeId } from './upgrades'

export type Facing = 1 | -1

export type PlayerState = 'free' | 'attack' | 'block' | 'dash' | 'hurt' | 'dead'

export type Player = {
  x: number
  /** Height above the ground; 0 when standing. */
  y: number
  vx: number
  vy: number
  facing: Facing
  grounded: boolean
  hp: number
  maxHp: number
  maxStamina: number
  stamina: number
  /** Seconds until stamina starts coming back. */
  staminaDelay: number
  state: PlayerState
  stateTime: number
  /** Which combo is being swung. */
  attackKind: ComboKind
  /** The combo hit being swung, or the one that comes next while `comboWindow` runs. */
  attackIndex: number
  comboWindow: number
  /** Enemies the current swing has already struck. */
  struck: Set<number>
  dashCooldown: number
  invuln: number
  /** The shield cannot be raised again until this runs out. */
  blockCooldown: number
  /** The back is open (the shield not yet guarding) until this runs out, after turning round. */
  guardDelay: number
  /** Seconds left of the flash after a parry, and of the warning that stamina ran short. */
  parryFlash: number
  lowStamina: number
}

export type EnemyState = 'walk' | 'windup' | 'attack' | 'recover' | 'hurt' | 'stagger' | 'dying'

export type Enemy = {
  id: number
  kind: EnemyKind
  x: number
  y: number
  vx: number
  vy: number
  facing: Facing
  hp: number
  maxHp: number
  state: EnemyState
  stateTime: number
  cooldown: number
  /** An attack hurts the player once. */
  struckPlayer: boolean
  /** Poise damage taken so far; it staggers the enemy once it reaches the kind's poise. */
  poiseHit: number
  poiseTimer: number
  /** Seconds left of the white hit flash. */
  flash: number
  /** Multiplies the damage of everything it does; grows with the round. */
  power: number
}

/** A wave of rock racing along the ground. */
export type Shockwave = {
  x: number
  vx: number
  life: number
  maxLife: number
  damage: number
  height: number
  halfWidth: number
  blockCost: number
  struck: boolean
}

export type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  color: string
}

/** `fight`: the round is on. `cleared`: it is won and the banner shows. `break`: the menu between rounds. */
export type Stage = 'fight' | 'cleared' | 'break'

/** What the break between rounds reports about the round just won. */
export type RoundSummary = {
  round: number
  kills: number
  parries: number
  clearBonus: number
  flawlessBonus: number
  healed: number
}

export type World = {
  /** Game time: stands still during hit-stop. */
  time: number
  player: Player
  enemies: Enemy[]
  waves: Shockwave[]
  particles: Particle[]
  nextId: number
  spawnTimer: number
  round: number
  stage: Stage
  stageTime: number
  /** What is left to spend on enemies this round, and what the round started with. */
  budget: number
  roundBudget: number
  roundKills: number
  roundParries: number
  /** Whether the player has been hurt this round (a round without it is flawless). */
  hurtThisRound: boolean
  /** Kills in a row, and the seconds left to land the next one before it ends. */
  streak: number
  streakTimer: number
  kills: number
  parries: number
  score: number
  upgrades: Picks
  mods: Mods
  /** The upgrades on offer in the current break, and the one taken. */
  offer: UpgradeId[]
  picked: UpgradeId | null
  summary: RoundSummary | null
  revivesUsed: number
  /** Seconds of hit-stop left; the world holds still while it runs. */
  freeze: number
  /** Screen shake strength, decaying. */
  shake: number
  /** Seconds each button press is still waiting to be used. */
  buffer: { jump: number; dash: number; light: number; heavy: number }
  over: boolean
}

/** What the player asked for during one step. Presses are `true` for a single step only. */
export type FrameInput = {
  move: -1 | 0 | 1
  jumpHeld: boolean
  jumpPressed: boolean
  dashPressed: boolean
  lightPressed: boolean
  heavyPressed: boolean
  blockHeld: boolean
}

export const NO_INPUT: FrameInput = {
  move: 0,
  jumpHeld: false,
  jumpPressed: false,
  dashPressed: false,
  lightPressed: false,
  heavyPressed: false,
  blockHeld: false,
}
