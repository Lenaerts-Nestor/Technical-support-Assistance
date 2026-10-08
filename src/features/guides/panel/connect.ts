import type { DeviceDef } from './devices'
import { epPointId, parsePoint, pointName } from './scene'
import { SIGNAL_LABEL, getUnitKind, specSide, unitPortSpecs, type PortDir, type Signal } from './units'
import type { PanelCable, PanelEndpoint } from '../types'

/**
 * Which ports may be cabled together, and which port to pick when a cable is
 * dropped on a unit without aiming at one. A cable needs the same signal at
 * both ends (HDMI to HDMI, LAN to LAN…), an output into an input, or a
 * two-way port to another two-way port. Chassis ports we have no signal for
 * stay permissive so older guides keep working.
 */

export type PointInfo = {
  id: string
  label: string
  signal?: Signal
  dir?: PortDir
  unitId?: string
}

export type Ctx = { device: DeviceDef; endpoints: PanelEndpoint[]; cables: PanelCable[] }

/** Signal and direction of a chassis connector, from the last part of its id. */
const CHASSIS_KEYS: Record<string, [Signal, PortDir]> = {
  'hdmi-out': ['hdmi', 'out'],
  'hdmi-in': ['hdmi', 'in'],
  hdmi: ['hdmi', 'out'],
  'dm-in': ['dm', 'in'],
  'dm-out': ['dm', 'out'],
  'poe-in': ['poe', 'in'],
  usb: ['usb', 'io'],
  'audio-l': ['audio', 'out'],
  'audio-r': ['audio', 'out'],
  'audio-out': ['audio', 'out'],
  'audio-in': ['audio', 'in'],
  'audio-in-l': ['audio', 'in'],
  'audio-in-r': ['audio', 'in'],
  'content-lan': ['lan', 'io'],
  lan: ['lan', 'io'],
  rs232: ['serial', 'io'],
  ir: ['ir', 'out'],
}

export function infoFor(id: string, ctx: Ctx): PointInfo | null {
  const label = pointName(id, ctx.device, ctx.endpoints)
  const pt = parsePoint(id)
  if (pt) {
    const unit = ctx.endpoints.find((e) => e.id === pt.unitId)
    if (!unit) return null
    if (!pt.portKey) return { id, label, unitId: unit.id }
    const spec = unitPortSpecs(unit.kind, unit.model).find((s) => s.key === pt.portKey)
    return spec ? { id, label, signal: spec.signal, dir: spec.dir, unitId: unit.id } : null
  }
  const port = ctx.device.ports.find((p) => p.id === id)
  if (!port) return null
  const key = id.includes(':') ? id.slice(id.indexOf(':') + 1) : id
  const known = CHASSIS_KEYS[key]
  return { id, label, signal: known?.[0], dir: known?.[1] }
}

const dirWord: Record<PortDir, string> = { in: 'inputs', out: 'outputs', io: 'two-way ports' }

export type Check = { ok: true } | { ok: false; reason: string }

/** Whether two ports can be cabled together, with a reason when not. */
export function checkConnection(a: PointInfo, b: PointInfo): Check {
  if (a.unitId && a.unitId === b.unitId) return { ok: false, reason: "Can't connect a unit to itself." }
  if (!a.signal || !b.signal || !a.dir || !b.dir) return { ok: true }
  if (a.signal !== b.signal) {
    return {
      ok: false,
      reason: `${SIGNAL_LABEL[a.signal]} can't go into a ${SIGNAL_LABEL[b.signal]} port (${a.label} → ${b.label}).`,
    }
  }
  const sameWay = (a.dir === 'in' && b.dir === 'in') || (a.dir === 'out' && b.dir === 'out')
  if (sameWay) return { ok: false, reason: `Two ${dirWord[a.dir]} can't be cabled together (${a.label} → ${b.label}).` }
  if ((a.dir === 'io') !== (b.dir === 'io')) {
    return { ok: false, reason: `${a.label} and ${b.label} don't match: one is two-way, the other one-way.` }
  }
  return { ok: true }
}

const cableCount = (id: string, cables: PanelCable[]) => cables.filter((c) => c.from === id || c.to === id).length

/** A port with a known signal takes one cable at a time. */
const taken = (info: PointInfo, ctx: Ctx) => !!info.signal && cableCount(info.id, ctx.cables) > 0

