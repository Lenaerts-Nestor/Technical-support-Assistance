import { ARENA, ART_SCALE, DASH, PLAYER, SHIELD, SWAP } from '../config'
import type { World } from '../types'
import { KNIGHT, SWORD_PIVOT, SWORD_REST_ANGLE } from '../art/knight'
import { weaponOf } from '../sim'
import type { WeaponId } from '../weapons'
import { REST_ANGLE, SWING_RADIUS, drawWeapon } from './weaponDraw'
import { clamp, drawPart, easeInOut, easeOut, lerp } from './rigDraw'

type Slash = { from: number; to: number; alpha: number; heavy: boolean; radius: number }

type KnightPose = {
  dx: number
  dy: number
  lean: number
  front: number
  back: number
  /** Turn of the weapon arm from its resting direction. */
  sword: number
  shield: number
  /** How far the shield is pushed out in front of the body. */
  guard: number
  cape: number
  plume: number
  /** Whole-body rotation about the feet, for falling over. */
  fall: number
  /** How far round a spin has got, in radians; 0 when not spinning. */
  spin: number
  /** A bow string's pull, 0 to 1, and whether an arrow sits on it. */
  pull: number
  nocked: boolean
  slash: Slash | null
}

/** Work out how the knight is standing, from what the simulation says it is doing. */
function knightPose(w: World): KnightPose {
  const p = w.player
  const weapon = weaponOf(w)
  const rest = REST_ANGLE[weapon.id]
  const t = w.time
  const forward = (p.vx * p.facing) / PLAYER.speed
  const pose: KnightPose = { dx: 0, dy: 0, lean: 0, front: 0, back: 0, sword: rest, shield: 0, guard: 0, cape: 0, plume: 0, fall: 0, spin: 0, pull: 0, nocked: false, slash: null }

  const breath = Math.sin(t * 3)
  pose.plume = Math.sin(t * 5) * 0.06
  if (p.grounded && Math.abs(p.vx) > 25 && p.state !== 'attack') {
    const stride = p.x * 0.075 * p.facing
    pose.front = Math.sin(stride) * 0.7
    pose.back = -pose.front
    pose.dy = -Math.abs(Math.cos(stride)) * 3
    pose.lean = 0.08 * forward
    pose.cape = 0.25 * forward + Math.sin(t * 9) * 0.05
    pose.sword = rest + Math.sin(stride * 2) * 0.05
    pose.plume = 0.2 * forward
  } else if (p.grounded) {
    pose.dy = breath * 1.2
    pose.front = 0.05
    pose.back = -0.08
    pose.sword = rest + breath * 0.03
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
      pose.sword = rest - 0.1
      pose.plume = 0.5
      pose.dy = 0
      break
    case 'block': {
      // Shield up and out in front, blade held back and ready.
      const open = 1 - Math.min(1, p.guardDelay / SHIELD.turnDelay)
      pose.guard = 16 * open
      pose.shield = -0.06
      pose.sword = -0.95
      pose.front = -0.22 + (p.grounded && Math.abs(p.vx) > 15 ? Math.sin(p.x * 0.09 * p.facing) * 0.3 : 0)
      pose.back = 0.2
      pose.lean = -0.05
      pose.cape = 0.06
      break
    }
    case 'attack':
      attackPose(w, pose, weapon.id, rest)
      break
    case 'hurt':
      pose.lean = -0.35
      pose.sword = rest - 0.7
      pose.cape = 0.4
      pose.plume = 0.4
      break
    case 'dead':
      pose.fall = -1.5 * easeOut(clamp(p.stateTime / 0.45, 0, 1))
      pose.dy = 4 * clamp(p.stateTime / 0.45, 0, 1)
      pose.sword = 0.6
      break
  }

  // A weapon just taken up swings up into place.
  if (p.swapAnim < SWAP.time && p.state !== 'dead') {
    const k = easeOut(p.swapAnim / SWAP.time)
    pose.sword = lerp(1.7, pose.sword, k)
    if (weapon.id === 'bow') pose.nocked = false
  }
  return pose
}

