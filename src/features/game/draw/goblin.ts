import { ARENA, ART_SCALE, ENEMIES } from '../config'
import type { Enemy } from '../types'
import { GOBLIN } from '../art/goblin'
import { drawWarning } from './heavies'
import { clamp, drawPart, easeOut } from './rigDraw'

type GoblinPose = {
  dy: number
  lean: number
  /** Vertical squash about the feet, for crouching. */
  squash: number
  front: number
  back: number
  arm: number
  backArm: number
  ears: number
  head: number
  fall: number
}

function goblinPose(e: Enemy): GoblinPose {
  const stats = ENEMIES[e.kind]
  const pose: GoblinPose = { dy: 0, lean: 0.12, squash: 1, front: 0, back: 0, arm: -0.1, backArm: 0, ears: 0, head: 0, fall: 0 }
  switch (e.state) {
    case 'walk': {
      const stride = e.x * 0.11 * e.facing
      pose.front = Math.sin(stride) * 0.85
      pose.back = -pose.front
      pose.dy = -Math.abs(Math.cos(stride)) * 3
      pose.arm = -0.15 + Math.sin(stride) * 0.25
      pose.backArm = -Math.sin(stride) * 0.3
      pose.ears = Math.sin(stride * 2) * 0.14
      pose.lean = 0.2
      break
    }
    case 'windup': {
      // Crouch and draw the dagger back: the tell that a leap is coming.
      const k = easeOut(clamp(e.stateTime / stats.windup, 0, 1))
      pose.squash = 1 - 0.14 * k
      pose.lean = 0.12 - 0.45 * k
      pose.arm = -1.15 * k
      pose.front = 0.25 * k
      pose.back = -0.25 * k
      pose.ears = 0.2 * k
      pose.head = -0.15 * k
      break
    }
    case 'attack':
      pose.lean = 0.5
      pose.arm = 0.1
      pose.front = -0.9
      pose.back = 0.7
      pose.ears = -0.45
      pose.head = 0.15
      break
    case 'recover':
      pose.lean = 0.3
      pose.arm = 0.35
      pose.squash = 0.94
      pose.ears = -0.1
      break
    case 'hurt':
    case 'stagger':
      pose.lean = -0.5
      pose.arm = -0.7
      pose.backArm = 0.6
      pose.head = -0.3
      pose.ears = 0.35
      pose.front = -0.3
      pose.back = 0.3
      break
    case 'dying':
      pose.fall = -1.45 * easeOut(clamp(e.stateTime / 0.3, 0, 1))
      pose.arm = 0.4
      pose.ears = 0.4
      break
  }
  return pose
}

export function drawGoblin(ctx: CanvasRenderingContext2D, e: Enemy) {
  const pose = goblinPose(e)
  const flash = e.flash > 0
  ctx.save()
  ctx.translate(e.x, ARENA.groundY - e.y)
  ctx.scale(ART_SCALE * e.facing, ART_SCALE)
  if (e.state === 'dying') ctx.globalAlpha = 1 - clamp((e.stateTime - 0.3) / 0.3, 0, 1)
  ctx.rotate(pose.fall)
  ctx.translate(0, pose.dy)
  ctx.scale(1, pose.squash)

  const inBody = (draw: () => void) => {
    ctx.save()
    ctx.translate(4, -40)
    ctx.rotate(pose.lean)
    ctx.translate(-4, 40)
    draw()
    ctx.restore()
  }
  drawPart(ctx, GOBLIN.backLeg, { rot: pose.back }, flash)
  drawPart(ctx, GOBLIN.frontLeg, { rot: pose.front }, flash)
  inBody(() => {
    drawPart(ctx, GOBLIN.body, {}, flash)
    drawPart(ctx, GOBLIN.backArm, { rot: pose.backArm }, flash)
    drawPart(ctx, GOBLIN.ears, { rot: pose.ears }, flash)
    drawPart(ctx, GOBLIN.head, { rot: pose.head }, flash)
    drawPart(ctx, GOBLIN.frontArm, { rot: pose.arm }, flash)
  })
  ctx.restore()

  if (e.state === 'windup') drawWarning(ctx, e, 18)
}
