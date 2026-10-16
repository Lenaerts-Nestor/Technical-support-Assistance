import type { FlaggedMatch } from './types'

/**
 * A fill-in-the-blank left in the draft by a template: "[duplicate case number]",
 * "[primary case number]". Any square-bracketed run that holds a letter counts,
 * so "[1]" is left alone. They have to be replaced or deleted by hand — there is
 * deliberately no "remove all", because each one needs a real value.
 */
const PLACEHOLDER_RE = /\[[^[\]\n]*[\p{L}][^[\]\n]*\]/gu

export function findPlaceholders(text: string): FlaggedMatch[] {
  const matches: FlaggedMatch[] = []
  for (const m of text.matchAll(PLACEHOLDER_RE)) {
    matches.push({ text: m[0], start: m.index, end: m.index + m[0].length })
  }
  return matches
}
