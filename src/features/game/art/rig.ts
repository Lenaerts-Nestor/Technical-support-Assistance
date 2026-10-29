/**
 * Characters are drawn from a handful of flat vector shapes grouped into parts. A part turns
 * about its pivot, so a leg swings from the hip and a sword arm from the shoulder. All
 * coordinates are in the artwork's own units: the origin is between the feet, y grows
 * downwards (so the body is at negative y), and the character faces right.
 */
export type Piece = {
  /** An SVG path. */
  d: string
  fill?: string
  stroke?: string
  width?: number
  /** Dash pattern for a stroked line (chains, stitching). */
  dash?: readonly number[]
}

export type Part = {
  pieces: readonly Piece[]
  pivot: readonly [number, number]
}

/** SVG path for a circle. */
export const circle = (cx: number, cy: number, r: number) =>
  `M${cx - r},${cy} a${r},${r} 0 1,0 ${2 * r},0 a${r},${r} 0 1,0 ${-2 * r},0 Z`

/** SVG path for an axis-aligned rectangle. */
export const rect = (x: number, y: number, w: number, h: number) => `M${x},${y} L${x + w},${y} L${x + w},${y + h} L${x},${y + h} Z`

/** SVG path for an ellipse. */
export const ellipse = (cx: number, cy: number, rx: number, ry: number) =>
  `M${cx - rx},${cy} a${rx},${ry} 0 1,0 ${2 * rx},0 a${rx},${ry} 0 1,0 ${-2 * rx},0 Z`

/**
 * Move a path by (dx, dy). Only for paths written with absolute `M`, `L` and `C` commands, where
 * every coordinate comes as an `x,y` pair.
 */
export const shift = (d: string, dx: number, dy: number) =>
  d.replace(/(-?\d*\.?\d+),(-?\d*\.?\d+)/g, (_, x: string, y: string) => `${Number(x) + dx},${Number(y) + dy}`)
