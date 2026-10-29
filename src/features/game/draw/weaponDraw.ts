import { BOW_ARM, BOW_COLORS, LONG_SWORD, MACE, bowPoints } from '../art/knightWeapons'
import { KNIGHT, SWORD_PIVOT } from '../art/knight'
import type { WeaponId } from '../weapons'
import { drawPart } from './rigDraw'

/** How a weapon rests when nothing is being swung: radians from the arm's own direction. */
export const REST_ANGLE: Record<WeaponId, number> = { swordShield: 0, longSword: -0.2, mace: -0.75, bow: 0 }

/** How far the blade or head sweeps from the shoulder, for the swing arc behind it. */
export const SWING_RADIUS: Record<WeaponId, number> = { swordShield: 100, longSword: 150, mace: 118, bow: 0 }

/** Draw the weapon in hand, turned `rot` about the shoulder. `pull` is how far a bow string is drawn. */
export function drawWeapon(ctx: CanvasRenderingContext2D, weapon: WeaponId, rot: number, pull: number, nocked: boolean) {
  if (weapon === 'swordShield') drawPart(ctx, KNIGHT.swordArm, { rot })
  else if (weapon === 'longSword') drawPart(ctx, LONG_SWORD, { rot })
  else if (weapon === 'mace') drawPart(ctx, MACE, { rot })
  else drawBow(ctx, rot, pull, nocked)
}

function drawBow(ctx: CanvasRenderingContext2D, rot: number, pull: number, nocked: boolean) {
  drawPart(ctx, BOW_ARM, { rot })
  const [px, py] = SWORD_PIVOT
  const { top, bottom, nock, belly, front } = bowPoints(pull)
  ctx.save()
  ctx.translate(px, py)
  ctx.rotate(rot)
  ctx.translate(-px, -py)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  // Limbs: one curve from tip to tip, bellied out towards the target.
  ctx.strokeStyle = BOW_COLORS.wood
  ctx.lineWidth = 7
  ctx.beginPath()
  ctx.moveTo(top[0], top[1])
  ctx.bezierCurveTo(belly[0] + 14, top[1] + 14, belly[0] + 14, bottom[1] - 14, bottom[0], bottom[1])
  ctx.stroke()
  ctx.strokeStyle = BOW_COLORS.woodLight
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(top[0] + 1, top[1] + 4)
  ctx.bezierCurveTo(belly[0] + 11, top[1] + 18, belly[0] + 11, bottom[1] - 18, bottom[0] + 1, bottom[1] - 4)
  ctx.stroke()
  ctx.fillStyle = '#46301e'
  ctx.fillRect(belly[0] - 2, belly[1] - 9, 8, 18)

  // The string, bent back to the nock when drawn.
  ctx.strokeStyle = BOW_COLORS.string
  ctx.lineWidth = 1.8
  ctx.beginPath()
  ctx.moveTo(top[0], top[1])
  ctx.lineTo(nock[0], nock[1])
  ctx.lineTo(bottom[0], bottom[1])
  ctx.stroke()

  if (nocked) {
    ctx.strokeStyle = BOW_COLORS.shaft
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(nock[0], nock[1])
    ctx.lineTo(front[0] + 4, front[1])
    ctx.stroke()
    ctx.fillStyle = BOW_COLORS.head
    ctx.beginPath()
    ctx.moveTo(front[0] + 4, front[1] - 5)
    ctx.lineTo(front[0] + 16, front[1])
    ctx.lineTo(front[0] + 4, front[1] + 5)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = BOW_COLORS.fletch
    ctx.beginPath()
    ctx.moveTo(nock[0] + 1, nock[1])
    ctx.lineTo(nock[0] + 11, nock[1] - 5)
    ctx.lineTo(nock[0] + 13, nock[1])
    ctx.lineTo(nock[0] + 11, nock[1] + 5)
    ctx.closePath()
    ctx.fill()
  }
  // The drawing hand.
  ctx.fillStyle = BOW_COLORS.hand
  ctx.beginPath()
  ctx.arc(nock[0] - 2, nock[1], 6, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}
