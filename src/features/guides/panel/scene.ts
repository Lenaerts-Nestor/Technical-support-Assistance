import type { DeviceDef, PortDef } from './devices'
import type { PanelCable, PanelEndpoint } from '../types'

/**
 * Geometry for the "scene" around a device: equipment boxes in columns on each
 * side (sources left, displays right, one extra column per hop of a signal
 * path) and the cables between everything. Pure functions, no drawing, so the
 * canvas and the diagram agree on bounds.
 */

export const EP_W = 220
const EP_BASE_H = 54
const EP_LINE_H = 13
const EP_GAP = 14
/** Between a column and the unit, or between two columns: room for cables. */
const EP_MARGIN = 80
const COL_GAP = 70
const MAX_INFO_LINES = 3

export type Rect = { x: number; y: number; w: number; h: number }
export type Pt = { x: number; y: number }

export const epPointId = (endpointId: string) => `ep:${endpointId}`
export const isEpPoint = (id: string) => id.startsWith('ep:')

export type EpItem = {
  endpoint: PanelEndpoint
  x: number
  y: number
  w: number
  h: number
  /** Hops away from the unit: 0 touches it, 1 feeds a depth-0 box, and so on. */
  depth: number
  /** Edge facing the unit, and the edge facing away from it. */
  inner: Pt
  outer: Pt
  lines: string[]
}

export type Scene = { items: EpItem[]; bounds: Rect }

const infoLines = (e: PanelEndpoint) =>
  e.info
    .filter((i) => i.key.trim() || i.value.trim())
    .slice(0, MAX_INFO_LINES)
    .map((i) => (i.key.trim() ? `${i.key.trim()}: ${i.value.trim()}` : i.value.trim()))

const portCy = (p: PortDef) => p.y + p.h / 2

/**
 * Stack each column top to bottom, nudged toward whatever its cables touch so
 * lines run roughly level, then pushed apart so boxes never overlap.
 */
