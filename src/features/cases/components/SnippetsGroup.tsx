import { useState } from 'react'
import type { FormEvent } from 'react'
import { GHOST_BTN, ICON_BTN, INPUT, PRIMARY_BTN, SECTION_LABEL, SELECT, TEXTAREA } from '../../../shared/ui/styles'
import { PlusIcon, TrashIcon } from '../../../shared/ui/icons'
import { GROUP_TONES, LANGUAGES } from '../casesData'
import type { CaseLanguage } from '../types'
import type { SnippetsController } from '../useSnippets'

type SnippetsGroupProps = {
  snippets: SnippetsController
  /** The Utilities language: default for new texts, and the filter for the list. */
  language: CaseLanguage
  onInsert: (text: string) => void
}

/** "My texts": personal snippets the user adds with +, inserted like any template. */
export function SnippetsGroup({ snippets, language, onInsert }: SnippetsGroupProps) {
  const tone = GROUP_TONES.default
  const [adding, setAdding] = useState(false)
  const [label, setLabel] = useState('')
  const [text, setText] = useState('')
  const [textLanguage, setTextLanguage] = useState<CaseLanguage>(language)
  const visible = snippets.snippets.filter((s) => s.language === language)

  const close = () => {
    setAdding(false)
    setLabel('')
    setText('')
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    snippets.add(label.trim() || text.trim().slice(0, 24), text, textLanguage)
    close()
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h4 className={`flex items-center gap-1.5 ${SECTION_LABEL}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} aria-hidden />
          My texts
          {snippets.savedToFile && (
            <span className="text-ink-faint font-normal normal-case">· saved to file</span>
          )}
        </h4>
        <button
          type="button"
          className={ICON_BTN}
          onClick={() => {
            setTextLanguage(language)
            setAdding((v) => !v)
          }}
          aria-label="Add personal text"
          title="Add personal text"
        >
          <PlusIcon className="h-3.5 w-3.5" />
        </button>
      </div>

      {adding && (
        <form onSubmit={submit} className="border-line bg-subtle mb-2 space-y-2 rounded-lg border p-2.5">
          <input
            className={INPUT}
            placeholder="Button name"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            autoFocus
          />
          <textarea
            className={TEXTAREA}
            rows={5}
            placeholder="Text to insert…"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <select
              className={SELECT}
              value={textLanguage}
              onChange={(e) => setTextLanguage(e.target.value as CaseLanguage)}
              aria-label="Language of this text"
            >
              {LANGUAGES.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
            <button type="button" className={GHOST_BTN} onClick={close}>
              Cancel
            </button>
            <button type="submit" className={`${PRIMARY_BTN} !px-3 !py-1 !text-xs`} disabled={!text.trim()}>
              Save
            </button>
            </div>
          </div>
        </form>
      )}

      {visible.length === 0 && !adding ? (
        <p className="text-ink-faint text-xs">No personal texts in this language yet. Use + to add one.</p>
      ) : (
        <div className="grid grid-cols-1 gap-1.5">
          {visible.map((s) => (
            <div key={s.id} className="group relative">
              <button
                type="button"
                title={s.text}
                onClick={() => onInsert(s.text)}
                className={`border-line bg-canvas w-full rounded-md border px-2.5 py-2 pr-7 text-left transition-colors ${tone.hover}`}
              >
                <span className="text-ink block text-xs leading-snug font-semibold">{s.label}</span>
                <span className="text-ink-faint mt-0.5 line-clamp-2 block text-[11px] leading-snug">
                  {s.text.replace(/\s+/g, ' ').trim()}
                </span>
              </button>
              <button
                type="button"
                onClick={() => snippets.remove(s.id)}
                aria-label={`Delete ${s.label}`}
                className="text-ink-faint absolute top-1.5 right-1.5 rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100 hover:text-rose-300 focus-visible:opacity-100"
              >
                <TrashIcon className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
