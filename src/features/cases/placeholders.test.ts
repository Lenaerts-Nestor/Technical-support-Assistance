import { describe, expect, it } from 'vitest'
import { findPlaceholders } from './placeholders'

describe('findPlaceholders', () => {
  it('finds every bracketed placeholder with its position', () => {
    const text = 'case [duplicate case number] is a duplicate of [primary case number].'
    const found = findPlaceholders(text)
    expect(found.map((m) => m.text)).toEqual(['[duplicate case number]', '[primary case number]'])
    expect(text.slice(found[0].start, found[0].end)).toBe('[duplicate case number]')
  })

  it('ignores brackets without letters and unbalanced ones', () => {
    expect(findPlaceholders('see [1] and [ ] and [open')).toEqual([])
  })

  it('does not span lines', () => {
    expect(findPlaceholders('[first\nsecond]')).toEqual([])
  })
})
