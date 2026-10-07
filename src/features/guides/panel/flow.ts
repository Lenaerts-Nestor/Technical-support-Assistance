import { getDevice, cardIdFor, getTemplate, type DeviceDef } from './devices'
import type { PanelCable, PanelPart, PanelScenario, PanelStep } from '../types'

/**
 * Troubleshooting flows. A step may swap the cards in two input slots; the
 * cables on those cards travel with them, so the diagram always shows the
 * wiring as it would be after the swap. Everything here is derived from the
 * guide's data: nothing about the flow is stored beyond the steps themselves.
 */

export type Move = { from: string; to: string }

export type FlowState = {
  device: DeviceDef | undefined
  /** Cables with their chassis ends moved to wherever the card now sits; hidden if it has no such port. */
  cables: PanelCable[]
}

/** The state of the unit after applying `moves` in order to the guide's base layout. */
export function stateAfter(part: PanelPart, moves: Move[]): FlowState {
  const template = getTemplate(part.deviceId)
  const cards: Record<string, string> = {}
  // Slot each originally-placed card now sits in.
  const where = new Map<string, string>()
  for (const slot of template?.slots ?? []) {
    cards[slot.id] = cardIdFor(slot, part.cards)
    where.set(slot.id, slot.id)
  }

  for (const m of moves) {
    if (!(m.from in cards) || !(m.to in cards) || m.from === m.to) continue
    ;[cards[m.from], cards[m.to]] = [cards[m.to], cards[m.from]]
    for (const [orig, cur] of where) {
      if (cur === m.from) where.set(orig, m.to)
      else if (cur === m.to) where.set(orig, m.from)
    }
  }

  const device = getDevice(part.deviceId, cards)
  const known = new Set(device?.ports.map((p) => p.id))
  const remap = (id: string): string | null => {
    const i = id.indexOf(':')
    if (i < 0 || id.startsWith('ep:')) return id
    const slot = id.slice(0, i)
    const now = where.get(slot)
    if (!now) return id
    const next = `${now}:${id.slice(i + 1)}`
    return known.has(next) ? next : null
  }

  const cables: PanelCable[] = []
  for (const c of part.cables) {
    const from = remap(c.from)
    const to = remap(c.to)
    if (from && to) cables.push({ ...c, from, to })
  }
  return { device, cables }
}

export const stepMoves = (steps: PanelStep[]): Move[] =>
  steps.flatMap((s) => (s.move ? [s.move] : []))

/** Where each answer of a step leads; '' = a conclusion. Unknown ids count as conclusions. */
export const nextStep = (scenario: PanelScenario, from: PanelStep, next: string): PanelStep | undefined =>
  next ? scenario.steps.find((s) => s.id === next && s.id !== from.id) : undefined
