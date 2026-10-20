import { useState } from 'react'
import { CARD, CARD_HEADER, GHOST_BTN, INPUT, PRIMARY_BTN, SECTION_LABEL, SELECT, TEXTAREA } from '../../../shared/ui/styles'
import { cleanRequest, normalizePath, parseHeaderLines } from '../nvxData'
import { HTTP_METHODS } from '../types'
import type { DeviceRequest, HttpMethod } from '../types'

/** What is typed in the builder. Kept by the page so a saved call can be loaded into it. */
export type Draft = {
  method: HttpMethod
  path: string
  /** Headers as lines of `Name: value`. */
  headers: string
  body: string
}

type RequestBuilderProps = {
  draft: Draft
  onDraft: (draft: Draft) => void
  /** Why a read cannot run now, or `null`. */
  readBlockedReason: string | null
  /** Why a change cannot be sent now, or `null`. */
  changeBlockedReason: string | null
  running: boolean
  /** A GET: run it on the ticked units. */
  onSend: (request: DeviceRequest) => void
  /** Anything else: review it, then send it to the one ticked unit. */
  onReview: (request: DeviceRequest) => void
  onSave: (request: DeviceRequest) => void
}

type Tab = 'body' | 'headers'

/** Build any request: a method, a path, headers and a raw body; send it to the ticked units or save it. */
export function RequestBuilder({ draft, onDraft, readBlockedReason, changeBlockedReason, running, onSend, onReview, onSave }: RequestBuilderProps) {
  const [tab, setTab] = useState<Tab>('body')
  const isGet = draft.method === 'GET'
  const path = normalizePath(draft.path)
  const { headers, error: headerError } = parseHeaderLines(draft.headers)
  const headerCount = Object.keys(headers).length
  const request = path && !headerError ? cleanRequest({ method: draft.method, path, headers, body: draft.body }) : null
  const blocked = isGet ? readBlockedReason : changeBlockedReason
  const shownTab: Tab = isGet ? 'headers' : tab

  let jsonState: 'valid' | 'invalid' | 'none' = 'none'
  if (draft.body.trim()) {
    try {
      JSON.parse(draft.body)
      jsonState = 'valid'
    } catch {
      jsonState = 'invalid'
    }
  }

  const set = (patch: Partial<Draft>) => onDraft({ ...draft, ...patch })
  const submit = () => {
    if (!request || blocked !== null || running) return
    if (isGet) onSend(request)
    else onReview(request)
  }

  return (
    <section className={CARD} aria-label="Request">
      <header className={CARD_HEADER}>
        <h3 className={SECTION_LABEL}>Request</h3>
      </header>
      <form
        className="space-y-3 p-4"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <div className="flex flex-wrap items-center gap-2">
          <select
            className={`${SELECT} py-2 font-mono text-sm font-bold`}
            value={draft.method}
            aria-label="Method"
            onChange={(e) => set({ method: e.target.value as HttpMethod })}
          >
            {HTTP_METHODS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
          <input
            className={`${INPUT} min-w-[16rem] flex-1 py-2 font-mono text-[15px]`}
            value={draft.path}
            placeholder="/Device/DeviceInfo"
            aria-label="Path on the device"
            spellCheck={false}
            autoComplete="off"
            onChange={(e) => set({ path: e.target.value })}
          />
          <button type="submit" className={PRIMARY_BTN} disabled={!request || blocked !== null || running}>
            {isGet ? 'Send' : 'Review…'}
          </button>
          <button type="button" className={GHOST_BTN} disabled={!request} onClick={() => request && onSave(request)}>
            Save as call
          </button>
        </div>

        <div className="border-line-soft flex items-center gap-1 border-b" role="tablist">
          {(['body', 'headers'] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={shownTab === t}
              disabled={t === 'body' && isGet}
              title={t === 'body' && isGet ? 'A GET request has no body' : undefined}
              onClick={() => setTab(t)}
              className={`-mb-px border-b-2 px-3 py-1.5 text-sm font-medium disabled:opacity-40 ${
                shownTab === t ? 'border-brand text-ink' : 'text-ink-muted hover:text-ink border-transparent'
              }`}
            >
              {t === 'body' ? 'Body' : `Headers${headerCount ? ` (${headerCount})` : ''}`}
            </button>
          ))}
          {shownTab === 'body' && jsonState !== 'none' && (
            <span className={`ml-auto text-xs ${jsonState === 'valid' ? 'text-emerald-300' : 'text-amber-300'}`}>
              {jsonState === 'valid' ? 'Valid JSON' : 'Not JSON: sent as plain text'}
            </span>
          )}
        </div>

        {shownTab === 'body' ? (
          <div className="space-y-2">
            <textarea
              className={`${TEXTAREA} font-mono text-[15px]`}
              rows={6}
              value={draft.body}
              placeholder={'{"Device":{"Ethernet":{"HostName":"NVX-1"}}}'}
              aria-label="Body"
              spellCheck={false}
              onChange={(e) => set({ body: e.target.value })}
            />
            <button
              type="button"
              className={GHOST_BTN}
              disabled={jsonState !== 'valid'}
              onClick={() => set({ body: JSON.stringify(JSON.parse(draft.body) as unknown, null, 2) })}
            >
              Format JSON
            </button>
          </div>
        ) : (
          <textarea
            className={`${TEXTAREA} font-mono text-[15px]`}
            rows={4}
            value={draft.headers}
            placeholder={'Name: value\nAccept: application/json'}
            aria-label="Headers"
            spellCheck={false}
            onChange={(e) => set({ headers: e.target.value })}
          />
        )}

        <div className="space-y-1 text-sm">
          {draft.path.trim() && !path && <p className="text-rose-300">That is not a path the app can send. It must start with / and have no spaces.</p>}
          {headerError && <p className="text-rose-300">{headerError}</p>}
          {blocked && <p className="text-ink-muted">{blocked}</p>}
          {!isGet && !blocked && <p className="text-ink-muted">Nothing is sent until you have reviewed it.</p>}
        </div>
      </form>
    </section>
  )
}
