import type { DeviceDef, PortDef } from './devices'
import { getUnitKind, specSide, unitPortSpecs, type PortSpec } from './units'
import type { PanelCable, PanelEndpoint } from '../types'

/**
 * Geometry for the "scene" of a panel: unit boxes (each with its own ports),
 * the cables between everything, and, on a chassis layout, the chassis itself.
 * Pure functions, no drawing, so the canvas and the diagram agree on bounds.
 *
 * Point ids: a chassis port is its own id (`in-3:hdmi-out`); a unit port is
 * `ep:<unit>:<port>`; `ep:<unit>` is the unit's box (used by plain legacy
 * boxes without ports).
 */

export const EP_W = 220
const EP_BASE_H = 58
const EP_LINE_H = 13
const EP_GAP = 14
/** Between a column and the chassis, or between two columns: room for cables. */
const EP_MARGIN = 80
const COL_GAP = 70
const MAX_INFO_LINES = 3
const PORT_W = 92
const PORT_H = 18
const PORT_PITCH = 22
const PORT_INSET = 8

export type Rect = { x: number; y: number; w: number; h: number }
export type Pt = { x: number; y: number }

export const epPointId = (unitId: string, portKey?: string) =>
  portKey ? `ep:${unitId}:${portKey}` : `ep:${unitId}`
export const isEpPoint = (id: string) => id.startsWith('ep:')

/** Split a unit point id into the unit and, for a port, its key. */
export function parsePoint(id: string): { unitId: string; portKey?: string } | null {
  if (!isEpPoint(id)) return null
  const [, unitId, portKey] = id.split(':')
  return unitId ? { unitId, portKey } : null
}

export type UnitPort = {
  /** Full point id, `ep:<unit>:<port>`. */
  id: string
  spec: PortSpec
  x: number
  y: number
  w: number
  h: number
  /** Where a cable attaches: the box edge beside the pill. */
  anchor: Pt
  /** Which way the cable leaves: -1 left, +1 right. */
  dir: 1 | -1
}

export type EpItem = {
  endpoint: PanelEndpoint
  x: number
  y: number
  w: number
  h: number
  /** Hops away from the chassis: 0 touches it, 1 feeds a depth-0 box, and so on. */
  depth: number
  /** True when the box sits left of the chassis's middle (its cables leave from the right edge). */
  left: boolean
  /** Edge facing the chassis, and the edge facing away. Used by plain boxes without ports. */
  inner: Pt
  outer: Pt
  lines: string[]
  ports: UnitPort[]
}

export type Scene = { items: EpItem[]; bounds: Rect }

const infoLines = (e: PanelEndpoint) =>
  e.info
    .filter((i) => i.key.trim() || i.value.trim())
    .slice(0, MAX_INFO_LINES)
    .map((i) => (i.key.trim() ? `${i.key.trim()}: ${i.value.trim()}` : i.value.trim()))

const portCy = (p: PortDef) => p.y + p.h / 2

/** Size of a unit box and where its ports sit relative to its top-left corner. */
function unitShape(e: PanelEndpoint, lineCount: number) {
  const specs = unitPortSpecs(e.kind, e.model)
  const top = EP_BASE_H + lineCount * EP_LINE_H + 4
  if (specs.length === 0)
    return { h: EP_BASE_H + lineCount * EP_LINE_H, top: 0, ports: [] as { spec: PortSpec; col: 'L' | 'R'; row: number }[] }
  // A port's own `side` wins; otherwise inputs go left and outputs right.
  const sideOf = specSide
  const left: PortSpec[] = specs.filter((s) => sideOf(s) === 'L')
  const right: PortSpec[] = specs.filter((s) => sideOf(s) === 'R')
  // Two-way ports with no preference fill whichever column is shorter, starting left.
  for (const s of specs.filter((x) => !sideOf(x))) (left.length <= right.length ? left : right).push(s)
  const ports = [
    ...left.map((spec, row) => ({ spec, col: 'L' as const, row })),
    ...right.map((spec, row) => ({ spec, col: 'R' as const, row })),
  ]
  return { h: top + Math.max(left.length, right.length) * PORT_PITCH + 6, top, ports }
}

/**
 * Place the units. On a chassis layout, stack each column top to bottom, nudged
 * toward whatever its cables touch, then push apart so boxes never overlap. On
 * a freestyle canvas, boxes go where they were put and new ones in a grid.
 */