/**
 * `from` is only set when the drop changes where the cable starts: dragging out
 * of one of a switch's ports joins the switch itself (see `resolveSwitchLink`).
 */
export type Resolution =
  | { ok: true; to: string; from?: string }
  | { ok: false; reason: string; to: string | null }

/**
 * Network switches take links without a port. A unit's LAN cable only needs to
 * say "this goes through that switch": which of the eight ports it is plugged
 * into is rarely known or interesting, and picking one made every link look as
 * if it mattered. A link like that ends on the switch's box, drawn as a path.
 */
export const isSwitchUnit = (e: PanelEndpoint | undefined) => e?.kind === 'switch'

/** The switch a point id belongs to (its box, or one of its ports), if any. */
function switchOf(id: string, ctx: Ctx): PanelEndpoint | undefined {
  const pt = parsePoint(id)
  const unit = pt ? ctx.endpoints.find((e) => e.id === pt.unitId) : undefined
  return isSwitchUnit(unit) ? unit : undefined
}

/** What the switch box counts as when checking a cable against a unit's port: a two-way LAN connection. */
function hubInfo(sw: PanelEndpoint, ctx: Ctx): PointInfo {
  const id = epPointId(sw.id)
  return { id, label: pointName(id, ctx.device, ctx.endpoints), unitId: sw.id, signal: 'lan', dir: 'io' }
}

/**
 * A cable between a unit and a switch, resolved to the switch box instead of a
 * switch port. Returns null for every other pairing (switch to switch, chassis
 * to switch, anything without a switch), which keep their usual port-to-port rules.
 */
function resolveSwitchLink(from: PointInfo, drop: PointInfo, ctx: Ctx): Resolution | null {
  const swFrom = switchOf(from.id, ctx)
  const swDrop = switchOf(drop.id, ctx)
  if (!swFrom === !swDrop) return null
  const sw = (swFrom ?? swDrop)!
  const other = swFrom ? drop : from
  // Only units: a chassis port keeps cabling to a real switch port.
  if (!other.unitId) return null

  const hub = hubInfo(sw, ctx)
  // The unit side is either a specific port, or a box to find a free LAN port on.
  let unitSide: PointInfo | null = other
  const pt = parsePoint(other.id)
  const otherUnit = ctx.endpoints.find((e) => e.id === other.unitId)
  if (pt && !pt.portKey && otherUnit && unitPortSpecs(otherUnit.kind, otherUnit.model).length > 0) {
    unitSide = autoPort(otherUnit.id, hub, ctx)
    if (!unitSide) {
      return {
        ok: false,
        to: other.id,
        reason: `${otherUnit.name || getUnitKind(otherUnit.kind).label} has no free LAN port for ${hub.label}.`,
      }
    }
  }

  const check = checkConnection(unitSide, hub)
  if (!check.ok) return { ok: false, to: hub.id, reason: check.reason }
  if (ctx.cables.some((c) => (c.from === unitSide.id && c.to === hub.id) || (c.from === hub.id && c.to === unitSide.id))) {
    return { ok: false, to: hub.id, reason: `${unitSide.label} is already linked to ${hub.label}.` }
  }
  if (taken(unitSide, ctx)) return { ok: false, to: hub.id, reason: `${unitSide.label} already has a cable.` }

  // Keep the drag's own direction: from the unit to the switch, or from the switch out to the unit.
  return swFrom ? { ok: true, from: hub.id, to: unitSide.id } : { ok: true, to: hub.id }
}

/**
 * The cable that joins a freshly added unit to the point it was added from:
 * port to port as usual, except that anything between a unit and a switch
 * attaches to the switch box.
 */
export function cableToNewUnit(unit: PanelEndpoint, fromId: string, ctx: Ctx): { from: string; to: string } | null {
  const fromInfo = infoFor(fromId, ctx)
  if (!fromInfo) return null
  const fromSwitch = switchOf(fromId, ctx)
  if (fromSwitch && !isSwitchUnit(unit)) {
    return { from: epPointId(fromSwitch.id), to: firstPortFor(unit, hubInfo(fromSwitch, ctx)) }
  }
  if (isSwitchUnit(unit) && !fromSwitch && fromInfo.unitId) {
    return { from: fromId, to: epPointId(unit.id) }
  }
  return { from: fromId, to: firstPortFor(unit, fromInfo) }
}

