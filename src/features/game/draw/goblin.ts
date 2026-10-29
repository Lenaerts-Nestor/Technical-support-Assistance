import { ARENA, ART_SCALE, ENEMIES } from '../config'
import type { Enemy } from '../types'
import { GOBLIN } from '../art/goblin'
import { easeOutBack, smootherOf } from './anim'
import { enemyTint, recoilOf, tremble } from './enemyFx'
import { drawWarning } from './heavies'
import { clamp, drawPart, easeOut } from './rigDraw'

type GoblinPose = {
  dx: number
  dy: number
  lean: number
  /** Squash and stretch about the feet. */
  scaleX: number
  scaleY: number
  front: number
  back: number
  liftFront: number
  liftBack: number
  arm: number
  backArm: number
  ears: number
  head: number
  fall: number
}

function targetPose(e: Enemy, time: number): GoblinPose {
  const stats = ENEMIES.goblin
  const pose: GoblinPose = { dx: 0, dy: 0, lean: 0.12, scaleX: 1, scaleY: 1, front: 0, back: 0, liftFront: 0, liftBack: 0, arm: -0.1, backArm: 0, ears: 0, head: 0, fall: 0 }
  const breath = Math.sin(time * 5 + e.id)
  switch (e.state) {
    case 'walk': {
      const stride = e.x * 0.11 * e.facing
      pose.front = Math.sin(stride) * 0.85
      pose.back = -pose.front
      pose.liftFront = 6 * Math.max(0, -Math.cos(stride))
      pose.liftBack = 6 * Math.max(0, Math.cos(stride))
      pose.dy = -Math.abs(Math.cos(stride)) * 3
      pose.arm = -0.15 + Math.sin(stride) * 0.25
      pose.backArm = -Math.sin(stride) * 0.3
      pose.ears = Math.sin(stride * 2) * 0.14
      pose.lean = 0.2 + Math.sin(stride * 2) * 0.03
      pose.head = Math.sin(stride * 2 + 1) * 0.05
      break
    }
    case 'windup': {
      // Crouch and draw the dagger back: the tell that a leap is coming.
      const k = easeOut(clamp(e.stateTime / stats.windup, 0, 1))
      pose.scaleY = 1 - 0.15 * k
      pose.scaleX = 1 + 0.08 * k
      pose.lean = 0.12 - 0.45 * k
      pose.arm = -1.15 * k
      pose.front = 0.25 * k
      pose.back = -0.25 * k
      pose.ears = 0.2 * k
      pose.head = -0.15 * k
      pose.dx = tremble(e, stats.windup, 1.2)
      break
    }
    case 'attack': {
      // Launched: stretched long in the air, dagger thrust ahead.
      const k = clamp(e.stateTime / 0.18, 0, 1)
      pose.lean = 0.5
      pose.arm = lerpAngle(-1.0, 0.1, easeOutBack(k, 1.1))
      pose.front = -0.9
      pose.back = 0.7
      pose.ears = -0.45
      pose.head = 0.15
      pose.scaleY = 1.1
      pose.scaleX = 0.92
      break
    }
    case 'recover':
      pose.lean = 0.3
      pose.arm = 0.35
      pose.scaleY = 0.92
      pose.scaleX = 1.06
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
  if (e.state === 'walk' || e.state === 'recover') pose.dy += breath * 0.6
  // The shove of a fresh hit, whatever it was doing.
  if (e.state !== 'dying') {
    const recoil = recoilOf(e)
    pose.lean -= 0.3 * recoil
    pose.dx -= 7 * recoil
    pose.scaleY *= 1 - 0.07 * recoil
    pose.ears += 0.3 * recoil
  }
  return pose
}

const lerpAngle = (a: number, b: number, t: number) => a + (b - a) * t

export function drawGoblin(ctx: CanvasRenderingContext2D, e: Enemy, time: number, dt: number) {
  const sm = smootherOf(e)
  const target = targetPose(e, time)
  const fast = e.state === 'attack' || e.state === 'windup'
  const pose: GoblinPose = {
    ...target,
    dx: sm.ease('dx', target.dx, 30, dt),
    dy: sm.ease('dy', target.dy, 24, dt),
    lean: sm.ease('lean', target.lean, fast ? 30 : 14, dt),
    scaleX: sm.ease('sx', target.scaleX, 26, dt),
    scaleY: sm.ease('sy', target.scaleY, 26, dt),
    front: sm.ease('front', target.front, 24, dt),
    back: sm.ease('back', target.back, 24, dt),
    liftFront: sm.ease('lf', target.liftFront, 28, dt),
    liftBack: sm.ease('lb', target.liftBack, 28, dt),
    arm: sm.ease('arm', target.arm, fast ? 40 : 16, dt),
    backArm: sm.ease('backArm', target.backArm, 16, dt),
    head: sm.ease('head', target.head, 20, dt),
    ears: sm.spring('ears', target.ears, dt, 5, 0.3),
  }
  const facing = sm.ease('facing', e.facing, 24, dt)
  const tint = enemyTint(e, ENEMIES.goblin.windup)

  ctx.save()
  ctx.translate(e.x, ARENA.groundY - e.y)
  ctx.scale(ART_SCALE * facing, ART_SCALE)
  if (e.state === 'dying') ctx.globalAlpha = 1 - clamp((e.stateTime - 0.3) / 0.3, 0, 1)
  ctx.rotate(pose.fall)
  ctx.translate(pose.dx, pose.dy)
  ctx.scale(pose.scaleX, pose.scaleY)

  const inBody = (draw: () => void) => {
    ctx.save()
    ctx.translate(4, -40)
    ctx.rotate(pose.lean)
    ctx.translate(-4, 40)
    draw()
    ctx.restore()
  }
  drawPart(ctx, GOBLIN.backLeg, { rot: pose.back, dy: -pose.liftBack }, tint)
  drawPart(ctx, GOBLIN.frontLeg, { rot: pose.front, dy: -pose.liftFront }, tint)
  inBody(() => {
    drawPart(ctx, GOBLIN.body, {}, tint)
    drawPart(ctx, GOBLIN.backArm, { rot: pose.backArm }, tint)
    drawPart(ctx, GOBLIN.ears, { rot: pose.ears }, tint)
    drawPart(ctx, GOBLIN.head, { rot: pose.head }, tint)
    drawPart(ctx, GOBLIN.frontArm, { rot: pose.arm }, tint)
  })
  ctx.restore()

  if (e.state === 'windup') drawWarning(ctx, e, 18)
}
