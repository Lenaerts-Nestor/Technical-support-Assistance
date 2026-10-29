import type { Part } from '../art/rig'

const paths = new Map<string, Path2D>()

function path(d: string) {
  let p = paths.get(d)
  if (!p) {
    p = new Path2D(d)
    paths.set(d, p)
  }
  return p
}

/** How far a part is turned about its pivot (radians, clockwise) and shifted. */
export type PartPose = { rot?: number; dx?: number; dy?: number }

/** A colour pulled part of the way over a part: white for a fresh hit, red for a warning. */
export type Tint = { color: string; amount: number }

const WHITE: Tint = { color: '#ffffff', amount: 1 }
const mixed = new Map<string, string>()

function rgba(hex: string): [number, number, number, number] {
  const h = hex.replace('#', '')
  const n = (i: number) => parseInt(h.slice(i, i + 2), 16)
  return [n(0), n(2), n(4), h.length >= 8 ? n(6) / 255 : 1]
}

/** `fill` with `tint.color` mixed in by `tint.amount`. Mixes are remembered, so a pulse costs nothing after a moment. */
function tinted(fill: string, tint: Tint): string {
  const amount = Math.round(clamp(tint.amount, 0, 1) * 20) / 20
  if (amount <= 0) return fill
  const key = `${fill}|${tint.color}|${amount}`
  let out = mixed.get(key)
  if (!out) {
    const [r, g, b, a] = rgba(fill.startsWith('#') ? fill : '#ff00ff')
    const [tr, tg, tb] = rgba(tint.color)
    out = `rgba(${Math.round(r + (tr - r) * amount)},${Math.round(g + (tg - g) * amount)},${Math.round(b + (tb - b) * amount)},${a.toFixed(3)})`
    mixed.set(key, out)
  }
  return out
}

/** Draw one part. A `tint` (or `true` for the white of a fresh hit) recolours it. */
export function drawPart(ctx: CanvasRenderingContext2D, part: Part, pose: PartPose = {}, tint: Tint | boolean = false) {
  const t = tint === true ? WHITE : tint === false ? null : tint
  const [px, py] = part.pivot
  ctx.save()
  ctx.translate(px + (pose.dx ?? 0), py + (pose.dy ?? 0))
  ctx.rotate(pose.rot ?? 0)
  ctx.translate(-px, -py)
  for (const piece of part.pieces) {
    const p = path(piece.d)
    if (piece.fill || !piece.stroke) {
      const fill = piece.fill ?? '#ff00ff'
      ctx.fillStyle = t ? tinted(fill, t) : fill
      ctx.fill(p)
    }
    if (piece.stroke) {
      ctx.strokeStyle = t ? tinted(piece.stroke, t) : piece.stroke
      ctx.lineWidth = piece.width ?? 2
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.setLineDash(piece.dash ? [...piece.dash] : [])
      ctx.stroke(p)
      ctx.setLineDash([])
    }
  }
  ctx.restore()
}

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const easeOut = (t: number) => 1 - (1 - t) * (1 - t)
export const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t))
