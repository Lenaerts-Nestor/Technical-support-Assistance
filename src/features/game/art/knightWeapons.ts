/**
 * The long sword, mace and bow as the knight holds them. Like the sword and shield they are
 * drawn pointing along the knight's resting arm, from the shoulder pivot, so one rotation
 * swings any of them. `at(distance, offset)` is a point that far along the arm and that far
 * to its side.
 */
import { SWORD_PIVOT, SWORD_REST_ANGLE } from './knight'
import { circle, rect } from './rig'
import type { Part, Piece } from './rig'

const STEEL = '#9aa3b2'
const STEEL_DARK = '#5d6676'
const STEEL_LIGHT = '#c9d1de'
const LEATHER = '#46301e'
const GOLD = '#f5a93a'
const IRON = '#3a3f4a'

const [px, py] = SWORD_PIVOT
const ux = Math.cos(SWORD_REST_ANGLE)
const uy = Math.sin(SWORD_REST_ANGLE)

/** A point `d` along the resting arm and `off` to its side (positive is down). */
export const at = (d: number, off = 0): [number, number] => [px + ux * d - uy * off, py + uy * d + ux * off]

const f = (n: number) => Math.round(n * 100) / 100
const poly = (points: [number, number][]) => `M${points.map(([x, y]) => `${f(x)},${f(y)}`).join(' L')} Z`
const line = (a: [number, number], b: [number, number]) => `M${f(a[0])},${f(a[1])} L${f(b[0])},${f(b[1])}`

/** The sword arm and the gauntlet on it, shared by every weapon. */
const ARM: Piece[] = [
  { d: 'M18,-122 L34,-114 L56,-108 L54,-100 L30,-104 L16,-110 Z', fill: STEEL_DARK },
  { d: rect(52, -114, 12, 14), fill: STEEL_LIGHT },
]

/** The other arm, reaching round to a two-handed grip. */
function offArm(grip: number): Piece[] {
  const [hx, hy] = at(grip)
  return [
    { d: poly([[-4, -122], [-4, -111], at(grip, 5), at(grip, -5)]), fill: '#4d5563' },
    { d: circle(f(hx), f(hy), 6), fill: STEEL },
  ]
}

export const LONG_SWORD: Part = {
  pivot: SWORD_PIVOT,
  pieces: [
    ...offArm(36),
    ...ARM,
    { d: line(at(22), at(50)), stroke: LEATHER, width: 7 },
    { d: circle(...at(21), 4.5), fill: GOLD },
    { d: line(at(54, -14), at(54, 14)), stroke: GOLD, width: 5 },
    { d: poly([at(57, -5.5), at(200, -3.4), at(218), at(200, 3.4), at(57, 5.5)]), fill: '#e3e8f0' },
    { d: poly([at(57), at(218), at(200, 3.4), at(57, 5.5)]), fill: STEEL },
    { d: line(at(64), at(196)), stroke: STEEL_LIGHT, width: 1.6 },
  ],
}

/** Eight spikes round a head of iron. */
function spikes(centre: [number, number], inner: number, outer: number, half: number) {
  const parts: string[] = []
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4 + SWORD_REST_ANGLE
    const base: [number, number] = [centre[0] + Math.cos(a) * inner, centre[1] + Math.sin(a) * inner]
    const tip: [number, number] = [centre[0] + Math.cos(a) * outer, centre[1] + Math.sin(a) * outer]
    const sx = -Math.sin(a) * half
    const sy = Math.cos(a) * half
    parts.push(poly([[base[0] + sx, base[1] + sy], tip, [base[0] - sx, base[1] - sy]]))
  }
  return parts.join(' ')
}

const MACE_HEAD = at(142)

export const MACE: Part = {
  pivot: SWORD_PIVOT,
  pieces: [
    ...offArm(40),
    ...ARM,
    { d: line(at(26), at(132)), stroke: '#6b4a2f', width: 8 },
    { d: line(at(40), at(46)), stroke: LEATHER, width: 9 },
    { d: line(at(58), at(64)), stroke: LEATHER, width: 9 },
    { d: circle(...at(24), 5), fill: GOLD },
    { d: spikes(MACE_HEAD, 14, 31, 5.5), fill: STEEL_LIGHT },
    { d: circle(MACE_HEAD[0], MACE_HEAD[1], 19), fill: IRON },
    { d: circle(MACE_HEAD[0], MACE_HEAD[1], 13), fill: '#596070' },
    { d: circle(MACE_HEAD[0] - 3, MACE_HEAD[1] - 3, 4), fill: STEEL_LIGHT },
  ],
}

/** What the bow needs to be drawn: the arm, then the limbs and string, which move as it is pulled. */
export const BOW_ARM: Part = { pivot: SWORD_PIVOT, pieces: ARM }

const BOW_CENTRE = at(84)

/** The two limbs' tips and the string's rest and fully drawn nock points. */
export function bowPoints(pull: number) {
  const [cx, cy] = BOW_CENTRE
  const top: [number, number] = [cx - 8, cy - 64]
  const bottom: [number, number] = [cx - 8, cy + 64]
  const nock: [number, number] = [cx - 6 - pull * 46, cy]
  const belly: [number, number] = [cx + 16, cy]
  return { top, bottom, nock, belly, front: [cx + 46, cy] as [number, number] }
}

export const BOW_COLORS = { wood: '#8a5a2b', woodLight: '#b9803f', string: '#e6dcc3', shaft: '#c9b88f', head: STEEL_LIGHT, fletch: '#d6525c', hand: STEEL }