export function layoutScene(
  device: DeviceDef,
  endpoints: PanelEndpoint[],
  cables: PanelCable[],
): Scene {
  const chassisPorts = new Map(device.ports.map((p) => [p.id, p]))
  const unitIds = new Set(endpoints.map((e) => e.id))
  const unitOf = (id: string) => {
    const pt = parsePoint(id)
    return pt && unitIds.has(pt.unitId) ? pt.unitId : null
  }

  // Hop distance from the chassis: units cabled to a port are 0, their neighbours 1, …
  const depth = new Map<string, number>()
  const queue: string[] = []
  for (const c of cables) {
    for (const [a, b] of [[c.from, c.to], [c.to, c.from]]) {
      const u = unitOf(a)
      if (u && chassisPorts.has(b) && !depth.has(u)) {
        depth.set(u, 0)
        queue.push(u)
      }
    }
  }
  for (let i = 0; i < queue.length; i++) {
    const cur = queue[i]
    for (const c of cables) {
      const ua = unitOf(c.from)
      const ub = unitOf(c.to)
      const other = ua === cur ? ub : ub === cur ? ua : null
      if (other && !depth.has(other)) {
        depth.set(other, (depth.get(cur) ?? 0) + 1)
        queue.push(other)
      }
    }
  }
  for (const id of unitIds) if (!depth.has(id)) depth.set(id, 0)

  const shapes = new Map(
    endpoints.map((e) => {
      const lines = infoLines(e)
      return [e.id, { lines, ...unitShape(e, lines.length) }] as const
    }),
  )

  const build = (e: PanelEndpoint, x: number, y: number, isLeft: boolean, d: number): EpItem => {
    const shape = shapes.get(e.id)!
    const leftEdge = { x, y: y + shape.h / 2 }
    const rightEdge = { x: x + EP_W, y: y + shape.h / 2 }
    const ports: UnitPort[] = shape.ports.map(({ spec, col, row }) => {
      const py = y + shape.top + row * PORT_PITCH
      const px = col === 'L' ? x + PORT_INSET : x + EP_W - PORT_INSET - PORT_W
      return {
        id: epPointId(e.id, spec.key),
        spec,
        x: px,
        y: py,
        w: PORT_W,
        h: PORT_H,
        anchor: { x: col === 'L' ? x : x + EP_W, y: py + PORT_H / 2 },
        dir: col === 'L' ? -1 : 1,
      }
    })
    return {
      endpoint: e,
      x,
      y,
      w: EP_W,
      h: shape.h,
      depth: d,
      left: isLeft,
      inner: isLeft ? rightEdge : leftEdge,
      outer: isLeft ? leftEdge : rightEdge,
      lines: shape.lines,
      ports,
    }
  }

  const placed = new Map<string, EpItem>()

  if (device.freestyle) {
    // Boxes keep their spot; any without one fill a grid to the right of the rest.
    const fixed = endpoints.filter((e) => e.pos)
    const startX = fixed.length ? Math.max(...fixed.map((e) => e.pos!.x + EP_W)) + 100 : 0
    let n = 0
    for (const e of endpoints) {
      if (e.pos) {
        placed.set(e.id, build(e, e.pos.x, e.pos.y, true, depth.get(e.id) ?? 0))
      } else {
        placed.set(e.id, build(e, startX + (n % 3) * (EP_W + 120), Math.floor(n / 3) * 300, true, depth.get(e.id) ?? 0))
        n++
      }
    }
    const items = [...placed.values()]
    if (items.length === 0) return { items, bounds: { x: 0, y: 0, w: 900, h: 520 } }
    const pad = 40
    const minX = Math.min(...items.map((i) => i.x)) - pad
    const minY = Math.min(...items.map((i) => i.y)) - pad
    const maxX = Math.max(...items.map((i) => i.x + i.w)) + pad
    const maxY = Math.max(...items.map((i) => i.y + i.h)) + pad
    const w = Math.max(maxX - minX, 700)
    const h = Math.max(maxY - minY, 420)
    return { items, bounds: { x: minX - (w - (maxX - minX)) / 2, y: minY - (h - (maxY - minY)) / 2, w, h } }
  }

  const maxDepth = { source: 0, display: 0 }
  for (const [id, d] of depth) {
    const side = endpoints.find((e) => e.id === id)!.side
    maxDepth[side] = Math.max(maxDepth[side], d)
  }
  const colX = (side: 'source' | 'display', d: number) =>
    side === 'source'
      ? -(EP_MARGIN + EP_W + d * (EP_W + COL_GAP))
      : device.width + EP_MARGIN + d * (EP_W + COL_GAP)

  const yOf = (id: string): number | undefined => {
    const port = chassisPorts.get(id)
    if (port) return portCy(port)
    const u = unitOf(id)
    const it = u ? placed.get(u) : undefined
    return it ? it.y + it.h / 2 : undefined
  }

  for (const side of ['source', 'display'] as const) {
    for (let d = 0; d <= maxDepth[side]; d++) {
      const col = endpoints
        .filter((e) => e.side === side && depth.get(e.id) === d)
        .map((endpoint, order) => {
          const ys = cables
            .filter((c) => unitOf(c.from) === endpoint.id || unitOf(c.to) === endpoint.id)
            .map((c) => yOf(unitOf(c.from) === endpoint.id ? c.to : c.from))
            .filter((y): y is number => y !== undefined)
          const want = ys.length ? ys.reduce((a, b) => a + b, 0) / ys.length : Infinity
          return { endpoint, order, want }
        })
        .sort((a, b) => a.want - b.want || a.order - b.order)

      const x = colX(side, d)
      let bottom = 40 - EP_GAP
      for (const { endpoint, want } of col) {
        const h = shapes.get(endpoint.id)!.h
        // A dragged box stays where it was put; the rest stack around the gaps.
        const fixed = endpoint.pos
        const y = fixed ? fixed.y : Math.max(Number.isFinite(want) ? want - h / 2 : 0, bottom + EP_GAP)
        if (!fixed) bottom = y + h
        const bx = fixed ? fixed.x : x
        const isLeft = fixed ? bx + EP_W / 2 < device.width / 2 : side === 'source'
        placed.set(endpoint.id, build(endpoint, bx, y, isLeft, d))
      }
    }
  }

  const items = [...placed.values()]
  const hasSide = (side: 'source' | 'display') => endpoints.some((e) => e.side === side)
  const left = hasSide('source') ? -(EP_MARGIN + EP_W + maxDepth.source * (EP_W + COL_GAP)) - 20 : 0
  const right = hasSide('display')
    ? device.width + EP_MARGIN + EP_W + maxDepth.display * (EP_W + COL_GAP) + 20
    : device.width
  const moved = items.filter((i) => i.endpoint.pos)
  const minX = Math.min(left, ...moved.map((i) => i.x - 40))
  const maxX = Math.max(right, ...moved.map((i) => i.x + i.w + 40))
  const minY = Math.min(0, ...moved.map((i) => i.y - 30))
  const bottom = Math.max(device.height, ...items.map((i) => i.y + i.h + 30))
  return { items, bounds: { x: minX, y: minY, w: maxX - minX, h: bottom - minY } }
}