/**
 * Work out where a cable dragged from `fromId` ends up when dropped on `dropId`:
 * a specific port (checked as is), or a unit box (the first free compatible port).
 */
export function resolveDrop(fromId: string, dropId: string, ctx: Ctx): Resolution {
  const from = infoFor(fromId, ctx)
  const drop = infoFor(dropId, ctx)
  if (!from || !drop || fromId === dropId) return { ok: false, to: null, reason: '' }

  const viaSwitch = resolveSwitchLink(from, drop, ctx)
  if (viaSwitch) return viaSwitch

  let target: PointInfo | null = drop
  const pt = parsePoint(dropId)
  const unit = pt ? ctx.endpoints.find((e) => e.id === pt.unitId) : undefined
  if (pt && !pt.portKey && unit && unitPortSpecs(unit.kind, unit.model).length > 0) {
    // Dropped on the box itself: find the right port on it.
    target = autoPort(unit.id, from, ctx)
    if (!target) {
      return {
        ok: false,
        to: dropId,
        reason: from.signal
          ? `${unit.name || getUnitKind(unit.kind).label} has no free ${SIGNAL_LABEL[from.signal]} port for ${from.label}.`
          : `${unit.name || getUnitKind(unit.kind).label} has no free port.`,
      }
    }
  }

  const check = checkConnection(from, target)
  if (!check.ok) return { ok: false, to: target.id, reason: check.reason }
  if (ctx.cables.some((c) => (c.from === from.id && c.to === target.id) || (c.from === target.id && c.to === from.id))) {
    return { ok: false, to: target.id, reason: 'These two are already cabled together.' }
  }
  if (taken(from, ctx)) return { ok: false, to: target.id, reason: `${from.label} already has a cable.` }
  if (taken(target, ctx)) return { ok: false, to: target.id, reason: `${target.label} already has a cable.` }
  return { ok: true, to: target.id }
}

/** The first free port on a unit that `from` can be cabled to, or null. */
export function autoPort(unitId: string, from: PointInfo, ctx: Ctx): PointInfo | null {
  const unit = ctx.endpoints.find((e) => e.id === unitId)
  if (!unit) return null
  const specs = unitPortSpecs(unit.kind, unit.model)
  // On a freestyle canvas, prefer the column of ports that faces the unit the cable comes from.
  const fromPos = from.unitId ? ctx.endpoints.find((e) => e.id === from.unitId)?.pos : undefined
  const facing = fromPos && unit.pos ? (fromPos.x >= unit.pos.x ? 'R' : 'L') : undefined
  const candidates = specs
    .map((s) => ({ s, info: infoFor(`ep:${unit.id}:${s.key}`, ctx) }))
    .filter((c): c is { s: typeof c.s; info: PointInfo } => !!c.info && checkConnection(from, c.info).ok)
    .sort((a, b) => Number(specSide(b.s) === facing) - Number(specSide(a.s) === facing))
    .map((c) => c.info)
  return candidates.find((i) => !taken(i, ctx)) ?? null
}

/** Whether a unit of this kind and model has any port `from` could be cabled to. */
export function kindAccepts(kindId: string, modelId: string | undefined, from: PointInfo): boolean {
  const probe: PanelEndpoint = { id: 'probe', side: 'source', kind: kindId, model: modelId, name: '', detail: '', info: [] }
  const specs = unitPortSpecs(probe.kind, probe.model)
  if (specs.length === 0) return true
  return specs.some((s) =>
    checkConnection(from, { id: `ep:probe:${s.key}`, label: s.label, signal: s.signal, dir: s.dir }).ok,
  )
}

/** The port id on a (new) unit that `from` would take, or the box id for a plain unit. */
export function firstPortFor(unit: PanelEndpoint, from: PointInfo): string {
  const specs = unitPortSpecs(unit.kind, unit.model)
  if (specs.length === 0) return `ep:${unit.id}`
  const hit = specs.find((s) =>
    checkConnection(from, { id: `ep:${unit.id}:${s.key}`, label: s.label, signal: s.signal, dir: s.dir }).ok,
  )
  return `ep:${unit.id}:${(hit ?? specs[0]).key}`
}
