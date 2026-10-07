import { getDevice, cardIdFor, getTemplate, type DeviceDef } from './devices'
import type { PanelAction, PanelCable, PanelEndpoint, PanelPart, PanelScenario, PanelStep } from '../types'

/**
 * Troubleshooting flows. A step can change the setup: swap two input cards
 * (cables travel with them), swap two units (the devices trade places, cables
 * stay), pull a cable out or plug one in. Everything here is derived from the
 * guide's data: nothing about the flow is stored beyond the steps themselves.
 */

export type FlowState = {
  device: DeviceDef | undefined
  endpoints: PanelEndpoint[]
  cables: PanelCable[]
  /** Cables pulled out by the last step, to show as ghosts. */
  ghosts: PanelCable[]
  /** Cables the last step plugged in. */
  fresh: Set<string>
}

const swapPrefix = (id: string, a: string, b: string) => {
  if (id.startsWith(`${a}:`)) return `${b}:${id.slice(a.length + 1)}`
  if (id.startsWith(`${b}:`)) return `${a}:${id.slice(b.length + 1)}`
  return id
}

/** The unit after applying every step in order to the guide's base setup. */
export function stateAfter(part: PanelPart, steps: PanelStep[]): FlowState {
  const template = getTemplate(part.deviceId)
  const cards: Record<string, string> = {}
  for (const slot of template?.slots ?? []) cards[slot.id] = cardIdFor(slot, part.cards)

  let cables = part.cables.map((c) => ({ ...c }))
  const endpoints = part.endpoints.map((e) => ({ ...e }))
  const ghosts: PanelCable[] = []
  const fresh = new Set<string>()

  steps.forEach((step, si) => {
    const last = si === steps.length - 1
    for (const act of step.actions) {
      if (act.type === 'swap-cards') {
        if (!(act.from in cards) || !(act.to in cards) || act.from === act.to) continue
        ;[cards[act.from], cards[act.to]] = [cards[act.to], cards[act.from]]
        cables = cables.map((c) => ({
          ...c,
          from: swapPrefix(c.from, act.from, act.to),
          to: swapPrefix(c.to, act.from, act.to),
        }))
      } else if (act.type === 'swap-units') {
        const a = endpoints.find((e) => e.id === act.a)
        const b = endpoints.find((e) => e.id === act.b)
        if (!a || !b || a === b) continue
        const [ea, eb] = [`ep:${a.id}`, `ep:${b.id}`]
        const swap = (id: string) => (id === ea ? eb : id === eb ? ea : id)
        cables = cables.map((c) => ({ ...c, from: swap(c.from), to: swap(c.to) }))
        const pos = a.pos
        a.pos = b.pos
        b.pos = pos
      } else if (act.type === 'unplug') {
        const gone = cables.find((c) => c.id === act.cableId)
        if (!gone) continue
        cables = cables.filter((c) => c !== gone)
        if (last) ghosts.push(gone)
      } else if (act.type === 'plug') {
        if (!act.from || !act.to || act.from === act.to) continue
        cables = [...cables.filter((c) => c.id !== act.cableId), { id: act.cableId, from: act.from, to: act.to, label: act.label }]
        if (last) fresh.add(act.cableId)
      }
    }
  })

  return { device: getDevice(part.deviceId, cards), endpoints, cables, ghosts, fresh }
}

/** Card swaps of one step, as slot pairs for the move arrows. */
export const stepMoves = (step: PanelStep | undefined): { from: string; to: string }[] =>
  (step?.actions ?? []).flatMap((a) => (a.type === 'swap-cards' ? [{ from: a.from, to: a.to }] : []))

/** Where each answer of a step leads; '' = a conclusion. Unknown ids count as conclusions. */
export const nextStep = (scenario: PanelScenario, from: PanelStep, next: string): PanelStep | undefined =>
  next ? scenario.steps.find((s) => s.id === next && s.id !== from.id) : undefined

export type { PanelAction }