function attackPose(w: World, pose: KnightPose, weapon: WeaponId, rest: number) {
  const p = w.player
  const step = weaponOf(w).combos[p.attackKind][p.attackIndex]
  const heavy = p.attackKind === 'heavy'
  const u = p.stateTime
  const strike = clamp((u - step.hitStart) / Math.max(0.001, step.hitEnd - step.hitStart), 0, 1)
  const windup = clamp(u / step.hitStart, 0, 1)

  if (weapon === 'bow') {
    // Aim along the arm; a drawn bow pulls back, then springs to rest after the shot.
    pose.sword = -0.02
    pose.front = -0.35
    pose.back = 0.3
    pose.shield = 0
    pose.lean = 0.02
    if (p.attackKind === 'close') {
      const kick = clamp((u - step.hitStart + 0.04) / 0.14, 0, 1) * (1 - clamp((u - step.hitEnd) / 0.14, 0, 1))
      pose.front = -1.5 * kick
      pose.back = 0.2
      pose.lean = -0.12 * kick
      pose.sword = -0.4
      pose.slash = null
      return
    }
    if (p.drawing || u < step.hitStart) {
      pose.pull = p.drawing ? clamp(p.drawTime / Math.max(0.01, step.charge?.max ?? 0.4), 0, 1) : windup
      pose.nocked = true
    } else {
      pose.pull = 0
      pose.sword = -0.02 - 0.12 * (1 - clamp((u - step.hitStart) / 0.12, 0, 1))
    }
    pose.dx = p.drawing ? -3 * pose.pull : 0
    pose.cape = 0.1 + 0.2 * pose.pull
    return
  }

  let angle: number
  if (u < step.hitStart) angle = lerp(rest, step.swing.from, easeOut(windup))
  else if (u <= step.hitEnd) angle = lerp(step.swing.from, step.swing.to, easeInOut(strike))
  else angle = lerp(step.swing.to, rest, easeInOut(clamp((u - step.hitEnd) / (step.duration - step.hitEnd), 0, 1)))
  pose.sword = angle
  pose.front = -0.4
  pose.back = 0.35
  pose.shield = -0.12
  pose.lean = 0.05 + 0.22 * strike * (1 - clamp((u - step.hitEnd) / 0.2, 0, 1))
  // A heavy swing coils back and down before it comes round.
  if (heavy) {
    pose.lean -= 0.22 * windup * (1 - strike)
    pose.dy += 4 * windup * (1 - strike)
  }
  pose.dx = 5 * strike
  pose.cape = 0.3 * strike
  pose.plume = 0.4 * strike
  const fade = 1 - clamp((u - step.hitEnd) / 0.14, 0, 1)

  if (step.motion === 'spin') {
    // Right round on the spot, the blade held out flat: the whole body turns.
    const turn = clamp((u - step.hitStart + 0.06) / (step.hitEnd - step.hitStart + 0.12), 0, 1)
    pose.spin = turn * Math.PI * 2
    pose.sword = -0.3
    pose.lean = 0.12
    pose.dx = 0
    pose.slash = u >= step.hitStart - 0.02 && fade > 0 ? { from: 0, to: pose.spin, alpha: fade, heavy: true, radius: -1 } : null
    return
  }
  if (step.motion === 'thrust') {
    const drive = easeOut(clamp((u - step.hitStart + 0.08) / 0.12, 0, 1)) * (1 - clamp((u - step.hitEnd) / 0.25, 0, 1))
    pose.sword = lerp(rest, -0.02, windup) + 0
    pose.lean = 0.1 + 0.3 * drive
    pose.dx = 16 * drive
    pose.front = -0.8 * drive - 0.2
    pose.back = 0.6 * drive
    pose.slash = null
    return
  }
  if (u >= step.hitStart - 0.01 && fade > 0) {
    const current = u <= step.hitEnd ? angle : step.swing.to
    pose.slash = { from: step.swing.from, to: current, alpha: fade, heavy, radius: SWING_RADIUS[weapon] }
  }
}

function drawFigure(ctx: CanvasRenderingContext2D, pose: KnightPose, weapon: WeaponId) {
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
  if (pose.spin > 0) {
    // Turning on the spot reads as the body narrowing and widening again.
    const squeeze = Math.cos(pose.spin)
    ctx.scale(Math.abs(squeeze) < 0.18 ? 0.18 * Math.sign(squeeze || 1) : squeeze, 1)
  }
  inBody(() => drawPart(ctx, KNIGHT.cape, { rot: pose.cape }))
  drawPart(ctx, KNIGHT.backLeg, { rot: pose.back })
  drawPart(ctx, KNIGHT.frontLeg, { rot: pose.front })
  inBody(() => {
    drawPart(ctx, KNIGHT.body)
    drawPart(ctx, KNIGHT.plume, { rot: pose.plume })
    if (weapon === 'swordShield') drawPart(ctx, KNIGHT.shield, { rot: pose.shield, dx: pose.guard, dy: -pose.guard * 0.25 })
    if (pose.slash) drawSlash(ctx, pose.slash)
    drawWeapon(ctx, weapon, pose.sword, pose.pull, pose.nocked)
  })
  ctx.restore()
}

