import { CLIMB_HERO } from './climb'
import { ARENA } from './config'
import { InputState } from './input'
import { DEFAULT_HERO } from './heroes'
import type { HeroId } from './heroes'
import { nextRound, pickUpgrade } from './rounds'
import { createWorld, stepWorld } from './sim'
import type { UpgradeId } from './upgrades'
import { renderWorld } from './draw/renderWorld'
import type { GameMode, World } from './types'

/** The longest slice of real time one frame may advance, so a stalled tab does not teleport the game. */
const MAX_FRAME = 0.05
/** The world is stepped in slices no longer than this, so fast moves cannot skip over a hit. */
const MAX_STEP = 1 / 100

/** Owns one game in progress: the world, the keys, and turning real time into steps. */
export class GameEngine {
  /** The hero played; kept between runs so a retry starts as the last one did. */
  hero: HeroId
  readonly mode: GameMode
  world: World
  readonly input = new InputState()

  constructor(mode: GameMode = 'survival') {
    this.mode = mode
    this.hero = mode === 'climb' ? CLIMB_HERO : DEFAULT_HERO
    this.world = createWorld(this.hero, mode)
  }

  /** Choose who to play. Takes effect with the next run. */
  setHero(hero: HeroId) {
    // Jump Hunter is always the Huntress.
    if (this.mode === 'climb') return
    this.hero = hero
  }

  /** Start over with a fresh world. */
  reset() {
    this.world = createWorld(this.hero, this.mode)
    this.input.clear()
  }

  /** Take one of the upgrades on offer during the break between rounds. */
  pickUpgrade(id: UpgradeId) {
    return pickUpgrade(this.world, id)
  }

  /** Leave the break and start the next round. */
  nextRound() {
    this.input.clear()
    return nextRound(this.world)
  }

  advance(seconds: number) {
    if (this.world.stage === 'break') return
    const dt = Math.min(seconds, MAX_FRAME)
    const steps = Math.max(1, Math.ceil(dt / MAX_STEP))
    // Button presses belong to the first slice only; held keys apply to all of them.
    const first = this.input.frame()
    const rest = { ...first, jumpPressed: false, dashPressed: false, lightPressed: false, heavyPressed: false }
    for (let i = 0; i < steps; i++) stepWorld(this.world, i === 0 ? first : rest, dt / steps, Math.random)
  }

  draw(ctx: CanvasRenderingContext2D, pixelWidth: number) {
    const scale = pixelWidth / ARENA.width
    ctx.setTransform(scale, 0, 0, scale, 0, 0)
    ctx.imageSmoothingEnabled = false
    renderWorld(ctx, this.world)
  }
}
