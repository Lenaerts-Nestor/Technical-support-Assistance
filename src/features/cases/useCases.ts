import { useCallback, useLayoutEffect, useMemo, useRef } from 'react'
import type { ClipboardEvent, KeyboardEvent } from 'react'
import { ALL_TEMPLATE_BUTTONS, FLAGGED_PHRASES, LANGUAGES, TEMPLATE_BODIES } from './casesData'
import { storageKey, usePersistentState } from '../../shared/storage/usePersistentState'
import { useCopyToClipboard } from '../../shared/hooks/useCopyToClipboard'
import {
  formatBullet,
  htmlToText,
  normalizeBullets,
  normalizePasted,
  parseBullet,
  shiftBulletLines,
  textToHtml,
  toggleBulletLines,
} from './bullets'
import type { CaseLanguage, FlaggedMatch } from './types'

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
  const label = ALL_TEMPLATE_BUTTONS.find((b) => b.id === id)?.label ?? id
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

/** Expand a [start, end] offset pair out to the full lines they touch. */
function lineRange(text: string, start: number, end: number) {
  const lineStart = text.lastIndexOf('\n', start - 1) + 1
  const nextBreak = text.indexOf('\n', end)
  const lineEnd = nextBreak === -1 ? text.length : nextBreak
  return { lineStart, lineEnd }
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
  const { copied, copy: copyToClipboard } = useCopyToClipboard<'rich' | 'plain'>()
  const editorRef = useRef<HTMLTextAreaElement>(null)

  // --- selection after an edit ------------------------------------------
  // A controlled textarea loses its caret when React writes a new value into it,
  // so every edit made here says where the selection should end up. It is applied
  // in a layout effect, right after the commit and before the next keystroke —
  // a timer (requestAnimationFrame) can fire after fast typing has already moved on.
  const pendingSelection = useRef<[number, number] | null>(null)
  useLayoutEffect(() => {
    const sel = pendingSelection.current
    const el = editorRef.current
    pendingSelection.current = null
    if (!sel || !el) return
    el.focus()
    el.setSelectionRange(sel[0], sel[1])
  }, [draft])

  const placeSelection = useCallback((start: number, end = start) => {
    pendingSelection.current = [start, end]
    // If the edit left the draft unchanged there is no commit to apply it on; don't keep it for later typing.
    requestAnimationFrame(() => {
      pendingSelection.current = null
    })
  }, [])

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

      // "- " or "* " typed at the start of a line becomes a real bullet, as in Notes.
      const el = editorRef.current
      if (el && next.length === draft.length + 1) {
        const caret = el.selectionStart
        const lineStart = next.lastIndexOf('\n', caret - 1) + 1
        const typed = next.slice(lineStart, caret)
        if (/^[ \t]*[-*] $/.test(typed)) {
          const bullet = parseBullet(typed)
          if (bullet) {
            const marker = formatBullet(bullet.level, '')
            setDraft(next.slice(0, lineStart) + marker + next.slice(caret))
            placeSelection(lineStart + marker.length)
            return
          }
        }
      }
      setDraft(next)
    },
    [checkpoint, draft, placeSelection, setDraft, stopTypingBurst],
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
        placeSelection(start, start + bolded.length)
        return text.slice(0, start) + bolded + text.slice(end)
      }),
    )
  }, [withCheckpoint, setDraft, placeSelection])

  const applyBullets = useCallback(() => {
    const el = editorRef.current
    const start = el?.selectionStart ?? 0
    const end = el?.selectionEnd ?? 0
    withCheckpoint(() =>
      setDraft((text) => {
        const { lineStart, lineEnd } = lineRange(text, start, end)
        const before = text.slice(lineStart, lineEnd)
        const bulleted = toggleBulletLines(before)
        if (start === end) {
          // Just a caret: keep it in the line, after the marker, ready to type.
          placeSelection(Math.max(lineStart, start + bulleted.length - before.length))
        } else {
          // A selection: keep the touched lines selected so the toggle can be undone with a click.
          placeSelection(lineStart, lineStart + bulleted.length)
        }
        return text.slice(0, lineStart) + bulleted + text.slice(lineEnd)
      }),
    )
  }, [withCheckpoint, setDraft, placeSelection])

  /**
   * Replace [start, end) of the draft as one undo step and put the selection at
   * [caretStart, caretEnd] afterwards — what Enter, Tab, Backspace and paste do.
   */
  const edit = useCallback(
    (start: number, end: number, insert: string, caretStart: number, caretEnd = caretStart) => {
      withCheckpoint(() => setDraft((text) => text.slice(0, start) + insert + text.slice(end)))
      placeSelection(caretStart, caretEnd)
    },
    [withCheckpoint, setDraft, placeSelection],
  )

  /** Move the bullet lines under the selection one level in (+1) or out (-1). False if there are none. */
  const shiftBullets = useCallback(
    (dir: 1 | -1): boolean => {
      const el = editorRef.current
      if (!el) return false
      const start = el.selectionStart
      const end = el.selectionEnd
      const { lineStart, lineEnd } = lineRange(draft, start, end)
      const moved = shiftBulletLines(draft.slice(lineStart, lineEnd), dir)
      if (!moved) return false
      if (moved.block !== draft.slice(lineStart, lineEnd)) {
        const total = moved.deltas.reduce((a, b) => a + b, 0)
        const newStart = Math.max(lineStart, start + moved.deltas[0])
        edit(lineStart, lineEnd, moved.block, newStart, Math.max(newStart, end + total))
      }
      return true
    },
    [draft, edit],
  )

  /**
   * List behaviour on a bullet line: Enter starts the next bullet (an empty one
   * ends the list, or steps out a level), Backspace right after the marker takes
   * the bullet off. Returns true when it handled the key.
   */
  const handleListKey = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>): boolean => {
      if (e.nativeEvent.isComposing || e.altKey || e.ctrlKey || e.metaKey) return false
      const el = e.currentTarget
      const start = el.selectionStart
      const end = el.selectionEnd
      const lineStart = draft.lastIndexOf('\n', start - 1) + 1
      const nextBreak = draft.indexOf('\n', start)
      const lineEnd = nextBreak === -1 ? draft.length : nextBreak
      const bullet = parseBullet(draft.slice(lineStart, lineEnd))
      if (!bullet || start - lineStart < bullet.prefixLength) return false

      if (e.key === 'Enter' && !e.shiftKey) {
        if (!bullet.text.trim() && start === end) {
          const outdented = bullet.level > 0 ? formatBullet(bullet.level - 1, '') : ''
          edit(lineStart, lineEnd, outdented, lineStart + outdented.length)
        } else {
          const marker = `\n${formatBullet(bullet.level, '')}`
          edit(start, end, marker, start + marker.length)
        }
        return true
      }
      if (e.key === 'Backspace' && start === end && start - lineStart === bullet.prefixLength) {
        const plain = bullet.level > 0 ? formatBullet(bullet.level - 1, bullet.text) : bullet.text
        edit(lineStart, lineEnd, plain, lineStart + plain.length - bullet.text.length)
        return true
      }
      return false
    },
    [draft, edit],
  )

  /** Ctrl/Cmd+Z (Shift = redo), Ctrl/Cmd+Y, Ctrl/Cmd+B, Ctrl/Cmd+Shift+8 and Tab / Enter / Backspace in a list. */
  const handleEditorKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Tab' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (shiftBullets(e.shiftKey ? -1 : 1)) e.preventDefault()
        return
      }
      if (e.key === 'Enter' || e.key === 'Backspace') {
        if (handleListKey(e)) e.preventDefault()
        return
      }
      if (!(e.ctrlKey || e.metaKey)) return
      if (e.shiftKey && e.code === 'Digit8') {
        e.preventDefault()
        applyBullets()
        return
      }
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
    [shiftBullets, handleListKey, applyBullets, undo, redo, applyBold],
  )

  /**
   * Paste with lists intact. Browsers leave the bullet markers out of the
   * plain-text flavour of a copy from a rich editor, so when the HTML flavour
   * holds a list it is read instead; either way, foreign markers (`-`, `*`,
   * tab-separated bullets…) are folded into the editor's own.
   */
  const handlePaste = useCallback(
    (e: ClipboardEvent<HTMLTextAreaElement>) => {
      const el = e.currentTarget
      const start = el.selectionStart
      const end = el.selectionEnd
      const lineStart = draft.lastIndexOf('\n', start - 1) + 1
      const startsLine = !draft.slice(lineStart, start).trim()
      const html = e.clipboardData.getData('text/html')
      const plain = e.clipboardData.getData('text/plain')
      const fromHtml = html ? htmlToText(html) : null
      const incoming = normalizePasted(fromHtml ?? plain, startsLine)
      if (fromHtml === null && incoming === plain) return // nothing to fix: the browser's paste is fine
      e.preventDefault()
      edit(start, end, incoming, start + incoming.length)
    },
    [draft, edit],
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
          placeSelection(caret)
          return value
        }),
      )
    },
    [withCheckpoint, setDraft, placeSelection],
  )

  const insertTemplate = useCallback(
    (id: string) => insertText(templateText(id, language)),
    [insertText, language],
  )

  const clear = useCallback(() => {
    withCheckpoint(() => setDraft(''))
    editorRef.current?.focus()
  }, [withCheckpoint, setDraft])

  /**
   * Copy as both flavours: the HTML one carries real lists for rich editors
   * (Salesforce, Notes, Outlook), the plain one tidy "• " lines for everything else.
   */
  const copy = useCallback(() => {
    const plain = normalizeBullets(draft)
    return copyToClipboard(plain, 'rich', textToHtml(plain))
  }, [copyToClipboard, draft])

  /** Plain text only, for a destination that misbehaves with the rich flavour. */
  const copyPlain = useCallback(
    () => copyToClipboard(normalizeBullets(draft), 'plain'),
    [copyToClipboard, draft],
  )

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
    copyPlain,
    justCopied: copied === 'rich',
    justCopiedPlain: copied === 'plain',
    flagged,
    jumpToFlagged,
    removeFlagged,
    applyBold,
    applyBullets,
    indentBullets: shiftBullets,
    handleEditorKeyDown,
    handlePaste,
  }
}
