import { ARENA, ART_SCALE, DASH, PLAYER, SHIELD, SWAP } from '../config'
import type { Appearance } from '../appearance'
import { knightRig } from '../art/knight'
import type { KnightRig } from '../art/knight'
import { SWORD_PIVOT, SWORD_REST_ANGLE } from '../art/knight'
import { weaponOf } from '../sim'
import type { World } from '../types'
import type { WeaponId } from '../weapons'
import { easeOutBack, smootherOf } from './anim'
import { REST_ANGLE, SWING_RADIUS, drawWeapon } from './weaponDraw'
import { clamp, drawPart, easeInOut, easeOut, lerp } from './rigDraw'
import type { Tint } from './rigDraw'

type Slash = { from: number; to: number; alpha: number; heavy: boolean; radius: number }

type KnightPose = {
  dx: number
  dy: number
  lean: number
  front: number
  back: number
  /** How high each foot is lifted in a stride. */
  liftFront: number
  liftBack: number
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
  /** Squash and stretch of the whole body about the feet. */
  scaleX: number
  scaleY: number
  slash: Slash | null
  /** Where the weapon was a moment ago, for the faint copies that trail a fast swing. */
  ghosts: number[]
}

const BLANK: KnightPose = {
  dx: 0, dy: 0, lean: 0, front: 0, back: 0, liftFront: 0, liftBack: 0, sword: 0, shield: 0, guard: 0, cape: 0, plume: 0,
  fall: 0, spin: 0, pull: 0, nocked: false, scaleX: 1, scaleY: 1, slash: null, ghosts: [],
}

