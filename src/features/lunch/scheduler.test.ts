import { describe, expect, it } from 'vitest'
import { analyzeSchedule } from './coverage'
import { generateSchedule } from './scheduler'
import { agent, seeded } from './testHelpers'
import type { Agent } from './types'

const TEAM: Agent[] = [
  agent('Anna', { languages: ['Dutch', 'English'], chat: true }),
  agent('Bram', { languages: ['Dutch'], chat: true }),
  agent('Chloé', { languages: ['French', 'Italian'] }),
  agent('Dirk', { languages: ['French'], chat: true }),
  agent('Elena', { languages: ['Italian', 'Spanish'] }),
  agent('Felix', { languages: ['German', 'English'], chat: true }),
  agent('Greta', { languages: ['German'] }),
  agent('Hugo', { languages: ['Spanish', 'Dutch'], chat: true }),
  agent('Iris', { languages: ['English', 'French'] }),
  agent('Jan', { languages: ['Dutch', 'German'] }),
]

const sizes = (a: ReturnType<typeof generateSchedule>) => [a.shift1.length, a.shift2.length]
const run = (agents: Agent[], seed: number) => generateSchedule(agents, { rng: seeded(seed) })

describe('generateSchedule', () => {
  it('places every available agent exactly once and ignores the unavailable', () => {
    const team = [...TEAM, agent('Kim', { languages: ['Dutch'], available: false })]
    const result = run(team, 1)
    const placed = [...result.shift1, ...result.shift2]
    expect(placed.sort()).toEqual(TEAM.map((a) => a.id).sort())
    expect(placed).not.toContain('kim')
  })

  it('covers every language that has 2+ speakers in both shifts, for many random draws', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const result = run(TEAM, seed)
      expect(analyzeSchedule(TEAM, result).filter((w) => w.kind === 'uncovered')).toEqual([])
    }
  })

  it('counts every language an agent speaks, not just the first', () => {
    // Chloé is the only one who can give Italian a second speaker besides Elena.
    const team = [
      agent('A', { languages: ['French', 'Italian'] }),
      agent('B', { languages: ['French'] }),
      agent('C', { languages: ['Italian'] }),
      agent('D', { languages: ['English'] }),
    ]
    for (let seed = 1; seed <= 30; seed++) {
      expect(analyzeSchedule(team, run(team, seed)).filter((w) => w.kind === 'uncovered')).toEqual([])
    }
  })

  it('keeps the shifts and the chat agents even', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const result = run(TEAM, seed)
      const [a, b] = sizes(result)
      expect(Math.abs(a - b)).toBeLessThanOrEqual(0)
      const chat = (ids: string[]) => ids.filter((id) => TEAM.find((t) => t.id === id)!.chat).length
      expect(Math.abs(chat(result.shift1) - chat(result.shift2))).toBeLessThanOrEqual(1)
    }
  })

  it('spreads a language as evenly as the numbers allow', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const result = run(TEAM, seed)
      for (const language of ['Dutch', 'English', 'French', 'German', 'Italian', 'Spanish']) {
        const speakers = TEAM.filter((a) => a.languages.includes(language))
        const inFirst = speakers.filter((a) => result.shift1.includes(a.id)).length
        expect(Math.abs(inFirst - (speakers.length - inFirst))).toBeLessThanOrEqual(speakers.length % 2)
      }
    }
  })

  it('splits odd teams to within one', () => {
    const [a, b] = sizes(run(TEAM.slice(0, 7), 3))
    expect(Math.abs(a - b)).toBe(1)
  })

  it('handles empty and tiny rosters', () => {
    expect(run([], 1)).toEqual({ shift1: [], shift2: [] })
    const one = run([agent('Solo', { languages: ['Dutch'] })], 1)
    expect(one.shift1.length + one.shift2.length).toBe(1)
  })

  it('reports an impossible split rather than hiding it', () => {
    // Three languages in a triangle: no 2-colouring covers all of them.
    const team = [
      agent('X', { languages: ['Dutch', 'French'] }),
      agent('Y', { languages: ['Dutch', 'German'] }),
      agent('Z', { languages: ['French', 'German'] }),
    ]
    const result = run(team, 1)
    expect(result.shift1.length + result.shift2.length).toBe(3)
    expect(analyzeSchedule(team, result).some((w) => w.kind === 'uncovered')).toBe(true)
  })
})

describe('soft preferences', () => {
  it('lets early-shift agents lean towards Shift 1 without breaking balance', () => {
    const team = TEAM.map((a) => (['Anna', 'Chloé', 'Greta', 'Iris'].includes(a.name) ? { ...a, earlyShift: true } : a))
    let inFirst = 0
    const runs = 40
    for (let seed = 1; seed <= runs; seed++) {
      const result = run(team, seed)
      inFirst += team.filter((a) => a.earlyShift && result.shift1.includes(a.id)).length
    }
    // Chance would be 2 of 4 early agents; the lean must be clearly above it.
    expect(inFirst / runs).toBeGreaterThan(2.6)
  })

  it('moves most people off yesterday\'s shift, but not always everyone', () => {
    const team = TEAM.map((a, i) => ({ ...a, yesterdayShift: (i % 2 === 0 ? 1 : 2) as 1 | 2 }))
    const stayed: number[] = []
    for (let seed = 1; seed <= 60; seed++) {
      const result = run(team, seed)
      stayed.push(
        team.filter((a) => (a.yesterdayShift === 1 ? result.shift1 : result.shift2).includes(a.id)).length,
      )
    }
    const average = stayed.reduce((x, y) => x + y, 0) / stayed.length
    expect(average).toBeLessThan(team.length / 2 - 0.5) // clearly fewer stay than the 50% chance level
    expect(Math.max(...stayed)).toBeGreaterThan(0) // randomness: it does not flip everyone every time
    expect(new Set(stayed).size).toBeGreaterThan(1)
  })

  it('never lets a preference override coverage', () => {
    // Everyone is early and was in Shift 1 yesterday, yet each language still needs both shifts.
    const team = TEAM.map((a) => ({ ...a, earlyShift: true, yesterdayShift: 2 as const }))
    for (let seed = 1; seed <= 30; seed++) {
      expect(analyzeSchedule(team, run(team, seed)).filter((w) => w.kind === 'uncovered')).toEqual([])
    }
  })
})
