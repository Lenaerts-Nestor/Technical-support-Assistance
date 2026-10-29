import { ARENA, ART_SCALE, ENEMIES } from '../config'
import type { Enemy } from '../types'
import { ORC } from '../art/orc'
import { clamp, drawPart, easeOut } from './rigDraw'

type OrcPose = {
  dy: number
  lean: number
  front: number
  back: number
  /** The axe arm. */
  arm: number
  backArm: number
  head: number
  pauldron: number
  fall: number
}

function orcPose(e: Enemy): OrcPose {
  const stats = ENEMIES.orc
  const pose: OrcPose = { dy: 0, lean: 0.08, front: 0, back: 0, arm: -0.15, backArm: 0, head: 0, pauldron: 0, fall: 0 }
  switch (e.state) {
    case 'walk': {
      const stride = e.x * 0.065 * e.facing
      pose.front = Math.sin(stride) * 0.5
      pose.back = -pose.front
      pose.dy = -Math.abs(Math.cos(stride)) * 3
      pose.arm = -0.2 + Math.sin(stride) * 0.1
      pose.backArm = -Math.sin(stride) * 0.25
      pose.head = Math.sin(stride * 2) * 0.04
      pose.pauldron = Math.sin(stride) * 0.05
      break
    }
    case 'windup': {
      // The cleaver goes up and back over the shoulder while the body leans away.
      const k = easeOut(clamp(e.stateTime / stats.windup, 0, 1))
      pose.lean = 0.08 - 0.3 * k
      pose.arm = -0.2 - 1.5 * k
      pose.back = -0.2 * k
      pose.front = 0.2 * k
      pose.head = -0.12 * k
      pose.dy = 2 * k
      break
    }
    case 'attack': {
      const k = easeOut(clamp(e.stateTime / stats.active, 0, 1))
      pose.lean = -0.22 + 0.62 * k
      pose.arm = -1.7 + 3.2 * k
      pose.front = -0.45 * k
      pose.back = 0.3 * k
      pose.head = 0.1 * k
      break
    }
    case 'recover': {
      const k = clamp(e.stateTime / stats.recover, 0, 1)
      pose.lean = 0.4 - 0.3 * k
      pose.arm = 1.5 - 1.6 * k
      pose.front = -0.3 * (1 - k)
      pose.back = 0.2 * (1 - k)
      break
    }
    case 'hurt':
    case 'stagger':
      pose.lean = -0.35
      pose.arm = -0.3 + Math.sin(e.stateTime * 18) * 0.12
      pose.backArm = 0.5
      pose.head = -0.3
      pose.front = -0.2
      pose.back = 0.15
      pose.dy = 4
      break
    case 'dying':
      pose.fall = -1.45 * easeOut(clamp(e.stateTime / 0.4, 0, 1))
      pose.arm = 0.5
      break
  }
  return pose
}

export function drawOrc(ctx: CanvasRenderingContext2D, e: Enemy) {
  const pose = orcPose(e)
  const flash = e.flash > 0
  ctx.save()
  ctx.translate(e.x, ARENA.groundY - e.y)
  ctx.scale(ART_SCALE * e.facing, ART_SCALE)
  if (e.state === 'dying') ctx.globalAlpha = 1 - clamp((e.stateTime - 0.4) / 0.3, 0, 1)
  ctx.rotate(pose.fall)
  ctx.translate(0, pose.dy)

  const inBody = (draw: () => void) => {
    ctx.save()
    ctx.translate(0, -90)
    ctx.rotate(pose.lean)
    ctx.translate(0, 90)
    draw()
    ctx.restore()
  }
  drawPart(ctx, ORC.backLeg, { rot: pose.back }, flash)
  drawPart(ctx, ORC.frontLeg, { rot: pose.front }, flash)
  inBody(() => {
    drawPart(ctx, ORC.backArm, { rot: pose.backArm }, flash)
    drawPart(ctx, ORC.body, {}, flash)
    drawPart(ctx, ORC.pauldron, { rot: pose.pauldron }, flash)
    drawPart(ctx, ORC.head, { rot: pose.head }, flash)
    drawPart(ctx, ORC.frontArm, { rot: pose.arm }, flash)
  })
  ctx.restore()
}
