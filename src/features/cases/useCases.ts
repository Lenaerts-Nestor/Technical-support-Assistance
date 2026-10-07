import { useCallback, useMemo, useRef } from 'react'
import type { KeyboardEvent } from 'react'
import { FLAGGED_PHRASES, LANGUAGES, TEMPLATE_BODIES, TEMPLATE_GROUPS } from './casesData'
import { storageKey, usePersistentState } from '../../shared/storage/usePersistentState'
import { useCopyToClipboard } from '../../shared/hooks/useCopyToClipboard'
import type { CaseLanguage, FlaggedMatch, TemplateButton } from './types'

const ALL_BUTTONS: TemplateButton[] = TEMPLATE_GROUPS.flatMap((g) => g.buttons)

const DRAFT_KEY = storageKey('cases', 'draft')
const LANGUAGE_KEY = storageKey('cases', 'language')

const reviveDraft = (raw: unknown): string | null =>
  typeof raw === 'string' ? raw : null

const reviveLanguage = (raw: unknown): CaseLanguage | null =>
  LANGUAGES.some((l) => l.id === raw) ? (raw as CaseLanguage) : null

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
 * Plain ASCII letters/digits mapped to their Unicode "Mathematical
 * Sans-Serif Bold" equivalents. The draft only ever copies as plain text (see
 * `useCopyToClipboard`), so this is the only way "bold" can survive into an
 * email or case system — these are distinct characters, not a style, so they
 * render bold wherever they're pasted.
 */
const BOLD_RANGES = [
  { from: 'A', to: 'Z', base: 0x1d5d4 },
  { from: 'a', to: 'z', base: 0x1d5ee },
  { from: '0', to: '9', base: 0x1d7ec },
]

const PLAIN_TO_BOLD = new Map<string, string>()
const BOLD_TO_PLAIN = new Map<string, string>()
for (const { from, to, base } of BOLD_RANGES) {
  const start = from.charCodeAt(0)
  const end = to.charCodeAt(0)
  for (let code = start; code <= end; code++) {
    const plain = String.fromCharCode(code)
    const bold = String.fromCodePoint(base + (code - start))
    PLAIN_TO_BOLD.set(plain, bold)
    BOLD_TO_PLAIN.set(bold, plain)
  }
}

/** Map each character through `table`, leaving anything absent (spaces,
 *  punctuation, characters already on the other side) unchanged. */
function mapChars(text: string, table: Map<string, string>): string {
  return [...text].map((ch) => table.get(ch) ?? ch).join('')
}

/**
 * Bold toggle for a selection: if it still has any plain letter/digit, bolds
 * the lot; otherwise (already all bold, or no lettering to bold at all) it
 * converts back to plain.
 */
