import { ARENA, ART_SCALE, ENEMIES } from '../config'
import type { Enemy } from '../types'
import { OGRE } from '../art/ogre'
import { WARLORD } from '../art/warlord'
import { isEnraged, windupTime } from '../sim'
import { easeOutBack, smootherOf } from './anim'
import { enemyTint, recoilOf, tremble } from './enemyFx'
import { clamp, drawPart, easeOut } from './rigDraw'

/** The Warlord is the ogre drawn bigger. */
const WARLORD_SCALE = 1.2

type OgrePose = {
  dx: number
  dy: number
  lean: number
  scaleX: number
  scaleY: number
  front: number
  back: number
  liftFront: number
  liftBack: number
  /** The club arm. */
  arm: number
  backArm: number
  head: number
  fall: number
}

function targetPose(e: Enemy, time: number): OgrePose {
  const stats = ENEMIES[e.kind]
  const boss = e.kind === 'warlord'
  const windup = windupTime(e)
  const pose: OgrePose = { dx: 0, dy: 0, lean: 0.06, scaleX: 1, scaleY: 1, front: 0, back: 0, liftFront: 0, liftBack: 0, arm: 0, backArm: 0, head: 0, fall: 0 }
  const breath = Math.sin(time * 2 + e.id)
  switch (e.state) {
    case 'walk': {
      const stride = e.x * 0.04 * e.facing
      pose.front = Math.sin(stride) * 0.3
      pose.back = -pose.front
      pose.liftFront = 5 * Math.max(0, -Math.cos(stride))
      pose.liftBack = 5 * Math.max(0, Math.cos(stride))
      pose.dy = -Math.abs(Math.cos(stride)) * 4 + breath
      pose.arm = Math.sin(stride) * 0.06
      pose.backArm = -Math.sin(stride) * 0.12
      pose.head = Math.sin(stride * 2) * 0.03
      // The big body heaves with each step.
      pose.scaleY = 1 + Math.cos(stride * 2) * 0.012
      break
    }
    case 'windup': {
      const k = easeOut(clamp(e.stateTime / windup, 0, 1))
      pose.dx = tremble(e, windup, boss ? 2.2 : 1.8)
      if (boss && e.move === 'charge') {
        // Down on the haunches, club trailing, head lowered: about to bolt.
        pose.lean = 0.06 + 0.5 * k
        pose.scaleY = 1 - 0.1 * k
        pose.scaleX = 1 + 0.05 * k
        pose.arm = 0.6 * k
        pose.backArm = 0.3 * k
        pose.head = 0.2 * k
        pose.front = 0.3 * k
        pose.back = -0.3 * k
      } else if (boss && e.move === 'roar') {
        // Chest out, head thrown back, both arms high.
        pose.lean = 0.06 - 0.28 * k
        pose.arm = -1.6 * k
        pose.backArm = -1.4 * k
        pose.head = -0.55 * k
        pose.scaleY = 1 + 0.05 * k
        pose.dy = -8 * k
      } else {
        // The whole body rears back and the club goes up over the head.
        pose.lean = 0.06 - 0.26 * k
        pose.arm = -1.15 * k
        pose.backArm = -0.5 * k
        pose.dy = -6 * k
        pose.head = -0.15 * k
        pose.front = 0.15 * k
        pose.scaleY = 1 + 0.025 * k
      }
      break
    }
    case 'attack': {
      if (boss && e.move === 'charge') {
        // Running flat out: legs pumping, body thrown forward.
        const stride = e.stateTime * 16
        pose.lean = 0.55
        pose.front = Math.sin(stride) * 0.75
        pose.back = -pose.front
        pose.liftFront = 8 * Math.max(0, -Math.cos(stride))
        pose.liftBack = 8 * Math.max(0, Math.cos(stride))
        pose.arm = 0.7
        pose.backArm = -0.4
        pose.head = 0.25
        pose.dy = -Math.abs(Math.cos(stride)) * 5
        pose.scaleX = 1.05
        pose.scaleY = 0.96
      } else if (boss && e.move === 'roar') {
        pose.lean = -0.3
        pose.arm = -1.6
        pose.backArm = -1.4
        pose.head = -0.6
        pose.dy = -8
        pose.scaleY = 1.06
      } else {
        // Brought down hard and a little past, so the club bites into the ground.
        const k = clamp(e.stateTime / stats.active, 0, 1)
        pose.lean = lerp(-0.2, 0.5, easeOutBack(k, 1.1))
        pose.arm = lerp(-1.15, 1.15, easeOutBack(k, 1.4))
        pose.backArm = lerp(-0.5, 0.4, k)
        pose.dy = lerp(-6, 6, k)
        pose.head = 0.12 * k
        pose.front = lerp(0.15, -0.2, k)
        pose.scaleY = 0.96
        pose.scaleX = 1.03
      }
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
      pose.head = 0.1 * (1 - k)
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
  if (e.state !== 'dying') {
    const recoil = recoilOf(e)
    pose.lean -= 0.1 * recoil
    pose.dx -= 3 * recoil
    pose.head -= 0.12 * recoil
  }
  return pose
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

export function drawOgre(ctx: CanvasRenderingContext2D, e: Enemy, time: number, dt: number) {
  const boss = e.kind === 'warlord'
  const rig = boss ? WARLORD : OGRE
  const sm = smootherOf(e)
  const target = targetPose(e, time)
  const striking = e.state === 'attack' || e.state === 'windup'
  const pose: OgrePose = {
    ...target,
    dx: sm.ease('dx', target.dx, 30, dt),
    dy: sm.ease('dy', target.dy, 18, dt),
    lean: sm.ease('lean', target.lean, striking ? 22 : 10, dt),
    scaleX: sm.ease('sx', target.scaleX, 20, dt),
    scaleY: sm.ease('sy', target.scaleY, 20, dt),
    front: sm.ease('front', target.front, 16, dt),
    back: sm.ease('back', target.back, 16, dt),
    liftFront: sm.ease('lf', target.liftFront, 20, dt),
    liftBack: sm.ease('lb', target.liftBack, 20, dt),
    arm: sm.ease('arm', target.arm, striking ? 28 : 12, dt),
    backArm: sm.ease('backArm', target.backArm, 12, dt),
    head: sm.ease('head', target.head, 14, dt),
  }
  const facing = sm.ease('facing', e.facing, 16, dt)
  const tint = enemyTint(e, windupTime(e))
  // An enraged boss glows red all the time, and a fresh hit still flashes over it.
  const rage = boss && isEnraged(e) && !tint ? { color: '#ff3b2f', amount: 0.14 + 0.06 * Math.sin(time * 9) } : tint
  const size = ART_SCALE * (boss ? WARLORD_SCALE : 1)

  ctx.save()
  ctx.translate(e.x, ARENA.groundY - e.y)
  ctx.scale(size * facing, size)
  if (e.state === 'dying') ctx.globalAlpha = 1 - clamp((e.stateTime - 0.45) / 0.25, 0, 1)
  ctx.rotate(pose.fall)
  ctx.translate(pose.dx, pose.dy)
  ctx.scale(pose.scaleX, pose.scaleY)

  const inBody = (draw: () => void) => {
    ctx.save()
    ctx.translate(0, -125)
    ctx.rotate(pose.lean)
    ctx.translate(0, 125)
    draw()
    ctx.restore()
  }
  drawPart(ctx, rig.backLeg, { rot: pose.back, dy: -pose.liftBack }, rage)
  drawPart(ctx, rig.frontLeg, { rot: pose.front, dy: -pose.liftFront }, rage)
  inBody(() => {
    drawPart(ctx, rig.backArm, { rot: pose.backArm }, rage)
    drawPart(ctx, rig.body, {}, rage)
    drawPart(ctx, rig.head, { rot: pose.head }, rage)
    drawPart(ctx, rig.frontArm, { rot: pose.arm }, rage)
  })
  ctx.restore()
}
