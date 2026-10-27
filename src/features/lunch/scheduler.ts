import type { Agent } from './types'

/**
 * The lunch schedule generator. Pure logic — no React, no storage, no DOM — so it
 * can be tested and tuned on its own.
 *
 * It scores every possible split with a cost (lower is better) and searches for a
 * cheap one. The weights below encode the priority order, each tier far above the
 * one beneath it:
 *
 *   a) a language with 2+ speakers missing from a shift   UNCOVERED_LANGUAGE
 *   c) a language spread unevenly over the shifts         LANGUAGE_BALANCE   (per head of imbalance)
 *   d) the shifts differing in size / in chat agents      SIZE_BALANCE, CHAT_BALANCE
 *   e) an early-shift agent landing in Shift 2            EARLY_SHIFT_IN_2   (soft)
 *   f) staying on yesterday's shift                       SAME_AS_YESTERDAY  (soft, every agent, every run)
 *
 * Rule b) (a lone speaker goes anywhere) needs no weight: a language with one
 * speaker cannot be covered or unbalanced, so it never costs anything. Imbalance is
 * counted beyond what the numbers force — 3 speakers can only split 2/1, and that
 * is not penalised.
 *
 * Keep the gaps between tiers wide: a single soft preference must stay below one unit
 * of balance, or one agent's wish could beat a rule. Together the preferences may add
 * up over a big team, which is the point — everybody swapping sides is a valid way to
 * keep balance and language cover, so it wins whenever the hard rules allow it.
 */
export const WEIGHTS = {
  UNCOVERED_LANGUAGE: 10_000,
  LANGUAGE_BALANCE: 100,
  SIZE_BALANCE: 80,
  CHAT_BALANCE: 80,
  EARLY_SHIFT_IN_2: 60,
  SAME_AS_YESTERDAY: 40,
}

/** Random per-agent noise added to the soft preferences, so equal splits come out differently each time. */
export const TIE_BREAK_NOISE = 1

/** Independent random starting points tried; the cheapest result wins. */
const RESTARTS = 40

export type Assignment = { shift1: string[]; shift2: string[] }

type Options = {
  /** Source of randomness in [0, 1). Pass a seeded one for repeatable results. */
  rng?: () => number
}

/** Splits the available agents over the two shifts. Agents who are not available are ignored. */
export function generateSchedule(agents: Agent[], { rng = Math.random }: Options = {}): Assignment {
  const pool = agents.filter((a) => a.available)
  const n = pool.length
  if (n === 0) return { shift1: [], shift2: [] }

  // Index every language that appears, so counts can live in plain arrays.
  const languageIndex = new Map<string, number>()
  for (const agent of pool) for (const l of agent.languages) if (!languageIndex.has(l)) languageIndex.set(l, languageIndex.size)
  const agentLanguages = pool.map((a) => [...new Set(a.languages)].map((l) => languageIndex.get(l)!))
  const speakers = new Array<number>(languageIndex.size).fill(0)
  for (const ls of agentLanguages) for (const l of ls) speakers[l]++
  const chatTotal = pool.filter((a) => a.chat).length

  // Soft preferences: penalty[i][s] is what agent i costs when placed in shift s (0 = Shift 1).
  const penalty = pool.map((a) => {
    return [0, 1].map(
      (s) =>
        (a.earlyShift && s === 1 ? WEIGHTS.EARLY_SHIFT_IN_2 : 0) +
        (a.yesterdayShift === s + 1 ? WEIGHTS.SAME_AS_YESTERDAY : 0) +
        rng() * TIE_BREAK_NOISE,
    )
  })

  const shift = new Array<number>(n).fill(0)
  const size = [0, 0]
  const chat = [0, 0]
  const count = speakers.map(() => [0, 0])
  let preference = 0

  const place = (i: number, s: number, sign: 1 | -1) => {
    size[s] += sign
    if (pool[i].chat) chat[s] += sign
    for (const l of agentLanguages[i]) count[l][s] += sign
    preference += sign * penalty[i][s]
  }
  const flip = (i: number) => {
    const from = shift[i]
    place(i, from, -1)
    shift[i] = 1 - from
    place(i, shift[i], 1)
  }

  const cost = () => {
    let c = preference
    for (let l = 0; l < speakers.length; l++) {
      if (speakers[l] < 2) continue
      const [a, b] = count[l]
      if (a === 0 || b === 0) c += WEIGHTS.UNCOVERED_LANGUAGE
      c += WEIGHTS.LANGUAGE_BALANCE * (Math.abs(a - b) - (speakers[l] % 2))
    }
    c += WEIGHTS.SIZE_BALANCE * (Math.abs(size[0] - size[1]) - (n % 2))
    c += WEIGHTS.CHAT_BALANCE * (Math.abs(chat[0] - chat[1]) - (chatTotal % 2))
    return c
  }

  const shuffled = (): number[] => {
    const order = Array.from({ length: n }, (_, i) => i)
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1))
      ;[order[i], order[j]] = [order[j], order[i]]
    }
    return order
  }

  /** Greedy descent: keep applying single moves and pair swaps while one lowers the cost. */
  const descend = () => {
    let current = cost()
    for (let improved = true; improved; ) {
      improved = false
      const order = shuffled()
      for (const i of order) {
        flip(i)
        const moved = cost()
        if (moved < current) {
          current = moved
          improved = true
          continue
        }
        flip(i)
      }
      for (const i of order) {
        for (const j of order) {
          if (shift[i] !== 0 || shift[j] !== 1) continue
          flip(i)
          flip(j)
          const swapped = cost()
          if (swapped < current) {
            current = swapped
            improved = true
            break
          }
          flip(j)
          flip(i)
        }
      }
    }
    return current
  }

  let best: number[] = []
  let bestCost = Infinity
  for (let r = 0; r < RESTARTS; r++) {
    // Start from a random split with equal sizes; the search refines it from there.
    // The first start is yesterday turned around (everybody on the other shift), which
    // is usually already balanced and covered, so the search only has to fix the edges.
    const order = shuffled()
    const half = Math.floor(n / 2) + (n % 2 && rng() < 0.5 ? 1 : 0)
    size.fill(0)
    chat.fill(0)
    count.forEach((c) => c.fill(0))
    preference = 0
    if (r === 0) {
      const start = new Array<number>(n).fill(-1)
      const filled = [0, 0]
      for (const i of order) {
        const y = pool[i].yesterdayShift
        if (y) {
          start[i] = y === 1 ? 1 : 0
          filled[start[i]]++
        }
      }
      for (const i of order) {
        if (start[i] >= 0) continue
        start[i] = filled[0] <= filled[1] ? 0 : 1
        filled[start[i]]++
      }
      start.forEach((s, i) => {
        shift[i] = s
        place(i, s, 1)
      })
    } else {
      order.forEach((i, k) => {
        shift[i] = k < half ? 0 : 1
        place(i, shift[i], 1)
      })
    }
    const finished = descend()
    if (finished < bestCost) {
      bestCost = finished
      best = [...shift]
    }
  }

  const byName = (a: Agent, b: Agent) => a.name.localeCompare(b.name)
  const ids = (s: number) =>
    pool
      .filter((_, i) => best[i] === s)
      .sort(byName)
      .map((a) => a.id)
  return { shift1: ids(0), shift2: ids(1) }
}
