import { useState } from 'react'
import type { FormEvent } from 'react'
import { GHOST_BTN, ICON_BTN, INPUT, PRIMARY_BTN, SECTION_LABEL, TEXTAREA } from '../../../shared/ui/styles'
import { PlusIcon, TrashIcon } from '../../../shared/ui/icons'
import { GROUP_TONES } from '../casesData'
import type { SnippetsController } from '../useSnippets'

type SnippetsGroupProps = {
  snippets: SnippetsController
  onInsert: (text: string) => void
}

/** "My texts": personal snippets the user adds with +, inserted like any template. */
export function SnippetsGroup({ snippets, onInsert }: SnippetsGroupProps) {
  const tone = GROUP_TONES.default
  const [adding, setAdding] = useState(false)
  const [label, setLabel] = useState('')
  const [text, setText] = useState('')

  const close = () => {
    setAdding(false)
    setLabel('')
    setText('')
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    snippets.add(label.trim() || text.trim().slice(0, 24), text)
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
          onClick={() => setAdding((v) => !v)}
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
          <div className="flex justify-end gap-2">
            <button type="button" className={GHOST_BTN} onClick={close}>
              Cancel
            </button>
            <button type="submit" className={`${PRIMARY_BTN} !px-3 !py-1 !text-xs`} disabled={!text.trim()}>
              Save
            </button>
          </div>
        </form>
      )}

      {snippets.snippets.length === 0 && !adding ? (
        <p className="text-ink-faint text-xs">No personal texts yet. Use + to add one.</p>
      ) : (
        <div className="grid grid-cols-2 gap-1.5">
          {snippets.snippets.map((s) => (
            <div key={s.id} className="group relative">
              <button
                type="button"
                title={s.text}
                onClick={() => onInsert(s.text)}
                className={`border-line bg-canvas text-ink-muted w-full truncate rounded-md border px-2.5 py-1.5 pr-7 text-left text-xs font-medium transition-colors ${tone.hover}`}
              >
                {s.label}
              </button>
              <button
                type="button"
                onClick={() => snippets.remove(s.id)}
                aria-label={`Delete ${s.label}`}
                className="text-ink-faint absolute top-1/2 right-1.5 -translate-y-1/2 rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100 hover:text-rose-300 focus-visible:opacity-100"
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
