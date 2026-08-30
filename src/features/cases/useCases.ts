import { useCallback, useRef, useState } from 'react'
import { TEMPLATE_BODIES, TEMPLATE_GROUPS } from './casesData'
import type { CaseLanguage, TemplateButton } from './types'

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

export function useCases() {
  const [draft, setDraft] = useState('')
  const [language, setLanguage] = useState<CaseLanguage>('en')
  const [justCopied, setJustCopied] = useState(false)
  const editorRef = useRef<HTMLTextAreaElement>(null)

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
  }
}
