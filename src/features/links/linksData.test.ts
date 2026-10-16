import { describe, expect, it } from 'vitest'
import { moveSection } from './linksData'
import type { LinkSection } from './types'

const sec = (id: string): LinkSection => ({ id, title: id, items: [] })
const ids = (list: LinkSection[]) => list.map((s) => s.id)
const list = [sec('a'), sec('b'), sec('c'), sec('d')]

describe('moveSection', () => {
  it('moves a section later', () => {
    expect(ids(moveSection(list, 'a', 2))).toEqual(['b', 'c', 'a', 'd'])
  })

  it('moves a section earlier', () => {
    expect(ids(moveSection(list, 'd', 1))).toEqual(['a', 'd', 'b', 'c'])
  })

  it('clamps an out-of-range target', () => {
    expect(ids(moveSection(list, 'b', 99))).toEqual(['a', 'c', 'd', 'b'])
    expect(ids(moveSection(list, 'c', -5))).toEqual(['c', 'a', 'b', 'd'])
  })

  it('returns the same list for an unknown id or a no-op move', () => {
    expect(moveSection(list, 'zzz', 1)).toBe(list)
    expect(moveSection(list, 'b', 1)).toBe(list)
  })

  it('does not mutate the input', () => {
    moveSection(list, 'a', 3)
    expect(ids(list)).toEqual(['a', 'b', 'c', 'd'])
  })
})
