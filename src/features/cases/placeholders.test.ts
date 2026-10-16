import { describe, expect, it } from 'vitest'
import { findPlaceholders } from './placeholders'

const texts = (s: string) => findPlaceholders(s).map((m) => m.text)

describe('findPlaceholders', () => {
  it('finds the duplicate-case placeholders with their positions', () => {
    const text = 'case [duplicate case number] is a duplicate of [primary case number].'
    const found = findPlaceholders(text)
    expect(found.map((m) => m.text)).toEqual(['[duplicate case number]', '[primary case number]'])
    expect(text.slice(found[0].start, found[0].end)).toBe('[duplicate case number]')
  })

  it('finds each # run, whatever its length from five up', () => {
    expect(texts('email ##### and RMA ###### / SN ######')).toEqual(['#####', '######', '######'])
  })

  it('accepts merge fields and other brackets or hashes', () => {
    expect(texts('Hi {!Contact.FirstName}, case {!Case.CaseNumber}, see [1], [anything else], #tag, ####')).toEqual([])
  })
})
