import { useRef, useState } from 'react'
import { CARD, CARD_HEADER, GHOST_BTN, INPUT, PRIMARY_BTN, SECTION_LABEL, SELECT, TEXTAREA } from '../../../shared/ui/styles'
import { MAX_UPLOAD_BYTES, cleanRequest, formSize, formatBytes, missingFiles, newFormRow, normalizePath, parseHeaderLines, rowsToForm } from '../nvxData'
import type { FormRow } from '../nvxData'
import { HTTP_METHODS } from '../types'
import type { DeviceRequest, HttpMethod } from '../types'

/** What is typed in the builder. Kept by the page so a saved call can be loaded into it. */
export type Draft = {
  method: HttpMethod
  path: string
  /** Headers as lines of `Name: value`. */
  headers: string
  /** `raw` is the text in `body`; `form` is the form-data rows below. */
  bodyMode: 'raw' | 'form'
  body: string
  /** The form-data rows, like Postman's: text or a file each. Files are kept in memory only. */
  form: FormRow[]
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

/** Build any request: a method, a path, headers and a raw or form-data body (with files); send it to the ticked units or save it. */
export function RequestBuilder({ draft, onDraft, readBlockedReason, changeBlockedReason, running, onSend, onReview, onSave }: RequestBuilderProps) {
  const [tab, setTab] = useState<Tab>('body')
  const isGet = draft.method === 'GET'
  const path = normalizePath(draft.path)
  const { headers, error: headerError } = parseHeaderLines(draft.headers)
  const headerCount = Object.keys(headers).length
  const isForm = draft.bodyMode === 'form'
  const form = rowsToForm(draft.form)
  const request =
    path && !headerError ? cleanRequest({ method: draft.method, path, headers, ...(isForm ? { form } : { body: draft.body }) }) : null
  const unchosen = isForm && !isGet ? missingFiles(form) : []
  const tooBig = isForm && !isGet && formSize(form) > MAX_UPLOAD_BYTES
  const formProblem =
    unchosen.length > 0 ? `Choose the file for: ${unchosen.join(', ')}.` : tooBig ? `The form is larger than ${formatBytes(MAX_UPLOAD_BYTES)}.` : null
  const blocked = (isGet ? readBlockedReason : changeBlockedReason) ?? formProblem
  const shownTab: Tab = isGet ? 'headers' : tab

  let jsonState: 'valid' | 'invalid' | 'none' = 'none'
  if (!isForm && draft.body.trim()) {
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
          {shownTab === 'body' && !isForm && jsonState !== 'none' && (
            <span className={`ml-auto text-xs ${jsonState === 'valid' ? 'text-emerald-300' : 'text-amber-300'}`}>
              {jsonState === 'valid' ? 'Valid JSON' : 'Not JSON: sent as plain text'}
            </span>
          )}
        </div>

        {shownTab === 'body' ? (
          <div className="space-y-2">
            <div className="flex items-center gap-4 text-sm" role="radiogroup" aria-label="Body type">
              {(['raw', 'form'] as const).map((mode) => (
                <label key={mode} className="flex cursor-pointer items-center gap-1.5">
                  <input type="radio" name="body-mode" checked={draft.bodyMode === mode} onChange={() => set({ bodyMode: mode })} />
                  {mode === 'raw' ? 'raw' : 'form-data'}
                </label>
              ))}
            </div>
            {isForm ? (
              <FormEditor rows={draft.form} onRows={(rows) => set({ form: rows })} />
            ) : (
              <>
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
              </>
            )}
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

/** The rows of a form-data body: a name, then text or a file, like Postman. */
function FormEditor({ rows, onRows }: { rows: FormRow[]; onRows: (rows: FormRow[]) => void }) {
  const [fileError, setFileError] = useState<string | null>(null)
  const pickers = useRef(new Map<string, HTMLInputElement>())
  const change = (id: string, patch: Partial<FormRow>) => onRows(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)))

  const choose = async (id: string, file: File | undefined) => {
    if (!file) return
    if (file.size > MAX_UPLOAD_BYTES) {
      setFileError(`${file.name} is larger than ${formatBytes(MAX_UPLOAD_BYTES)}.`)
      return
    }
    try {
      const data = new Uint8Array(await file.arrayBuffer())
      setFileError(null)
      onRows(rows.map((row) => (row.id === id ? { ...row, fileName: file.name, data, contentType: file.type || undefined } : row)))
    } catch {
      setFileError(`${file.name} could not be read.`)
    }
  }

  return (
    <div className="space-y-2">
      <div className="border-line-soft overflow-hidden rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-canvas text-ink-muted text-left text-xs">
            <tr>
              <th className="w-8 px-2 py-1.5" aria-label="Send" />
              <th className="w-1/4 px-2 py-1.5 font-medium">Key</th>
              <th className="w-24 px-2 py-1.5 font-medium">Type</th>
              <th className="px-2 py-1.5 font-medium">Value</th>
              <th className="w-8 px-2 py-1.5" aria-label="Remove" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.id} className="border-line-soft border-t">
                <td className="px-2 py-1 text-center">
                  <input type="checkbox" checked={row.enabled} aria-label={`Send ${row.key || `field ${index + 1}`}`} onChange={(e) => change(row.id, { enabled: e.target.checked })} />
                </td>
                <td className="px-1 py-1">
                  <input className={`${INPUT} w-full font-mono`} value={row.key} placeholder="Key" aria-label="Key" spellCheck={false} onChange={(e) => change(row.id, { key: e.target.value })} />
                </td>
                <td className="px-1 py-1">
                  <select className={`${SELECT} w-full py-1.5 text-sm`} value={row.type} aria-label="Type" onChange={(e) => change(row.id, { type: e.target.value as FormRow['type'] })}>
                    <option value="text">Text</option>
                    <option value="file">File</option>
                  </select>
                </td>
                <td className="px-1 py-1">
                  {row.type === 'file' ? (
                    <div className="flex items-center gap-2">
                      <input
                        ref={(el) => {
                          if (el) pickers.current.set(row.id, el)
                          else pickers.current.delete(row.id)
                        }}
                        type="file"
                        className="hidden"
                        aria-label={`File for ${row.key || 'field'}`}
                        onChange={(e) => {
                          void choose(row.id, e.target.files?.[0])
                          e.target.value = ''
                        }}
                      />
                      <button type="button" className={GHOST_BTN} onClick={() => pickers.current.get(row.id)?.click()}>
                        {row.fileName ? 'Change file' : 'Choose file'}
                      </button>
                      {row.fileName ? (
                        <span className={`min-w-0 truncate font-mono text-xs ${row.data ? 'text-ink' : 'text-amber-300'}`} title={row.fileName}>
                          {row.fileName}
                          {row.data ? ` · ${formatBytes(row.data.length)}` : ' · choose it again'}
                        </span>
                      ) : (
                        <span className="text-ink-muted text-xs">No file chosen</span>
                      )}
                    </div>
                  ) : (
                    <input className={`${INPUT} w-full font-mono`} value={row.value} placeholder="Value" aria-label="Value" spellCheck={false} onChange={(e) => change(row.id, { value: e.target.value })} />
                  )}
                </td>
                <td className="px-1 py-1 text-center">
                  <button
                    type="button"
                    className="text-ink-muted hover:text-rose-300 px-1.5 text-base"
                    aria-label={`Remove ${row.key || `field ${index + 1}`}`}
                    onClick={() => onRows(rows.filter((r) => r.id !== row.id))}
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="text-ink-muted px-3 py-3 text-xs">
                  No fields yet. Add one for each part of the form, with text or a file.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-3">
        <button type="button" className={GHOST_BTN} onClick={() => onRows([...rows, newFormRow()])}>
          Add field
        </button>
        {fileError && <span className="text-sm text-rose-300">{fileError}</span>}
      </div>
    </div>
  )
}