export const deviceBounds = (device: DeviceDef): Rect => ({ x: 0, y: 0, w: device.width, h: device.height })

/* --------------------------------------------------------------------------- *
 * Cable routing
 * --------------------------------------------------------------------------- */

export type CableRoute = {
  d: string
  /** Where the two ends touch down, for the end dots. */
  ends: [Pt, Pt]
  label: { x: number; y: number; anchor: 'start' | 'middle' | 'end' }
}

type End =
  | { type: 'chassis'; port: PortDef }
  | { type: 'unit'; item: EpItem; anchor: Pt; dir: 1 | -1; legacy: boolean }

/** Resolve a point id to where it is and which way a cable leaves it. */
export function endOf(device: DeviceDef, items: EpItem[], id: string): End | null {
  const chassis = device.ports.find((p) => p.id === id)
  if (chassis) return { type: 'chassis', port: chassis }
  const pt = parsePoint(id)
  const item = pt ? items.find((i) => i.endpoint.id === pt.unitId) : undefined
  if (!pt || !item) return null
  if (pt.portKey) {
    const port = item.ports.find((p) => p.id === id)
    return port ? { type: 'unit', item, anchor: port.anchor, dir: port.dir, legacy: false } : null
  }
  return { type: 'unit', item, anchor: item.inner, dir: item.left ? 1 : -1, legacy: true }
}

/** Where a cable attaches and which way it leaves, for drawing a cable still being dragged. */
export function anchorOfPoint(device: DeviceDef, items: EpItem[], id: string): { pt: Pt; dir: 1 | -1 } | null {
  const end = endOf(device, items, id)
  if (!end) return null
  if (end.type === 'chassis') return { pt: { x: end.port.x + end.port.w / 2, y: end.port.y }, dir: 1 }
  return { pt: end.anchor, dir: end.dir }
}

