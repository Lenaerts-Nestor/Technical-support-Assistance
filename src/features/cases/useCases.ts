import { useCallback, useMemo, useRef, useState } from 'react'
import { FLAGGED_PHRASES, TEMPLATE_BODIES, TEMPLATE_GROUPS } from './casesData'
import type { CaseLanguage, FlaggedMatch, TemplateButton } from './types'

const ALL_BUTTONS: TemplateButton[] = TEMPLATE_GROUPS.flatMap((g) => g.buttons)

/** Resolve a button's copy for the active language, or a placeholder if none yet. */
function templateText(id: string, language: CaseLanguage): string {
  const body = TEMPLATE_BODIES[id]?.[language]
  if (body) return body
  const label = ALL_BUTTONS.find((b) => b.id === id)?.label ?? id
  return `[${label}]`
}

/** Splice `insert` into `text` at the [start, end] selection, padded with blank lines. */
function spliceBlock(text: string, start: number, end: number, insert: string) {
  const before = text.slice(0, start)
  const after = text.slice(end)
  const lead = before && !before.endsWith('\n\n') ? (before.endsWith('\n') ? '\n' : '\n\n') : ''
  const trail = after && !after.startsWith('\n') ? '\n\n' : after ? '\n' : ''
  const block = lead + insert + trail
  return { value: before + block + after, caret: before.length + block.length }
}

/**
 * One phrase as a regex source: literal, with `\s+` for each run of spaces so a
 * phrase split across a line break still matches, and `\b` wherever it actually
 * starts or ends on a word character — without that, "copilot" would fire
 * inside "copilots" and "AI" inside "said".
 */
function toPattern(phrase: string): string {
  const trimmed = phrase.trim()
  const body = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+')
  return (/^\w/.test(trimmed) ? '\\b' : '') + body + (/\w$/.test(trimmed) ? '\\b' : '')
}

/**
 * One regex for the whole phrase list, longest phrase first so it wins the
 * alternation ("copilot said" over "copilot", "as an AI language model" over
 * "as an AI").
 */
const FLAGGED_RE = FLAGGED_PHRASES.length
  ? new RegExp([...FLAGGED_PHRASES].sort((a, b) => b.length - a.length).map(toPattern).join('|'), 'gi')
  : null

function findFlagged(text: string): FlaggedMatch[] {
  if (!FLAGGED_RE) return []
  FLAGGED_RE.lastIndex = 0
  const matches: FlaggedMatch[] = []
  for (let m = FLAGGED_RE.exec(text); m; m = FLAGGED_RE.exec(text)) {
    matches.push({ text: m[0], start: m.index, end: m.index + m[0].length })
  }
  return matches
}

/**
 * Cut one match out, along with the debris it strands: the punctuation that
 * followed it, the spaces on either side, and the whole line if the phrase was
 * all that line held.
 */
function cutMatch(text: string, match: FlaggedMatch): string {
  const lineStart = text.lastIndexOf('\n', match.start - 1) + 1
  let start = match.start
  let end = match.end

  // Back over the leading spaces but not the line's own indentation.
  while (start > lineStart && /[ \t]/.test(text[start - 1])) start--
  const before = text.slice(lineStart, start)

  while (/[ \t]/.test(text[end] ?? '')) end++
  // Only when the phrase opened the line does its punctuation go with it
  // ("Copilot said: reboot" → "reboot"). Mid-sentence the punctuation belongs
  // to the surrounding text, so "I asked Copilot." keeps its full stop.
  if (!before.trim() && /[,;:.—-]/.test(text[end] ?? '')) {
    end++
    while (/[ \t]/.test(text[end] ?? '')) end++
  }

  const nextBreak = text.indexOf('\n', end)
  const lineEnd = nextBreak === -1 ? text.length : nextBreak
  const after = text.slice(end, lineEnd)

  // Nothing else on that line — drop the line, its break included.
  if (!before.trim() && !after.trim()) {
    return text.slice(0, lineStart) + text.slice(Math.min(lineEnd + 1, text.length))
  }
  // Text on both sides — rejoin with one space, unless what follows is
  // punctuation that should stay tight against the previous word.
  const gap = before.trim() && after.trim() && !/^[,;:.!?)]/.test(after) ? ' ' : ''
  return text.slice(0, start) + gap + text.slice(end)
}

export function useCases() {
  const [draft, setDraft] = useState('')
  const [language, setLanguage] = useState<CaseLanguage>('en')
  const [justCopied, setJustCopied] = useState(false)
  const editorRef = useRef<HTMLTextAreaElement>(null)

  const flagged = useMemo(() => findFlagged(draft), [draft])
  /** Which match `jumpToFlagged` selects next — it cycles through them. */
  const nextJump = useRef(0)

  const jumpToFlagged = useCallback(() => {
    const el = editorRef.current
    if (!el || !flagged.length) return
    const index = nextJump.current % flagged.length
    nextJump.current = index + 1
    el.focus()
    el.setSelectionRange(flagged[index].start, flagged[index].end)
  }, [flagged])

  const removeFlagged = useCallback(() => {
    // Right to left, so each cut leaves the earlier offsets still valid.
    setDraft((text) =>
      findFlagged(text).reduceRight((out, match) => cutMatch(out, match), text),
    )
    nextJump.current = 0
    editorRef.current?.focus()
  }, [])

  const insertTemplate = useCallback(
    (id: string) => {
      const el = editorRef.current
      const insert = templateText(id, language)
      setDraft((text) => {
        const start = el?.selectionStart ?? text.length
        const end = el?.selectionEnd ?? text.length
        const { value, caret } = spliceBlock(text, start, end, insert)
        if (el) {
          requestAnimationFrame(() => {
            el.focus()
            el.setSelectionRange(caret, caret)
          })
        }
        return value
      })
    },
    [language],
  )

  const clear = useCallback(() => {
    setDraft('')
    editorRef.current?.focus()
  }, [])

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(draft)
      setJustCopied(true)
      window.setTimeout(() => setJustCopied(false), 2000)
    } catch {
      setJustCopied(false)
    }
  }, [draft])

  return {
    draft,
    setDraft,
    language,
    setLanguage,
    editorRef,
    insertTemplate,
    clear,
    copy,
    justCopied,
    flagged,
    jumpToFlagged,
    removeFlagged,
  }
}
