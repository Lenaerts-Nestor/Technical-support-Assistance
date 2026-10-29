import { ARENA } from './config'
import { InputState } from './input'
import { nextRound, pickUpgrade } from './rounds'
import { createWorld, stepWorld } from './sim'
import { DEFAULT_LOOK } from './appearance'
import type { Appearance } from './appearance'
import type { UpgradeId } from './upgrades'
import { DEFAULT_LOADOUT } from './weapons'
import type { WeaponId } from './weapons'
import { renderWorld } from './draw/renderWorld'
import type { World } from './types'

/** The longest slice of real time one frame may advance, so a stalled tab does not teleport the game. */
const MAX_FRAME = 0.05
/** The world is stepped in slices no longer than this, so fast moves cannot skip over a hit. */
const MAX_STEP = 1 / 100

/** Owns one game in progress: the world, the keys, and turning real time into steps. */
export class GameEngine {
  /** The two weapons carried; kept between runs so a retry starts as the last one did. */
  loadout: [WeaponId, WeaponId] = [DEFAULT_LOADOUT[0], DEFAULT_LOADOUT[1]]
  /** How the hero looks; kept between runs too. */
  look: Appearance = { ...DEFAULT_LOOK }
  world: World = createWorld(this.loadout, this.look)
  private lastDraw = 0
  readonly input = new InputState()

  /** Start over with a fresh world. */
  reset() {
    this.world = createWorld(this.loadout, this.look)
    this.input.clear()
  }

  /**
   * Put `weapon` in a slot. If the other slot holds it already the two trade places, so the
   * pair is always two different weapons.
   */
  setWeapon(slot: 0 | 1, weapon: WeaponId) {
    const other = slot === 0 ? 1 : 0
    const next: [WeaponId, WeaponId] = [this.loadout[0], this.loadout[1]]
    if (next[other] === weapon) next[other] = next[slot]
    next[slot] = weapon
    this.loadout = next
    // Mid-run (in a break) the carried weapons change at once.
    this.world.loadout = [next[0], next[1]]
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
    const rest = { ...first, jumpPressed: false, dashPressed: false, lightPressed: false, heavyPressed: false, swapPressed: false }
    for (let i = 0; i < steps; i++) stepWorld(this.world, i === 0 ? first : rest, dt / steps, Math.random)
  }

  /** Change how the hero looks, in the world already made too. */
  setLook(look: Appearance) {
    this.look = { ...look }
    this.world.look = { ...look }
  }

  /** `seconds` overrides the measured time since the last frame (a test stepping one frame at a time). */
  draw(ctx: CanvasRenderingContext2D, pixelWidth: number, seconds?: number) {
    const scale = pixelWidth / ARENA.width
    ctx.setTransform(scale, 0, 0, scale, 0, 0)
    // The animation blends over real time, however long a frame took (but not across a long pause).
    const now = performance.now()
    const dt = seconds ?? Math.min(0.05, Math.max(0, (now - this.lastDraw) / 1000))
    this.lastDraw = now
    renderWorld(ctx, this.world, dt)
  }
}
