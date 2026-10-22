import { describe, expect, it } from 'vitest'
import { analyzeSchedule, applyMove, coverageLost } from './coverage'
import { agent } from './testHelpers'

const agents = [
  agent('Anna', { languages: ['Dutch'] }),
  agent('Bram', { languages: ['Dutch'] }),
  agent('Chloé', { languages: ['French'] }),
  agent('Dirk', { languages: ['French', 'German'] }),
  agent('Eva', { languages: ['German'] }),
  agent('Finn', { languages: ['Italian'] }),
  agent('Gus', { languages: ['Dutch', 'French'], available: false }),
]
const schedule = { shift1: ['anna', 'chloé', 'dirk'], shift2: ['bram', 'eva', 'finn'] }

describe('analyzeSchedule', () => {
  it('warns about a language with one speaker and about one with none', () => {
    const warnings = analyzeSchedule(agents, schedule)
    const find = (kind: string, language: string) => warnings.find((w) => w.kind === kind && w.language === language)
    expect(find('single', 'Italian')?.message).toContain('Finn')
    expect(find('none', 'Spanish')).toBeDefined()
    expect(find('none', 'English')).toBeDefined()
  })

  it('warns about a language with several speakers missing from a shift', () => {
    const warnings = analyzeSchedule(agents, schedule)
    // French is Chloé + Dirk, both in Shift 1.
    const french = warnings.filter((w) => w.kind === 'uncovered' && w.language === 'French')
    expect(french).toHaveLength(1)
    expect(french[0]).toMatchObject({ shift: 2, message: 'No French speaker in Shift 2' })
  })

  it('does not count unavailable or unscheduled agents', () => {
    // Gus speaks Dutch and French but is out, so Dutch still has two speakers (one per shift).
    const dutch = analyzeSchedule(agents, schedule).filter((w) => w.language === 'Dutch')
    expect(dutch).toEqual([])
  })
})

describe('swaps', () => {
  it('moves one agent, or swaps two across the shifts', () => {
    expect(applyMove(schedule, 'anna')).toEqual({
      shift1: ['chloé', 'dirk'],
      shift2: ['bram', 'eva', 'finn', 'anna'],
    })
    const swapped = applyMove(schedule, 'anna', 'bram')
    expect(swapped.shift1.sort()).toEqual(['bram', 'chloé', 'dirk'])
    expect(swapped.shift2.sort()).toEqual(['anna', 'eva', 'finn'])
  })

  it('is safe to swap two speakers of the same language', () => {
    expect(coverageLost(agents, schedule, 'anna', 'bram')).toEqual([])
  })

  it('flags a swap that empties a language from a shift', () => {
    // Anna is Shift 1's only Dutch speaker; Eva has no Dutch. Eva also joins Dirk, Shift 2's only other German.
    const lost = coverageLost(agents, schedule, 'anna', 'eva')
    expect(lost.map((w) => w.message).sort()).toEqual(['No Dutch speaker in Shift 1', 'No German speaker in Shift 2'])
  })

  it('does not blame a swap for a gap that was already there', () => {
    // French was already uncovered in Shift 2; swapping Anna and Bram changes nothing about it.
    expect(coverageLost(agents, schedule, 'anna', 'bram')).toEqual([])
    // Moving Eva out of Shift 2 leaves German uncovered there (Dirk is in Shift 1).
    expect(coverageLost(agents, schedule, 'eva').map((w) => w.message)).toEqual(['No German speaker in Shift 2'])
  })
})
