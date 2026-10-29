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