/** The bright arc the blade leaves behind during a swing (or a ring right round the knight in a spin). */
function drawSlash(ctx: CanvasRenderingContext2D, slash: Slash) {
  ctx.save()
  ctx.lineCap = 'round'
  if (slash.radius < 0) {
    // The spin: a crescent that chases the blade round a circle the size of its reach.
    ctx.translate(14, -92)
    ctx.scale(1, 0.55)
    for (const [radius, width, alpha] of [
      [150, 30, 0.22],
      [158, 12, 0.7],
    ] as const) {
      ctx.globalAlpha = alpha * slash.alpha
      ctx.strokeStyle = '#ffd27a'
      ctx.lineWidth = width
      ctx.beginPath()
      ctx.arc(0, 0, radius, slash.to - 2.4, slash.to)
      ctx.stroke()
    }
    ctx.restore()
    return
  }
  const [px, py] = SWORD_PIVOT
  const a0 = SWORD_REST_ANGLE + slash.from
  const a1 = SWORD_REST_ANGLE + slash.to
  ctx.translate(px, py)
  const r = slash.radius
  const rings = slash.heavy
    ? ([
        [r - 4, 36, 0.3],
        [r + 6, 16, 0.8],
      ] as const)
    : ([
        [r - 4, 26, 0.28],
        [r + 4, 12, 0.7],
      ] as const)
  for (const [radius, width, alpha] of rings) {
    ctx.globalAlpha = alpha * slash.alpha
    ctx.strokeStyle = slash.heavy ? '#ffd27a' : '#fff4d6'
    ctx.lineWidth = width
    ctx.beginPath()
    ctx.arc(0, 0, radius, a0, a1, a1 < a0)
    ctx.stroke()
  }
  ctx.restore()
}

export function drawKnight(ctx: CanvasRenderingContext2D, w: World) {
  const p = w.player
  const weapon = w.loadout[w.activeSlot]
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
      drawFigure(ctx, pose, weapon)
      ctx.restore()
    }
  }
  if (blink) ctx.globalAlpha = 0.45
  drawFigure(ctx, pose, weapon)
  ctx.restore()
  if (p.parryFlash > 0) drawParryFlash(ctx, p.x + p.facing * 40 * ART_SCALE, ARENA.groundY - p.y - 80 * ART_SCALE, p.parryFlash / 0.35)
  if (p.drawing) drawDrawMeter(ctx, p.x, ARENA.groundY - p.y - 150 * ART_SCALE - 14, p.drawPower)
}

/** A small meter over the head while a bow is drawn: full means the strongest shot. */
function drawDrawMeter(ctx: CanvasRenderingContext2D, x: number, y: number, power: number) {
  ctx.save()
  ctx.fillStyle = 'rgba(10,10,14,.7)'
  ctx.fillRect(x - 26, y - 2, 52, 8)
  ctx.fillStyle = power >= 1 ? '#ffd27a' : '#f5a93a'
  ctx.fillRect(x - 24, y, 48 * Math.max(0.06, power), 4)
  ctx.restore()
}

/** A bright ring and cross-flash at the shield for the moment after a parry. */
function drawParryFlash(ctx: CanvasRenderingContext2D, x: number, y: number, left: number) {
  const grow = 1 - left
  ctx.save()
  ctx.globalAlpha = left
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 4 * left + 1
  ctx.beginPath()
  ctx.arc(x, y, 14 + 40 * grow, 0, Math.PI * 2)
  ctx.stroke()
  ctx.strokeStyle = '#ffd27a'
  ctx.lineWidth = 3
  ctx.beginPath()
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI / 4
    ctx.moveTo(x + Math.cos(a) * 10, y + Math.sin(a) * 10)
    ctx.lineTo(x + Math.cos(a) * (28 + 30 * grow), y + Math.sin(a) * (28 + 30 * grow))
  }
  ctx.stroke()
  ctx.restore()
}
