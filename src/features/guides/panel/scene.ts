import { portCenter, type DeviceDef } from './devices'
import type { PanelCable, PanelEndpoint } from '../types'

/**
 * Geometry for the "scene" around a device: equipment boxes in a column on
 * each side (sources left, displays right) and the cables drawn to them.
 * Pure functions, no drawing, so the canvas and the diagram agree on bounds.
 */

export const EP_W = 220
export const EP_H = 54
const EP_GAP = 14
const EP_MARGIN = 80
/** Space reserved on each side of the device for the equipment columns. */
export const EXT = EP_W + EP_MARGIN + 20

export type Rect = { x: number; y: number; w: number; h: number }

export const epPointId = (endpointId: string) => `ep:${endpointId}`
export const isEpPoint = (id: string) => id.startsWith('ep:')

export function sceneBounds(device: DeviceDef, withEquipment: boolean): Rect {
  return withEquipment
    ? { x: -EXT, y: 0, w: device.width + EXT * 2, h: device.height }
    : { x: 0, y: 0, w: device.width, h: device.height }
}

export type EpItem = { endpoint: PanelEndpoint; x: number; y: number; w: number; h: number; anchor: { x: number; y: number } }

/**
 * Stack each column top to bottom, nudged toward the ports its cables touch so
 * lines run roughly level, then pushed apart so boxes never overlap.
 */
export function layoutEquipment(
  device: DeviceDef,
  endpoints: PanelEndpoint[],
  cables: PanelCable[],
): EpItem[] {
  const portY = new Map(device.ports.map((p) => [p.id, portCenter(p).y]))
  const items: EpItem[] = []

  for (const side of ['source', 'display'] as const) {
    const col = endpoints
      .filter((e) => e.side === side)
      .map((endpoint, order) => {
        const ys = cables
          .filter((c) => c.from === epPointId(endpoint.id) || c.to === epPointId(endpoint.id))
          .map((c) => portY.get(c.from === epPointId(endpoint.id) ? c.to : c.from))
          .filter((y): y is number => y !== undefined)
        const want = ys.length ? ys.reduce((a, b) => a + b, 0) / ys.length - EP_H / 2 : Infinity
        return { endpoint, order, want }
      })
      .sort((a, b) => a.want - b.want || a.order - b.order)

    const x = side === 'source' ? -EXT + 20 : device.width + EP_MARGIN
    let bottom = 40 - EP_GAP
    for (const { endpoint, want } of col) {
      const y = Math.max(Number.isFinite(want) ? want : 0, bottom + EP_GAP)
      bottom = y + EP_H
      items.push({
        endpoint,
        x,
        y,
        w: EP_W,
        h: EP_H,
        anchor: { x: side === 'source' ? x + EP_W : x, y: y + EP_H / 2 },
      })
    }
  }
  return items
}

/** Where a cable attaches: a chassis port's centre, or an equipment box's inner edge. */
export function pointLookup(device: DeviceDef, items: EpItem[]) {
  const ports = new Map(device.ports.map((p) => [p.id, portCenter(p)]))
  const eps = new Map(items.map((i) => [epPointId(i.endpoint.id), i.anchor]))
  return (id: string) => ports.get(id) ?? eps.get(id)
}

/** Cubic path leaving each end horizontally; also returns the midpoint for a label. */
export function cableGeometry(a: { x: number; y: number }, b: { x: number; y: number }) {
  const dx = Math.min(Math.max(Math.abs(b.x - a.x) * 0.45, 70), 420)
  const dir = b.x >= a.x ? 1 : -1
  const c1 = { x: a.x + dx * dir, y: a.y }
  const c2 = { x: b.x - dx * dir, y: b.y }
  return {
    d: `M ${a.x} ${a.y} C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${b.x} ${b.y}`,
    mid: { x: (a.x + 3 * c1.x + 3 * c2.x + b.x) / 8, y: (a.y + 3 * c1.y + 3 * c2.y + b.y) / 8 },
  }
}

export const CABLE_COLORS = [
  '#38bdf8', '#34d399', '#fbbf24', '#a78bfa', '#fb7185', '#f472b6', '#2dd4bf', '#a3e635',
]
export const cableColor = (index: number) => CABLE_COLORS[index % CABLE_COLORS.length]

/** Human name for a port or equipment id, for lists and detail panels. */
export function pointName(
  id: string,
  device: DeviceDef,
  endpoints: PanelEndpoint[],
): string {
  if (isEpPoint(id)) {
    const e = endpoints.find((x) => epPointId(x.id) === id)
    return e ? e.name || (e.side === 'source' ? 'Source' : 'Display') : 'Removed equipment'
  }
  return device.ports.find((p) => p.id === id)?.label ?? 'Unknown port'
}