/** What the knight is aiming for this instant, from what the simulation says it is doing. */
function targetPose(w: World): KnightPose {
  const p = w.player
  const weapon = weaponOf(w)
  const rest = REST_ANGLE[weapon.id]
  const t = w.time
  const forward = (p.vx * p.facing) / PLAYER.speed
  const pose: KnightPose = { ...BLANK, sword: rest, ghosts: [] }

  const breath = Math.sin(t * 3)
  pose.plume = Math.sin(t * 5) * 0.06
  if (p.grounded && Math.abs(p.vx) > 25 && p.state !== 'attack') {
    const stride = p.x * 0.075 * p.facing
    pose.front = Math.sin(stride) * 0.7
    pose.back = -pose.front
    // The foot that is swinging forward comes up off the ground.
    pose.liftFront = 5 * Math.max(0, -Math.cos(stride))
    pose.liftBack = 5 * Math.max(0, Math.cos(stride))
    pose.dy = -Math.abs(Math.cos(stride)) * 3
    pose.lean = 0.08 * forward + Math.sin(stride * 2) * 0.018
    pose.cape = 0.25 * forward
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
    // Stretched on the way up and down.
    pose.scaleY = 1 + 0.07 * Math.min(1, Math.abs(p.vy) / 700)
    pose.scaleX = 1 - 0.035 * Math.min(1, Math.abs(p.vy) / 700)
  }
  // Landing: squashed for a moment, then back.
  if (p.landTime > 0) {
    const land = p.landTime / 0.2
    pose.scaleY = 1 - 0.17 * land
    pose.scaleX = 1 + 0.11 * land
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
      pose.scaleX = 1.08
      pose.scaleY = 0.94
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
      pose.lean = -0.38
      pose.sword = rest - 0.7
      pose.cape = 0.4
      pose.plume = 0.4
      pose.scaleY = 0.95
      pose.dx = -5
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

/** The weapon arm's angle at a moment of a swing: wound back, whipped through, then eased home. */
function swingAngle(step: { hitStart: number; hitEnd: number; duration: number; swing: { from: number; to: number } }, rest: number, u: number): number {
  if (u < step.hitStart) return lerp(rest, step.swing.from, easeOut(clamp(u / step.hitStart, 0, 1)))
  if (u <= step.hitEnd) return lerp(step.swing.from, step.swing.to, easeOutBack(clamp((u - step.hitStart) / Math.max(0.001, step.hitEnd - step.hitStart), 0, 1), 1.0))
  return lerp(step.swing.to, rest, easeInOut(clamp((u - step.hitEnd) / (step.duration - step.hitEnd), 0, 1)))
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

  const angle = swingAngle(step, rest, u)
  pose.sword = angle
  pose.front = -0.4
  pose.back = 0.35
  pose.shield = -0.12
  pose.lean = 0.05 + 0.22 * strike * (1 - clamp((u - step.hitEnd) / 0.2, 0, 1))
  // A heavy swing coils back and down before it comes round.
  if (heavy) {
    pose.lean -= 0.22 * windup * (1 - strike)
    pose.dy += 4 * windup * (1 - strike)
    pose.scaleY = 1 - 0.05 * windup * (1 - strike)
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
    pose.sword = lerp(rest, -0.02, windup)
    pose.lean = 0.1 + 0.3 * drive
    pose.dx = 16 * drive
    pose.front = -0.8 * drive - 0.2
    pose.back = 0.6 * drive
    return
  }
  if (u >= step.hitStart - 0.01 && fade > 0) {
    const current = u <= step.hitEnd ? angle : step.swing.to
    pose.slash = { from: step.swing.from, to: current, alpha: fade, heavy, radius: SWING_RADIUS[weapon] }
  }
  // Faint copies of the weapon a few instants back make a fast swing read as motion.
  if (u > step.hitStart - 0.03 && u < step.hitEnd + 0.07) {
    for (const lag of [0.02, 0.04, 0.06]) pose.ghosts.push(swingAngle(step, rest, Math.max(0, u - lag)))
  }
}

type Figure = { rig: KnightRig; pose: KnightPose; weapon: WeaponId; tint: Tint | false }

function drawFigure(ctx: CanvasRenderingContext2D, { rig, pose, weapon, tint }: Figure) {
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
  ctx.scale(pose.scaleX, pose.scaleY)
  if (pose.spin > 0) {
    // Turning on the spot reads as the body narrowing and widening again.
    const squeeze = Math.cos(pose.spin)
    ctx.scale(Math.abs(squeeze) < 0.18 ? 0.18 * Math.sign(squeeze || 1) : squeeze, 1)
  }
  inBody(() => drawPart(ctx, rig.cape, { rot: pose.cape }, tint))
  drawPart(ctx, rig.backLeg, { rot: pose.back, dy: -pose.liftBack }, tint)
  drawPart(ctx, rig.frontLeg, { rot: pose.front, dy: -pose.liftFront }, tint)
  inBody(() => {
    drawPart(ctx, rig.body, {}, tint)
    drawPart(ctx, rig.plume, { rot: pose.plume }, tint)
    if (weapon === 'swordShield') drawPart(ctx, rig.shield, { rot: pose.shield, dx: pose.guard, dy: -pose.guard * 0.25 }, tint)
    if (pose.slash) drawSlash(ctx, pose.slash)
    pose.ghosts.forEach((angle, i) => {
      ctx.save()
      ctx.globalAlpha = 0.22 - i * 0.06
      drawWeapon(ctx, rig, weapon, angle, 0, false, { color: '#fff4d6', amount: 0.55 })
      ctx.restore()
    })
    drawWeapon(ctx, rig, weapon, pose.sword, pose.pull, pose.nocked, tint)
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

export function drawKnight(ctx: CanvasRenderingContext2D, w: World, dt: number) {
  const p = w.player
  const weapon = w.loadout[w.activeSlot]
  const rig = knightRig(w.look)
  const sm = smootherOf(p)
  const target = targetPose(w)
  const attacking = p.state === 'attack'

  // The pose blends towards what the rules ask for rather than jumping to it; swings are
  // followed closely, everything else a little more lazily, and the cape and plume ride springs.
  const pose: KnightPose = {
    ...target,
    dx: sm.ease('dx', target.dx, 24, dt),
    dy: sm.ease('dy', target.dy, 22, dt),
    lean: sm.ease('lean', target.lean, attacking ? 34 : 13, dt),
    front: sm.ease('front', target.front, 22, dt),
    back: sm.ease('back', target.back, 22, dt),
    liftFront: sm.ease('liftFront', target.liftFront, 26, dt),
    liftBack: sm.ease('liftBack', target.liftBack, 26, dt),
    sword: sm.ease('sword', target.sword, attacking ? 60 : 15, dt),
    shield: sm.ease('shield', target.shield, 20, dt),
    guard: sm.ease('guard', target.guard, 26, dt),
    pull: sm.ease('pull', target.pull, 40, dt),
    scaleX: sm.ease('sx', target.scaleX, 30, dt),
    scaleY: sm.ease('sy', target.scaleY, 30, dt),
    cape: sm.spring('cape', target.cape, dt, 3.2, 0.36),
    plume: sm.spring('plume', target.plume, dt, 4.2, 0.34),
  }
  // Turning round takes a beat: the body narrows, then widens facing the new way.
  const facing = sm.ease('facing', p.facing, 22, dt)

  // A fresh hit flashes white; the warning of a coming blow is not for the hero.
  const flash = clamp((p.hitTime - 0.22) / 0.1, 0, 1)
  const tint: Tint | false = flash > 0 ? { color: '#ffffff', amount: flash } : false
  const blink = p.invuln > 0 && p.state !== 'dash' && p.state !== 'dead' && p.hitTime === 0 && Math.floor(w.time * 24) % 2 === 0

  ctx.save()
  ctx.translate(p.x, ARENA.groundY - p.y)
  ctx.scale(ART_SCALE * facing, ART_SCALE)
  if (p.state === 'dash') {
    // Fading copies trailing behind sell the speed of the dash.
    const reach = (DASH.speed * 0.045) / ART_SCALE
    for (let i = 3; i >= 1; i--) {
      ctx.save()
      ctx.globalAlpha = 0.16 * (4 - i)
      ctx.translate(-reach * i, 0)
      drawFigure(ctx, { rig, pose, weapon, tint })
      ctx.restore()
    }
  }
  if (blink) ctx.globalAlpha = 0.45
  drawFigure(ctx, { rig, pose, weapon, tint })
  ctx.restore()
  if (p.parryFlash > 0) drawParryFlash(ctx, p.x + p.facing * 40 * ART_SCALE, ARENA.groundY - p.y - 80 * ART_SCALE, p.parryFlash / 0.35)
  if (p.drawing) drawDrawMeter(ctx, p.x, ARENA.groundY - p.y - 150 * ART_SCALE - 14, p.drawPower)
}

/** The hero standing at ease, for the start screen's preview. */
export function drawKnightPortrait(ctx: CanvasRenderingContext2D, look: Appearance, weapon: WeaponId, time: number, scale: number) {
  const rig = knightRig(look)
  const breath = Math.sin(time * 3)
  const pose: KnightPose = {
    ...BLANK,
    dy: breath * 1.2,
    front: 0.05,
    back: -0.08,
    sword: REST_ANGLE[weapon] + breath * 0.03,
    cape: 0.05 + Math.sin(time * 2.2) * 0.04,
    plume: Math.sin(time * 4) * 0.08,
    ghosts: [],
  }
  ctx.save()
  ctx.scale(scale, scale)
  drawFigure(ctx, { rig, pose, weapon, tint: false })
  ctx.restore()
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