/** A polyline with each corner rounded off, so cables read as wires, not as a circuit diagram. */
function roundedPath(points: Pt[], radius = 8): string {
  const pts = points.filter((p, i) => i === 0 || p.x !== points[i - 1].x || p.y !== points[i - 1].y)
  if (pts.length < 3) return `M ${pts.map((p) => `${p.x} ${p.y}`).join(' L ')}`
  let d = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i - 1]
    const b = pts[i]
    const c = pts[i + 1]
    const lenIn = Math.hypot(b.x - a.x, b.y - a.y)
    const lenOut = Math.hypot(c.x - b.x, c.y - b.y)
    const r = Math.min(radius, lenIn / 2, lenOut / 2)
    const p1 = { x: b.x + ((a.x - b.x) / lenIn) * r, y: b.y + ((a.y - b.y) / lenIn) * r }
    const p2 = { x: b.x + ((c.x - b.x) / lenOut) * r, y: b.y + ((c.y - b.y) / lenOut) * r }
    d += ` L ${p1.x} ${p1.y} Q ${b.x} ${b.y} ${p2.x} ${p2.y}`
  }
  const last = pts[pts.length - 1]
  return `${d} L ${last.x} ${last.y}`
}

/** y of the gap just above the card a port sits in: a lane that touches nothing. */
function laneY(device: DeviceDef, port: PortDef): number {
  const cx = port.x + port.w / 2
  const cy = port.y + port.h / 2
  const frame = device.frames.find(
    (f) => cx >= f.x && cx <= f.x + f.w && cy >= f.y && cy <= f.y + f.h,
  )
  return frame ? frame.y - (frame.lane ?? 4) : port.y - 3
}

/** A smooth curve leaving each anchor sideways, like wires in a node editor. */
function curve(a: Pt, aDir: 1 | -1, b: Pt, bDir: 1 | -1) {
  const dx = Math.min(Math.max(Math.abs(b.x - a.x) * 0.5, 60), 320)
  const c1 = { x: a.x + dx * aDir, y: a.y }
  const c2 = { x: b.x + dx * bDir, y: b.y }
  return {
    d: `M ${a.x} ${a.y} C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${b.x} ${b.y}`,
    mid: { x: (a.x + 3 * c1.x + 3 * c2.x + b.x) / 8, y: (a.y + 3 * c1.y + 3 * c2.y + b.y) / 8 },
  }
}

/**
 * Route one cable.
 *  - unit port to unit port: a curve between the two port edges;
 *  - unit port to a chassis port: a curve ending on the top of the port;
 *  - plain (portless) box to a chassis port: out to a trunk beside the chassis,
 *    along the gap above the port's card and down onto it, so it never crosses
 *    another card's connectors. Middle columns are reached through the gutters
 *    via a highway above or below the chassis.
 * `k` staggers parallel cables so they don't sit on top of each other.
 */
export function routeCable(
  device: DeviceDef,
  items: EpItem[],
  cable: PanelCable,
  k: number,
): CableRoute | null {
  const a = endOf(device, items, cable.from)
  const b = endOf(device, items, cable.to)
  if (!a || !b) return null
  const j = k % 5
  const { gutters, top, bottom } = device.routing

  if (a.type === 'unit' && b.type === 'unit') {
    // Two plain boxes: whichever sides face each other.
    if (a.legacy && b.legacy) {
      const ea = a.item
      const eb = b.item
      const aLeftOfB = ea.x + ea.w / 2 <= eb.x + eb.w / 2
      const pa = aLeftOfB ? { x: ea.x + ea.w, y: ea.y + ea.h / 2 } : { x: ea.x, y: ea.y + ea.h / 2 }
      const pb = aLeftOfB ? { x: eb.x, y: eb.y + eb.h / 2 } : { x: eb.x + eb.w, y: eb.y + eb.h / 2 }
      const c = curve(pa, aLeftOfB ? 1 : -1, pb, aLeftOfB ? -1 : 1)
      return { d: c.d, ends: [pa, pb], label: { x: c.mid.x, y: c.mid.y - 6, anchor: 'middle' } }
    }
    const c = curve(a.anchor, a.dir, b.anchor, b.dir)
    return { d: c.d, ends: [a.anchor, b.anchor], label: { x: c.mid.x, y: c.mid.y - 6, anchor: 'middle' } }
  }

  if (a.type === 'unit' && b.type === 'chassis') return routeToChassis(device, a, b.port, j)
  if (b.type === 'unit' && a.type === 'chassis') return routeToChassis(device, b, a.port, j)

  if (a.type === 'chassis' && b.type === 'chassis') {
    // Chassis to itself (e.g. an output back into an input): over the top via the gutters.
    const pa = a.port
    const pb = b.port
    const la = laneY(device, pa) + (j - 2) * 0.5
    const lb = laneY(device, pb) + (j - 2) * 0.5
    const near = (p: PortDef) => {
      const cx = p.x + p.w / 2
      return gutters.length ? gutters.reduce((best, g) => (Math.abs(g - cx) < Math.abs(best - cx) ? g : best)) : -18
    }
    const ta = { x: pa.x + pa.w / 2, y: pa.y }
    const tb = { x: pb.x + pb.w / 2, y: pb.y }
    const useTop = Math.min(la, lb) <= device.height / 2
    const hy = (useTop ? top : bottom) + (j - 2) * 2.5
    const ga = near(pa) + (j - 2) * 2
    const gb = near(pb) + (j - 2) * 2
    return {
      d: roundedPath([ta, { x: ta.x, y: la }, { x: ga, y: la }, { x: ga, y: hy }, { x: gb, y: hy }, { x: gb, y: lb }, { x: tb.x, y: lb }, tb]),
      ends: [ta, tb],
      label: { x: (ga + gb) / 2, y: hy - 5, anchor: 'middle' },
    }
  }
  return null
}

