import { TEMPLATE_PLACEHOLDERS } from './casesData'
import type { FlaggedMatch } from './types'

/**
 * Fill-in-the-blanks a template leaves in the draft, which must be replaced or
 * deleted by hand before the text can be copied: the exact phrases in
 * `TEMPLATE_PLACEHOLDERS` (e.g. "[duplicate case number]"), and any run of five
 * or more "#" ("#####" in Associate Account, "######" in NPF). Merge fields such
 * as {!Contact.FirstName} are not placeholders — the destination fills those in.
 * There is deliberately no "remove all": each one needs a real value.
 */
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const PLACEHOLDER_RE = new RegExp(
  [...TEMPLATE_PLACEHOLDERS.map(escape), '#{5,}'].join('|'),
  'gi',
)

export function findPlaceholders(text: string): FlaggedMatch[] {
  const matches: FlaggedMatch[] = []
  for (const m of text.matchAll(PLACEHOLDER_RE)) {
    matches.push({ text: m[0], start: m.index, end: m.index + m[0].length })
  }
  return matches
}
