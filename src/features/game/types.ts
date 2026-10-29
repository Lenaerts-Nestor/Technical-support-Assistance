import type { EnemyKind } from './config'

export type Facing = 1 | -1

export type PlayerState = 'free' | 'attack' | 'dash' | 'hurt' | 'dead'

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
  state: PlayerState
  stateTime: number
  /** The combo hit being swung, or the one that comes next while `comboWindow` runs. */
  attackIndex: number
  comboWindow: number
  /** Enemies the current swing has already struck. */
  struck: Set<number>
  dashCooldown: number
  invuln: number
}

export type EnemyState = 'walk' | 'windup' | 'leap' | 'recover' | 'hurt' | 'dying'

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
  /** A leap hurts the player once. */
  struckPlayer: boolean
  /** Seconds left of the white hit flash. */
  flash: number
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

export type World = {
  /** Game time: stands still during hit-stop. */
  time: number
  player: Player
  enemies: Enemy[]
  particles: Particle[]
  nextId: number
  spawnTimer: number
  kills: number
  score: number
  /** Seconds of hit-stop left; the world holds still while it runs. */
  freeze: number
  /** Screen shake strength, decaying. */
  shake: number
  /** Seconds each button press is still waiting to be used. */
  buffer: { jump: number; dash: number; light: number }
  over: boolean
}

/** What the player asked for during one step. Presses are `true` for a single step only. */
export type FrameInput = {
  move: -1 | 0 | 1
  jumpHeld: boolean
  jumpPressed: boolean
  dashPressed: boolean
  lightPressed: boolean
}

export const NO_INPUT: FrameInput = { move: 0, jumpHeld: false, jumpPressed: false, dashPressed: false, lightPressed: false }
