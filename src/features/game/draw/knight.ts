import { ARENA, ART_SCALE, DASH, LIGHT_COMBO, PLAYER } from '../config'
import type { World } from '../types'
import { KNIGHT, SWORD_PIVOT, SWORD_REST_ANGLE } from '../art/knight'
import { clamp, drawPart, easeInOut, easeOut, lerp } from './rigDraw'

type Slash = { from: number; to: number; alpha: number }

type KnightPose = {
  dx: number
  dy: number
  lean: number
  front: number
  back: number
  sword: number
  shield: number
  cape: number
  plume: number
  /** Whole-body rotation about the feet, for falling over. */
  fall: number
  slash: Slash | null
}

/** Work out how the knight is standing, from what the simulation says it is doing. */
function knightPose(w: World): KnightPose {
  const p = w.player
  const t = w.time
  const forward = (p.vx * p.facing) / PLAYER.speed
  const pose: KnightPose = { dx: 0, dy: 0, lean: 0, front: 0, back: 0, sword: 0, shield: 0, cape: 0, plume: 0, fall: 0, slash: null }

  const breath = Math.sin(t * 3)
  pose.plume = Math.sin(t * 5) * 0.06
  if (p.grounded && Math.abs(p.vx) > 25 && p.state !== 'attack') {
    const stride = p.x * 0.075 * p.facing
    pose.front = Math.sin(stride) * 0.7
    pose.back = -pose.front
    pose.dy = -Math.abs(Math.cos(stride)) * 3
    pose.lean = 0.08 * forward
    pose.cape = 0.25 * forward + Math.sin(t * 9) * 0.05
    pose.sword = Math.sin(stride * 2) * 0.05
    pose.plume = 0.2 * forward
  } else if (p.grounded) {
    pose.dy = breath * 1.2
    pose.front = 0.05
    pose.back = -0.08
    pose.sword = breath * 0.03
    pose.cape = 0.04 + breath * 0.02
  }
  if (!p.grounded) {
    pose.front = -0.55
    pose.back = 0.4
    pose.cape = p.vy > 0 ? 0.1 : -0.3
    pose.lean = 0.05
    pose.plume = p.vy > 0 ? 0.25 : -0.3
  }

  switch (p.state) {
    case 'dash':
      pose.lean = 0.4
      pose.front = -0.95
      pose.back = 0.85
      pose.cape = 0.55 + Math.sin(t * 40) * 0.08
      pose.sword = -0.1
      pose.plume = 0.5
      pose.dy = 0
      break
    case 'attack': {
      const step = LIGHT_COMBO[p.attackIndex]
      const u = p.stateTime
      let angle: number
      if (u < step.hitStart) angle = lerp(0, step.swing.from, easeOut(u / step.hitStart))
      else if (u <= step.hitEnd) angle = lerp(step.swing.from, step.swing.to, easeInOut((u - step.hitStart) / (step.hitEnd - step.hitStart)))
      else angle = lerp(step.swing.to, 0, easeInOut(clamp((u - step.hitEnd) / (step.duration - step.hitEnd), 0, 1)))
      pose.sword = angle
      pose.front = -0.4
      pose.back = 0.35
      pose.shield = -0.12
      const strike = clamp((u - step.hitStart) / (step.hitEnd - step.hitStart), 0, 1)
      pose.lean = 0.05 + 0.22 * strike * (1 - clamp((u - step.hitEnd) / 0.2, 0, 1))
      pose.dx = 5 * strike
      pose.cape = 0.3 * strike
      pose.plume = 0.4 * strike
      const fade = 1 - clamp((u - step.hitEnd) / 0.12, 0, 1)
      if (u >= step.hitStart - 0.01 && fade > 0) {
        const current = u <= step.hitEnd ? angle : step.swing.to
        pose.slash = { from: step.swing.from, to: current, alpha: fade }
      }
      break
    }
    case 'hurt':
      pose.lean = -0.35
      pose.sword = -0.7
      pose.cape = 0.4
      pose.plume = 0.4
      break
    case 'dead':
      pose.fall = -1.5 * easeOut(clamp(p.stateTime / 0.45, 0, 1))
      pose.dy = 4 * clamp(p.stateTime / 0.45, 0, 1)
      pose.sword = 0.6
      break
  }
  return pose
}

function drawFigure(ctx: CanvasRenderingContext2D, pose: KnightPose) {
  const inBody = (draw: () => void) => {
    ctx.save()
    ctx.translate(0, -70)
    ctx.rotate(pose.lean)
    ctx.translate(0, 70)
    draw()
    ctx.restore()
  }

  ctx.save()
  ctx.rotate(pose.fall)
  ctx.translate(pose.dx, pose.dy)
  inBody(() => drawPart(ctx, KNIGHT.cape, { rot: pose.cape }))
  drawPart(ctx, KNIGHT.backLeg, { rot: pose.back })
  drawPart(ctx, KNIGHT.frontLeg, { rot: pose.front })
  inBody(() => {
    drawPart(ctx, KNIGHT.body)
    drawPart(ctx, KNIGHT.plume, { rot: pose.plume })
    drawPart(ctx, KNIGHT.shield, { rot: pose.shield })
    if (pose.slash) drawSlash(ctx, pose.slash)
    drawPart(ctx, KNIGHT.swordArm, { rot: pose.sword })
  })
  ctx.restore()
}

/** The bright arc the blade leaves behind during a swing. */
function drawSlash(ctx: CanvasRenderingContext2D, slash: Slash) {
  const [px, py] = SWORD_PIVOT
  const a0 = SWORD_REST_ANGLE + slash.from
  const a1 = SWORD_REST_ANGLE + slash.to
  ctx.save()
  ctx.translate(px, py)
  ctx.lineCap = 'round'
  for (const [radius, width, alpha] of [
    [96, 26, 0.28],
    [104, 12, 0.7],
  ] as const) {
    ctx.globalAlpha = alpha * slash.alpha
    ctx.strokeStyle = '#fff4d6'
    ctx.lineWidth = width
    ctx.beginPath()
    ctx.arc(0, 0, radius, a0, a1, a1 < a0)
    ctx.stroke()
  }
  ctx.restore()
}

export function drawKnight(ctx: CanvasRenderingContext2D, w: World) {
  const p = w.player
  const pose = knightPose(w)
  const blink = p.invuln > 0 && p.state !== 'dash' && p.state !== 'dead' && Math.floor(w.time * 24) % 2 === 0

  ctx.save()
  ctx.translate(p.x, ARENA.groundY - p.y)
  ctx.scale(ART_SCALE * p.facing, ART_SCALE)
  if (p.state === 'dash') {
    // Fading copies trailing behind sell the speed of the dash.
    const reach = (DASH.speed * 0.045) / ART_SCALE
    for (let i = 3; i >= 1; i--) {
      ctx.save()
      ctx.globalAlpha = 0.16 * (4 - i)
      ctx.translate(-reach * i, 0)
      drawFigure(ctx, pose)
      ctx.restore()
    }
  }
  if (blink) ctx.globalAlpha = 0.45
  drawFigure(ctx, pose)
  ctx.restore()
}
