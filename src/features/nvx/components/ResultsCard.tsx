import { useState } from 'react'
import { useCopyToClipboard } from '../../../shared/hooks/useCopyToClipboard'
import { CopyIcon } from '../../../shared/ui/icons'
import { CARD, CARD_HEADER, CHIP, GHOST_BTN, INSET, SECTION_LABEL } from '../../../shared/ui/styles'
import { flatten, formatReport, prettyAnswer } from '../nvxData'
import type { RunResult } from '../types'

type View = 'table' | 'json'

const VIEWS: { id: View; label: string }[] = [
  { id: 'table', label: 'Table' },
  { id: 'json', label: 'JSON' },
]

function Answer({ result, view }: { result: RunResult; view: View }) {
  const { reply } = result
  if (!reply.ok) {
    return (
      <p role="alert" className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
        {reply.error ?? 'No answer.'}
      </p>
    )
  }
  if (view === 'table' && reply.data !== undefined) {
    return (
      <dl className="grid grid-cols-[minmax(0,max-content)_minmax(0,1fr)] gap-x-6 gap-y-1 font-mono text-xs">
        {flatten(reply.data).map(({ path, value }) => (
          <div key={path} className="contents">
            <dt className="text-ink-muted break-all">{path || '(value)'}</dt>
            <dd className="text-ink break-all">{value}</dd>
          </div>
        ))}
      </dl>
    )
  }
  return <pre className="text-ink max-h-96 overflow-auto font-mono text-xs whitespace-pre-wrap">{prettyAnswer(reply) || '(empty answer)'}</pre>
}

type ResultsCardProps = {
  results: RunResult[]
  running: boolean
  onClear: () => void
}

/** The answers of the last run, as a table or as JSON, with a copyable report for a case note. */
export function ResultsCard({ results, running, onClear }: ResultsCardProps) {
  const [view, setView] = useState<View>('table')
  const { copied, copy } = useCopyToClipboard<string>()

  return (
    <section className={CARD} aria-label="Results" aria-busy={running}>
      <header className={CARD_HEADER}>
        <h3 className={SECTION_LABEL}>Results</h3>
        <div className="flex flex-wrap items-center gap-2">
          <div className="border-line flex rounded-md border p-0.5" role="group" aria-label="Show answers as">
            {VIEWS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                aria-pressed={view === id}
                onClick={() => setView(id)}
                className={`rounded px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase ${
                  view === id ? 'bg-brand text-on-brand' : 'text-ink-muted hover:text-ink'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <button type="button" className={GHOST_BTN} disabled={results.length === 0} onClick={() => void copy(formatReport(results), 'report')}>
            <CopyIcon className="h-3.5 w-3.5" />
            {copied === 'report' ? 'Copied' : 'Copy report'}
          </button>
          <button type="button" className={GHOST_BTN} disabled={results.length === 0 && !running} onClick={onClear}>
            Clear
          </button>
        </div>
      </header>
      <div className="space-y-3 p-4">
        {results.length === 0 && (
          <p className="text-ink-muted py-4 text-center text-sm">{running ? 'Waiting for the device…' : 'Run a call to see the answer here.'}</p>
        )}
        {results.map((result) => (
          <article key={result.key} className={`${INSET} p-3`}>
            <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
              <h4 className="text-ink text-sm font-semibold">{result.title}</h4>
              <span className="text-ink-muted font-mono text-xs">
                {result.unit.label || result.unit.ip} · {result.path}
              </span>
              <span className={`${CHIP} ${result.reply.ok ? 'border-emerald-500/40 text-emerald-300' : 'border-rose-500/40 text-rose-300'}`}>
                {result.reply.ok ? `OK · ${result.reply.ms} ms` : (result.reply.status ?? 'No answer')}
              </span>
            </div>
            <Answer result={result} view={view} />
          </article>
        ))}
        {running && results.length > 0 && <p className="text-ink-muted text-xs">Waiting for the device…</p>}
      </div>
    </section>
  )
}
