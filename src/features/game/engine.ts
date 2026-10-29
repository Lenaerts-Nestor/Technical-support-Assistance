import { ARENA } from './config'
import { InputState } from './input'
import { createWorld, stepWorld } from './sim'
import { renderWorld } from './draw/renderWorld'
import type { World } from './types'

/** The longest slice of real time one frame may advance, so a stalled tab does not teleport the game. */
const MAX_FRAME = 0.05
/** The world is stepped in slices no longer than this, so fast moves cannot skip over a hit. */
const MAX_STEP = 1 / 100

/** Owns one game in progress: the world, the keys, and turning real time into steps. */
export class GameEngine {
  world: World = createWorld()
  readonly input = new InputState()

  /** Start over with a fresh world. */
  reset() {
    this.world = createWorld()
    this.input.clear()
  }

  advance(seconds: number) {
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
    renderWorld(ctx, this.world)
  }
}