function toggleBoldText(selected: string): string {
  const hasPlain = [...selected].some((ch) => PLAIN_TO_BOLD.has(ch))
  return mapChars(selected, hasPlain ? PLAIN_TO_BOLD : BOLD_TO_PLAIN)
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

/**
 * A copy of `text` with any bold Unicode character folded back to its plain
 * letter (via `BOLD_TO_PLAIN`), so a bolded flagged word still matches —
 * along with the offset of each normalized character in the *original*
 * text, since a bold character is 2 UTF-16 units wide and its plain form
 * only 1. `offsets[i]` is where normalized index `i` sits in `text`, with
 * one extra trailing entry for the position just past the end.
 */
function normalizeForMatching(text: string): { normalized: string; offsets: number[] } {
  let normalized = ''
  const offsets: number[] = []
  for (let i = 0; i < text.length; ) {
    const ch = String.fromCodePoint(text.codePointAt(i)!)
    offsets.push(i)
    normalized += BOLD_TO_PLAIN.get(ch) ?? ch
    i += ch.length
  }
  offsets.push(text.length)
  return { normalized, offsets }
}

function findFlagged(text: string): FlaggedMatch[] {
  if (!FLAGGED_RE) return []
  const { normalized, offsets } = normalizeForMatching(text)
  FLAGGED_RE.lastIndex = 0
  const matches: FlaggedMatch[] = []
  for (let m = FLAGGED_RE.exec(normalized); m; m = FLAGGED_RE.exec(normalized)) {
    const start = offsets[m.index]
    const end = offsets[m.index + m[0].length]
    matches.push({ text: text.slice(start, end), start, end })
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

const BULLET = '• '

/** Expand a [start, end] offset pair out to the full lines they touch. */
function lineRange(text: string, start: number, end: number) {
  const lineStart = text.lastIndexOf('\n', start - 1) + 1
  const nextBreak = text.indexOf('\n', end)
  const lineEnd = nextBreak === -1 ? text.length : nextBreak
  return { lineStart, lineEnd }
}

/**
 * Bullet toggle for a block of whole lines: adds "• " to every non-blank line
 * that's missing it, unless they all already have it, in which case it strips
 * it instead. Blank lines are left alone unless the block is nothing but
 * blank lines (starting a fresh bullet on an empty draft).
 */
function toggleBulletLines(block: string): string {
  const lines = block.split('\n')
  const content = lines.filter((line) => line.trim())
  const skipBlanks = content.length > 0
  const allBulleted = skipBlanks && content.every((line) => line.startsWith(BULLET))
  return lines
    .map((line) => {
      if (skipBlanks && !line.trim()) return line
      if (allBulleted) return line.slice(BULLET.length)
      return line.startsWith(BULLET) ? line : BULLET + line
    })
    .join('\n')
}

/** How many discrete edits (a typed burst, a template insert, a formatting
 *  action) the draft remembers for undo. */
const HISTORY_LIMIT = 100

/** A pause this long between keystrokes ends the current undo step. */
const TYPING_PAUSE_MS = 500

export function useCases() {
  const [draft, setDraft] = usePersistentState(DRAFT_KEY, () => '', reviveDraft)
  const [language, setLanguage] = usePersistentState<CaseLanguage>(
    LANGUAGE_KEY,
    () => 'en',
    reviveLanguage,
  )
  const { copied, copy: copyToClipboard } = useCopyToClipboard()
  const editorRef = useRef<HTMLTextAreaElement>(null)

  // --- undo / redo -----------------------------------------------------
  // A controlled textarea whose value is ever set programmatically (template
  // insert, clear, bold, bullets — anything other than the browser's own
  // typing) clears the browser's native undo stack the moment React pushes
  // that value into the DOM. So Ctrl+Z is handled entirely by hand here
  // instead of relying on the browser: `undoStack`/`redoStack` hold draft
  // snapshots, and every mutation below goes through `checkpoint` first.
  const undoStack = useRef<string[]>([])
  const redoStack = useRef<string[]>([])
  const isTypingBurst = useRef(false)
  const typingTimer = useRef<number | undefined>(undefined)

  const stopTypingBurst = useCallback(() => {
    window.clearTimeout(typingTimer.current)
    isTypingBurst.current = false
  }, [])

  /** Record the draft as it is *now* as one undo step, and forget any redo. */
  const checkpoint = useCallback(() => {
    undoStack.current.push(draft)
    if (undoStack.current.length > HISTORY_LIMIT) undoStack.current.shift()
    redoStack.current = []
  }, [draft])

  /** Wrap a discrete edit (template insert, clear, formatting) as its own undo step. */
  const withCheckpoint = useCallback(
    (mutate: () => void) => {
      stopTypingBurst()
      checkpoint()
      mutate()
    },
    [checkpoint, stopTypingBurst],
  )

  /** Textarea onChange — a burst of keystrokes between pauses is one undo step. */
  const updateDraft = useCallback(
    (next: string) => {
      if (!isTypingBurst.current) {
        checkpoint()
        isTypingBurst.current = true
      }
      window.clearTimeout(typingTimer.current)
      typingTimer.current = window.setTimeout(stopTypingBurst, TYPING_PAUSE_MS)
      setDraft(next)
    },
    [checkpoint, setDraft, stopTypingBurst],
  )

  const undo = useCallback(() => {
    const previous = undoStack.current.pop()
    if (previous === undefined) return
    stopTypingBurst()
    redoStack.current.push(draft)
    setDraft(previous)
  }, [draft, setDraft, stopTypingBurst])

  const redo = useCallback(() => {
    const next = redoStack.current.pop()
    if (next === undefined) return
    stopTypingBurst()
    undoStack.current.push(draft)
    setDraft(next)
  }, [draft, setDraft, stopTypingBurst])

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
    withCheckpoint(() => {
      // Right to left, so each cut leaves the earlier offsets still valid.
      setDraft((text) =>
        findFlagged(text).reduceRight((out, match) => cutMatch(out, match), text),
      )
    })
    nextJump.current = 0
    editorRef.current?.focus()
  }, [withCheckpoint, setDraft])

  const applyBold = useCallback(() => {
    const el = editorRef.current
    const start = el?.selectionStart ?? 0
    const end = el?.selectionEnd ?? 0
    if (start === end) return
    withCheckpoint(() =>
      setDraft((text) => {
        const bolded = toggleBoldText(text.slice(start, end))
        if (el) {
          requestAnimationFrame(() => {
            el.focus()
            el.setSelectionRange(start, start + bolded.length)
          })
        }
        return text.slice(0, start) + bolded + text.slice(end)
      }),
    )
  }, [withCheckpoint, setDraft])

  const applyBullets = useCallback(() => {
    const el = editorRef.current
    const start = el?.selectionStart ?? 0
    const end = el?.selectionEnd ?? 0
    withCheckpoint(() =>
      setDraft((text) => {
        const { lineStart, lineEnd } = lineRange(text, start, end)
        const bulleted = toggleBulletLines(text.slice(lineStart, lineEnd))
        if (el) {
          requestAnimationFrame(() => {
            el.focus()
            el.setSelectionRange(lineStart, lineStart + bulleted.length)
          })
        }
        return text.slice(0, lineStart) + bulleted + text.slice(lineEnd)
      }),
    )
  }, [withCheckpoint, setDraft])

  /** Ctrl/Cmd+Z (Shift = redo), Ctrl/Cmd+Y, and Ctrl/Cmd+B on the textarea. */
  const handleEditorKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (!(e.ctrlKey || e.metaKey)) return
      switch (e.key.toLowerCase()) {
        case 'z':
          e.preventDefault()
          if (e.shiftKey) redo()
          else undo()
          break
        case 'y':
          e.preventDefault()
          redo()
          break
        case 'b':
          e.preventDefault()
          applyBold()
          break
      }
    },
    [undo, redo, applyBold],
  )

  /** Splice raw text into the draft at the caret (or over the selection). */
  const insertText = useCallback(
    (insert: string) => {
      const el = editorRef.current
      withCheckpoint(() =>
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
        }),
      )
    },
    [withCheckpoint, setDraft],
  )

  const insertTemplate = useCallback(
    (id: string) => insertText(templateText(id, language)),
    [insertText, language],
  )

  const clear = useCallback(() => {
    withCheckpoint(() => setDraft(''))
    editorRef.current?.focus()
  }, [withCheckpoint, setDraft])

  const copy = useCallback(() => copyToClipboard(draft), [copyToClipboard, draft])

  return {
    draft,
    updateDraft,
    language,
    setLanguage,
    editorRef,
    insertTemplate,
    insertText,
    clear,
    copy,
    justCopied: copied !== null,
    flagged,
    jumpToFlagged,
    removeFlagged,
    applyBold,
    applyBullets,
    handleEditorKeyDown,
  }
}
