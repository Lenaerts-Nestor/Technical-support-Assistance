import { useState } from 'react'
import { CARD, CARD_HEADER, GHOST_BTN, INPUT, PRIMARY_BTN, SECTION_LABEL, TEXTAREA } from '../../../shared/ui/styles'
import { normalizePath } from '../nvxData'

type Method = 'GET' | 'POST'

type ExplorerCardProps = {
  path: string
  onPath: (path: string) => void
  blockedReason: string | null
  running: boolean
  onSend: (path: string) => void
  onSave: (path: string) => void
  /** Why a change cannot be sent now (changes off, no single unit ticked…), or `null`. */
  changeBlockedReason: string | null
  /** Called with the parsed JSON when a change is sent; the page asks for confirmation. */
  onChange: (body: Record<string, unknown>) => void
}

const EXAMPLE_BODY = '{"Device":{"Ethernet":{"HostName":"NVX-1"}}}'

/** Try any path on the ticked units and see the answer; or (when changes are allowed) send a partial object to /Device. */
export function ExplorerCard({ path, onPath, blockedReason, running, onSend, onSave, changeBlockedReason, onChange }: ExplorerCardProps) {
  const [method, setMethod] = useState<Method>('GET')
  const [body, setBody] = useState('')
  const clean = normalizePath(path)

  let parsed: Record<string, unknown> | null = null
  let bodyError: string | null = null
  if (method === 'POST' && body.trim()) {
    try {
      const value: unknown = JSON.parse(body)
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) parsed = value as Record<string, unknown>
      else bodyError = 'The change must be a JSON object.'
    } catch {
      bodyError = 'That is not valid JSON.'
    }
  }

  return (
    <section className={CARD} aria-label="Explorer">
      <header className={CARD_HEADER}>
        <h3 className={SECTION_LABEL}>Explorer</h3>
        <div className="border-line flex rounded-md border p-0.5" role="group" aria-label="Method">
          {(['GET', 'POST'] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={method === m}
              onClick={() => setMethod(m)}
              className={`rounded px-3 py-0.5 font-mono text-xs font-semibold ${method === m ? 'bg-brand text-on-brand' : 'text-ink-muted hover:text-ink'}`}
            >
              {m}
            </button>
          ))}
        </div>
      </header>
      {method === 'GET' ? (
        <form
          className="space-y-2 p-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (clean && !blockedReason && !running) onSend(clean)
          }}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-ink-muted font-mono text-sm font-semibold">GET</span>
            <input
              className={`${INPUT} min-w-[16rem] flex-1 py-2 font-mono text-[15px]`}
              value={path}
              placeholder="/Device/DeviceInfo"
              aria-label="Path on the device"
              spellCheck={false}
              autoComplete="off"
              onChange={(e) => onPath(e.target.value)}
            />
            <button type="submit" className={PRIMARY_BTN} disabled={!clean || blockedReason !== null || running}>
              Send
            </button>
            <button type="button" className={GHOST_BTN} disabled={!clean} onClick={() => clean && onSave(clean)}>
              Save as call
            </button>
          </div>
          {path.trim() && !clean && <p className="text-sm text-rose-300">That is not a path the app can send. It must start with / and have no spaces.</p>}
          {blockedReason && <p className="text-ink-muted text-sm">{blockedReason}</p>}
        </form>
      ) : (
        <form
          className="space-y-2 p-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (parsed && !changeBlockedReason && !running) onChange(parsed)
          }}
        >
          <p className="text-ink-muted text-sm">
            Sends a partial object to <span className="text-ink font-mono">/Device</span>. Only the properties you include are changed. An empty
            object is blocked, because the device would delete it.
          </p>
          <textarea
            className={`${TEXTAREA} font-mono text-[15px]`}
            rows={5}
            value={body}
            placeholder={EXAMPLE_BODY}
            aria-label="Change to send"
            spellCheck={false}
            onChange={(e) => setBody(e.target.value)}
          />
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" className={PRIMARY_BTN} disabled={!parsed || changeBlockedReason !== null || running}>
              Review change…
            </button>
            {bodyError && <span className="text-sm text-rose-300">{bodyError}</span>}
            {changeBlockedReason && <span className="text-ink-muted text-sm">{changeBlockedReason}</span>}
          </div>
        </form>
      )}
    </section>
  )
}
