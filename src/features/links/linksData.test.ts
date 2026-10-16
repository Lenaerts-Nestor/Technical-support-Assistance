import { describe, expect, it } from 'vitest'
import { moveSection, packSections } from './linksData'
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

describe('packSections', () => {
  const make = (id: string, n: number): LinkSection => ({
    id,
    title: id,
    items: Array.from({ length: n }, (_, i) => ({
      id: `${id}-${i}`,
      kind: 'link' as const,
      label: `l${i}`,
      url: 'https://example.com',
    })),
  })

  it('gives large sections their own cell, biggest first, and stacks small ones after', () => {
    const cells = packSections([make('tiny', 1), make('big', 6), make('mid', 3), make('huge', 9), make('two', 2)])
    expect(cells.map((cell) => cell.map((s) => s.id))).toEqual([['huge'], ['big'], ['mid', 'two', 'tiny']])
  })

  it('starts a new stack when one fills up and keeps equal sizes in saved order', () => {
    const cells = packSections([make('a', 3), make('b', 3), make('c', 3)])
    expect(cells.map((cell) => cell.map((s) => s.id))).toEqual([['a', 'b'], ['c']])
  })

  it('returns nothing for no sections', () => {
    expect(packSections([])).toEqual([])
  })
})
