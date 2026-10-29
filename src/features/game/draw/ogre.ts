import { ARENA, ART_SCALE, ENEMIES } from '../config'
import type { Enemy } from '../types'
import { OGRE } from '../art/ogre'
import { clamp, drawPart, easeOut } from './rigDraw'

type OgrePose = {
  dy: number
  lean: number
  front: number
  back: number
  /** The club arm. */
  arm: number
  backArm: number
  head: number
  fall: number
}

function ogrePose(e: Enemy): OgrePose {
  const stats = ENEMIES.ogre
  const pose: OgrePose = { dy: 0, lean: 0.06, front: 0, back: 0, arm: 0, backArm: 0, head: 0, fall: 0 }
  switch (e.state) {
    case 'walk': {
      const stride = e.x * 0.04 * e.facing
      pose.front = Math.sin(stride) * 0.3
      pose.back = -pose.front
      pose.dy = -Math.abs(Math.cos(stride)) * 4
      pose.arm = Math.sin(stride) * 0.06
      pose.backArm = -Math.sin(stride) * 0.12
      pose.head = Math.sin(stride * 2) * 0.03
      break
    }
    case 'windup': {
      // The whole body rears back and the club goes up over the head.
      const k = easeOut(clamp(e.stateTime / stats.windup, 0, 1))
      pose.lean = 0.06 - 0.26 * k
      pose.arm = -1.15 * k
      pose.backArm = -0.5 * k
      pose.dy = -6 * k
      pose.head = -0.15 * k
      pose.front = 0.15 * k
      break
    }
    case 'attack': {
      const k = easeOut(clamp(e.stateTime / stats.active, 0, 1))
      pose.lean = -0.2 + 0.7 * k
      pose.arm = -1.15 + 2.3 * k
      pose.backArm = -0.5 + 0.9 * k
      pose.dy = -6 + 12 * k
      pose.head = 0.12 * k
      pose.front = 0.15 - 0.35 * k
      break
    }
    case 'recover': {
      // The club is stuck in the ground; it takes a while to heave it out again.
      const k = clamp(e.stateTime / stats.recover, 0, 1)
      pose.lean = 0.5 - 0.42 * k
      pose.arm = 1.15 - 1.15 * k
      pose.backArm = 0.4 * (1 - k)
      pose.dy = 6 * (1 - k)
      pose.front = -0.2 * (1 - k)
      break
    }
    case 'hurt':
    case 'stagger':
      pose.lean = -0.22
      pose.arm = -0.35 + Math.sin(e.stateTime * 14) * 0.08
      pose.backArm = 0.4
      pose.head = -0.3
      pose.dy = 5
      pose.front = -0.12
      break
    case 'dying':
      pose.fall = -1.4 * easeOut(clamp(e.stateTime / 0.55, 0, 1))
      pose.arm = 0.6
      break
  }
  return pose
}

export function drawOgre(ctx: CanvasRenderingContext2D, e: Enemy) {
  const pose = ogrePose(e)
  const flash = e.flash > 0
  ctx.save()
  ctx.translate(e.x, ARENA.groundY - e.y)
  ctx.scale(ART_SCALE * e.facing, ART_SCALE)
  if (e.state === 'dying') ctx.globalAlpha = 1 - clamp((e.stateTime - 0.45) / 0.25, 0, 1)
  ctx.rotate(pose.fall)
  ctx.translate(0, pose.dy)

  const inBody = (draw: () => void) => {
    ctx.save()
    ctx.translate(0, -125)
    ctx.rotate(pose.lean)
    ctx.translate(0, 125)
    draw()
    ctx.restore()
  }
  drawPart(ctx, OGRE.backLeg, { rot: pose.back }, flash)
  drawPart(ctx, OGRE.frontLeg, { rot: pose.front }, flash)
  inBody(() => {
    drawPart(ctx, OGRE.backArm, { rot: pose.backArm }, flash)
    drawPart(ctx, OGRE.body, {}, flash)
    drawPart(ctx, OGRE.head, { rot: pose.head }, flash)
    drawPart(ctx, OGRE.frontArm, { rot: pose.arm }, flash)
  })
  ctx.restore()
}
