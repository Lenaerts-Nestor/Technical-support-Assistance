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

/** Draw one part. `flash` paints the whole thing white, the flicker of a fresh hit. */
export function drawPart(ctx: CanvasRenderingContext2D, part: Part, pose: PartPose = {}, flash = false) {
  const [px, py] = part.pivot
  ctx.save()
  ctx.translate(px + (pose.dx ?? 0), py + (pose.dy ?? 0))
  ctx.rotate(pose.rot ?? 0)
  ctx.translate(-px, -py)
  for (const piece of part.pieces) {
    const p = path(piece.d)
    if (piece.fill || !piece.stroke) {
      ctx.fillStyle = flash ? '#ffffff' : (piece.fill ?? '#ff00ff')
      ctx.fill(p)
    }
    if (piece.stroke) {
      ctx.strokeStyle = flash ? '#ffffff' : piece.stroke
      ctx.lineWidth = piece.width ?? 2
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.stroke(p)
    }
  }
  ctx.restore()
}

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const easeOut = (t: number) => 1 - (1 - t) * (1 - t)
export const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t))