function routeToChassis(
  device: DeviceDef,
  e: Extract<End, { type: 'unit' }>,
  p: PortDef,
  j: number,
): CableRoute {
  const { gutters, top, bottom } = device.routing
  const t = { x: p.x + p.w / 2, y: p.y }

  if (!e.legacy) {
    // A unit port to a chassis port: curve in from the side, land from above.
    const dx = Math.min(Math.max(Math.abs(t.x - e.anchor.x) * 0.5, 60), 320)
    const c1 = { x: e.anchor.x + dx * e.dir, y: e.anchor.y }
    const c2 = { x: t.x, y: t.y - Math.max(70, Math.abs(t.y - e.anchor.y) * 0.3) }
    return {
      d: `M ${e.anchor.x} ${e.anchor.y} C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${t.x} ${t.y}`,
      ends: [e.anchor, t],
      label: { x: e.anchor.x + e.dir * 10, y: e.anchor.y - 7, anchor: e.dir === 1 ? 'start' : 'end' },
    }
  }

  const lane = laneY(device, p) + (j - 2) * 0.5
  const col = gutters.filter((g) => g < t.x).length
  const isSource = e.item.left
  const trunk = isSource ? -18 - j * 7 : device.width + 18 + j * 7
  const start = e.item.inner
  const direct = isSource ? col === 0 : col === gutters.length
  const pts: Pt[] = [start, { x: trunk, y: start.y }]
  if (direct) {
    pts.push({ x: trunk, y: lane })
  } else {
    const hy = (lane <= device.height / 2 ? top : bottom) + (j - 2) * 2.5
    const gx = (isSource ? gutters[col - 1] : gutters[col]) + (j - 2) * 2
    pts.push({ x: trunk, y: hy }, { x: gx, y: hy }, { x: gx, y: lane })
  }
  pts.push({ x: t.x, y: lane }, t)
  return {
    d: roundedPath(pts),
    ends: [start, t],
    label: { x: start.x + (isSource ? 8 : -8), y: start.y - 7, anchor: isSource ? 'start' : 'end' },
  }
}

export const CABLE_COLORS = [
  '#38bdf8', '#34d399', '#fbbf24', '#a78bfa', '#fb7185', '#f472b6', '#2dd4bf', '#a3e635',
]
export const cableColor = (index: number) => CABLE_COLORS[index % CABLE_COLORS.length]

/** Human name for a point: "Unit name: PORT" for a unit port, the unit's name for a box. */
export function pointName(id: string, device: DeviceDef, endpoints: PanelEndpoint[]): string {
  const pt = parsePoint(id)
  if (pt) {
    const e = endpoints.find((x) => x.id === pt.unitId)
    if (!e) return 'Removed unit'
    const name = e.name || getUnitKind(e.kind).label
    if (!pt.portKey) return name
    const spec = unitPortSpecs(e.kind, e.model).find((s) => s.key === pt.portKey)
    return `${name}: ${spec?.label ?? pt.portKey}`
  }
  return device.ports.find((p) => p.id === id)?.label ?? 'Unknown port'
}