export function layoutScene(
  device: DeviceDef,
  endpoints: PanelEndpoint[],
  cables: PanelCable[],
): Scene {
  const ports = new Map(device.ports.map((p) => [p.id, p]))
  const byId = new Map(endpoints.map((e) => [epPointId(e.id), e]))

  // Hop distance from the unit: endpoints cabled to a port are 0, their neighbours 1, …
  const depth = new Map<string, number>()
  const queue: string[] = []
  for (const c of cables) {
    for (const [a, b] of [[c.from, c.to], [c.to, c.from]]) {
      if (byId.has(a) && ports.has(b) && !depth.has(a)) {
        depth.set(a, 0)
        queue.push(a)
      }
    }
  }
  for (let i = 0; i < queue.length; i++) {
    const cur = queue[i]
    for (const c of cables) {
      const other = c.from === cur ? c.to : c.to === cur ? c.from : null
      if (other && byId.has(other) && !depth.has(other)) {
        depth.set(other, (depth.get(cur) ?? 0) + 1)
        queue.push(other)
      }
    }
  }
  for (const id of byId.keys()) if (!depth.has(id)) depth.set(id, 0)

  const heightOf = (e: PanelEndpoint) => EP_BASE_H + infoLines(e).length * EP_LINE_H
  const maxDepth = { source: 0, display: 0 }
  for (const [id, d] of depth) {
    const side = byId.get(id)!.side
    maxDepth[side] = Math.max(maxDepth[side], d)
  }

  const colX = (side: 'source' | 'display', d: number) =>
    side === 'source'
      ? -(EP_MARGIN + EP_W + d * (EP_W + COL_GAP))
      : device.width + EP_MARGIN + d * (EP_W + COL_GAP)

  const placed = new Map<string, EpItem>()
  const yOf = (id: string): number | undefined => {
    const port = ports.get(id)
    if (port) return portCy(port)
    const it = placed.get(id)
    return it ? it.y + it.h / 2 : undefined
  }

  for (const side of ['source', 'display'] as const) {
    for (let d = 0; d <= maxDepth[side]; d++) {
      const col = endpoints
        .filter((e) => e.side === side && depth.get(epPointId(e.id)) === d)
        .map((endpoint, order) => {
          const me = epPointId(endpoint.id)
          const ys = cables
            .filter((c) => c.from === me || c.to === me)
            .map((c) => yOf(c.from === me ? c.to : c.from))
            .filter((y): y is number => y !== undefined)
          const want = ys.length ? ys.reduce((a, b) => a + b, 0) / ys.length : Infinity
          return { endpoint, order, want }
        })
        .sort((a, b) => a.want - b.want || a.order - b.order)

      const x = colX(side, d)
      let bottom = 40 - EP_GAP
      for (const { endpoint, want } of col) {
        const h = heightOf(endpoint)
        const y = Math.max(Number.isFinite(want) ? want - h / 2 : 0, bottom + EP_GAP)
        bottom = y + h
        const left = { x, y: y + h / 2 }
        const right = { x: x + EP_W, y: y + h / 2 }
        placed.set(epPointId(endpoint.id), {
          endpoint,
          x,
          y,
          w: EP_W,
          h,
          depth: d,
          inner: side === 'source' ? right : left,
          outer: side === 'source' ? left : right,
          lines: infoLines(endpoint),
        })
      }
    }
  }

  const items = [...placed.values()]
  const hasSide = (side: 'source' | 'display') => endpoints.some((e) => e.side === side)
  const left = hasSide('source') ? -(EP_MARGIN + EP_W + maxDepth.source * (EP_W + COL_GAP)) - 20 : 0
  const right = hasSide('display')
    ? device.width + EP_MARGIN + EP_W + maxDepth.display * (EP_W + COL_GAP) + 20
    : device.width
  const bottom = Math.max(device.height, ...items.map((i) => i.y + i.h + 30))
  return { items, bounds: { x: left, y: 0, w: right - left, h: bottom } }
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

/**
 * Route one cable. Equipment to a port runs out to a trunk beside the unit,
 * along the gap above the port's card, then drops onto the port; ports in the
 * middle columns get there through the vertical gutters via a highway above or
 * below the unit, so a cable never crosses another card's connectors.
 * `k` staggers parallel cables so they don't sit on top of each other.
 */
export function routeCable(
  device: DeviceDef,
  items: EpItem[],
  cable: PanelCable,
  k: number,
): CableRoute | null {
  const ports = new Map(device.ports.map((p) => [p.id, p]))
  const eps = new Map(items.map((i) => [epPointId(i.endpoint.id), i]))
  const j = k % 5
  const { gutters, top, bottom } = device.routing

  const pa = ports.get(cable.from)
  const pb = ports.get(cable.to)
  const ea = eps.get(cable.from)
  const eb = eps.get(cable.to)

  // Equipment to equipment: a plain curve between the facing edges.
  if (ea && eb) {
    const [near, far] = ea.depth <= eb.depth ? [ea, eb] : [eb, ea]
    const a = far.inner
    const b = ea.depth === eb.depth ? near.inner : near.outer
    const dx = Math.max(Math.abs(b.x - a.x) * 0.5, 30)
    const dir = b.x >= a.x ? 1 : -1
    return {
      d: `M ${a.x} ${a.y} C ${a.x + dx * dir} ${a.y} ${b.x - dx * dir} ${b.y} ${b.x} ${b.y}`,
      ends: [a, b],
      label: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 - 6, anchor: 'middle' },
    }
  }

  const portTop = (p: PortDef): Pt => ({ x: p.x + p.w / 2, y: p.y })
  const column = (p: PortDef) => gutters.filter((g) => g < p.x + p.w / 2).length
  const highwayFor = (lane: number) => {
    const useTop = lane <= device.height / 2
    return useTop ? top + (j - 2) * 2.5 : bottom + (j - 2) * 2.5
  }

  if ((ea && pb) || (eb && pa)) {
    const e = (ea ?? eb)!
    const p = (pb ?? pa)!
    const lane = laneY(device, p) + (j - 2) * 0.5
    const t = portTop(p)
    const col = column(p)
    const isSource = e.endpoint.side === 'source'
    const trunk = isSource ? -18 - j * 7 : device.width + 18 + j * 7
    const start = e.inner
    const direct = isSource ? col === 0 : col === gutters.length
    const pts: Pt[] = [start, { x: trunk, y: start.y }]
    if (direct) {
      pts.push({ x: trunk, y: lane })
    } else {
      const hy = highwayFor(lane)
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

  if (pa && pb) {
    // Unit to itself (e.g. an output back into an input): over the top via the gutters.
    const la = laneY(device, pa) + (j - 2) * 0.5
    const lb = laneY(device, pb) + (j - 2) * 0.5
    const near = (p: PortDef) => {
      const cx = p.x + p.w / 2
      return gutters.length ? gutters.reduce((best, g) => (Math.abs(g - cx) < Math.abs(best - cx) ? g : best)) : -18
    }
    const ta = portTop(pa)
    const tb = portTop(pb)
    const hy = highwayFor(Math.min(la, lb))
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

export const CABLE_COLORS = [
  '#38bdf8', '#34d399', '#fbbf24', '#a78bfa', '#fb7185', '#f472b6', '#2dd4bf', '#a3e635',
]
export const cableColor = (index: number) => CABLE_COLORS[index % CABLE_COLORS.length]

/** Human name for a port or equipment id, for lists and detail panels. */
export function pointName(id: string, device: DeviceDef, endpoints: PanelEndpoint[]): string {
  if (isEpPoint(id)) {
    const e = endpoints.find((x) => epPointId(x.id) === id)
    return e ? e.name || (e.side === 'source' ? 'Source' : 'Display') : 'Removed equipment'
  }
  return device.ports.find((p) => p.id === id)?.label ?? 'Unknown port'
}
