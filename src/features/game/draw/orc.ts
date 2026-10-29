import { ARENA, ART_SCALE, ENEMIES } from '../config'
import type { Enemy } from '../types'
import { ORC } from '../art/orc'
import { easeOutBack, smootherOf } from './anim'
import { enemyTint, recoilOf, tremble } from './enemyFx'
import { clamp, drawPart, easeOut } from './rigDraw'

type OrcPose = {
  dx: number
  dy: number
  lean: number
  scaleY: number
  front: number
  back: number
  liftFront: number
  liftBack: number
  /** The axe arm. */
  arm: number
  backArm: number
  head: number
  pauldron: number
  fall: number
}

function targetPose(e: Enemy, time: number): OrcPose {
  const stats = ENEMIES.orc
  const pose: OrcPose = { dx: 0, dy: 0, lean: 0.08, scaleY: 1, front: 0, back: 0, liftFront: 0, liftBack: 0, arm: -0.15, backArm: 0, head: 0, pauldron: 0, fall: 0 }
  const breath = Math.sin(time * 2.6 + e.id)
  switch (e.state) {
    case 'walk': {
      const stride = e.x * 0.065 * e.facing
      pose.front = Math.sin(stride) * 0.5
      pose.back = -pose.front
      pose.liftFront = 5 * Math.max(0, -Math.cos(stride))
      pose.liftBack = 5 * Math.max(0, Math.cos(stride))
      pose.dy = -Math.abs(Math.cos(stride)) * 3 + breath * 0.8
      pose.arm = -0.2 + Math.sin(stride) * 0.1
      pose.backArm = -Math.sin(stride) * 0.25
      pose.head = Math.sin(stride * 2) * 0.04
      pose.lean = 0.08 + Math.sin(stride * 2) * 0.02
      break
    }
    case 'windup': {
      // The cleaver goes up and back over the shoulder while the body leans away and rises.
      const k = easeOut(clamp(e.stateTime / stats.windup, 0, 1))
      pose.lean = 0.08 - 0.3 * k
      pose.arm = -0.2 - 1.5 * k
      pose.back = -0.2 * k
      pose.front = 0.2 * k
      pose.head = -0.12 * k
      pose.dy = -3 * k
      pose.scaleY = 1 + 0.03 * k
      pose.dx = tremble(e, stats.windup, 1.6)
      break
    }
    case 'attack': {
      // Brought down hard, a little past where it needs to end, then it settles.
      const k = clamp(e.stateTime / stats.active, 0, 1)
      pose.lean = lerp(-0.22, 0.4, easeOutBack(k, 1.2))
      pose.arm = lerp(-1.7, 1.5, easeOutBack(k, 1.5))
      pose.front = -0.45 * k
      pose.back = 0.3 * k
      pose.head = 0.1 * k
      pose.dy = 3 * k
      pose.scaleY = 0.97
      break
    }
    case 'recover': {
      const k = clamp(e.stateTime / stats.recover, 0, 1)
      pose.lean = 0.4 - 0.3 * k
      pose.arm = 1.5 - 1.6 * k
      pose.front = -0.3 * (1 - k)
      pose.back = 0.2 * (1 - k)
      pose.dy = 2 * (1 - k)
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
  if (e.state !== 'dying') {
    const recoil = recoilOf(e)
    pose.lean -= 0.18 * recoil
    pose.dx -= 5 * recoil
    pose.head -= 0.2 * recoil
    pose.scaleY *= 1 - 0.04 * recoil
  }
  return pose
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

export function drawOrc(ctx: CanvasRenderingContext2D, e: Enemy, time: number, dt: number) {
  const sm = smootherOf(e)
  const target = targetPose(e, time)
  const striking = e.state === 'attack' || e.state === 'windup'
  const pose: OrcPose = {
    ...target,
    dx: sm.ease('dx', target.dx, 30, dt),
    dy: sm.ease('dy', target.dy, 20, dt),
    lean: sm.ease('lean', target.lean, striking ? 26 : 12, dt),
    scaleY: sm.ease('sy', target.scaleY, 22, dt),
    front: sm.ease('front', target.front, 20, dt),
    back: sm.ease('back', target.back, 20, dt),
    liftFront: sm.ease('lf', target.liftFront, 24, dt),
    liftBack: sm.ease('lb', target.liftBack, 24, dt),
    arm: sm.ease('arm', target.arm, striking ? 34 : 14, dt),
    backArm: sm.ease('backArm', target.backArm, 14, dt),
    head: sm.ease('head', target.head, 16, dt),
    pauldron: sm.spring('pauldron', target.lean * 0.5, dt, 4.5, 0.28),
  }
  const facing = sm.ease('facing', e.facing, 20, dt)
  const tint = enemyTint(e, ENEMIES.orc.windup)

  ctx.save()
  ctx.translate(e.x, ARENA.groundY - e.y)
  ctx.scale(ART_SCALE * facing, ART_SCALE)
  if (e.state === 'dying') ctx.globalAlpha = 1 - clamp((e.stateTime - 0.4) / 0.3, 0, 1)
  ctx.rotate(pose.fall)
  ctx.translate(pose.dx, pose.dy)
  ctx.scale(1, pose.scaleY)

  const inBody = (draw: () => void) => {
    ctx.save()
    ctx.translate(0, -90)
    ctx.rotate(pose.lean)
    ctx.translate(0, 90)
    draw()
    ctx.restore()
  }
  drawPart(ctx, ORC.backLeg, { rot: pose.back, dy: -pose.liftBack }, tint)
  drawPart(ctx, ORC.frontLeg, { rot: pose.front, dy: -pose.liftFront }, tint)
  inBody(() => {
    drawPart(ctx, ORC.backArm, { rot: pose.backArm }, tint)
    drawPart(ctx, ORC.body, {}, tint)
    drawPart(ctx, ORC.pauldron, { rot: pose.pauldron }, tint)
    drawPart(ctx, ORC.head, { rot: pose.head }, tint)
    drawPart(ctx, ORC.frontArm, { rot: pose.arm }, tint)
  })
  ctx.restore()
}
