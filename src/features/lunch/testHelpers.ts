import type { Agent } from './types'

/** Test fixtures — not imported by the app. */
export function agent(name: string, fields: Partial<Omit<Agent, 'id' | 'name'>> = {}): Agent {
  return {
    id: name.toLowerCase(),
    name,
    languages: [],
    chat: false,
    earlyShift: false,
    available: true,
    yesterdayShift: null,
    ...fields,
  }
}

/** A small deterministic random source (mulberry32). */
export function seeded(seed: number): () => number {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
