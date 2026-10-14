import type { Snippet } from './types'

export type SnippetsMergeResult = {
  snippets: Snippet[]
  added: number
  /** Texts already present (same language, same wording). */
  skipped: number
  /** Added under a "(2)" label because the button name was taken by a different text. */
  renamed: number
}

const normalizeText = (text: string) => text.replace(/\r\n/g, '\n').trim()
const sameLabel = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

/**
 * Add the texts of `incoming` that `current` does not have. A text counts as a
 * duplicate when the language and the wording match, whatever its button label,
 * so importing the same export twice changes nothing. A text whose label is
 * taken by a *different* wording is kept under "Label (2)" so both stay
 * visible on the Cases page, which only shows labels. Fresh ids throughout.
 */
export function mergeSnippets(current: Snippet[], incoming: Snippet[]): SnippetsMergeResult {
  const snippets = [...current]
  let added = 0
  let skipped = 0
  let renamed = 0

  for (const item of incoming) {
    const text = normalizeText(item.text)
    if (!text) continue
    if (snippets.some((s) => s.language === item.language && normalizeText(s.text) === text)) {
      skipped++
      continue
    }
    let label = item.label.trim() || 'Text'
    if (snippets.some((s) => s.language === item.language && sameLabel(s.label, label))) {
      let n = 2
      while (snippets.some((s) => s.language === item.language && sameLabel(s.label, `${label} (${n})`))) n++
      label = `${label} (${n})`
      renamed++
    }
    snippets.push({ id: crypto.randomUUID(), label, text: item.text, language: item.language })
    added++
  }

  return { snippets, added, skipped, renamed }
}
