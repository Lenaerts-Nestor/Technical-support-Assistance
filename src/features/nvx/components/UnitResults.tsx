import { useCopyToClipboard } from '../../../shared/hooks/useCopyToClipboard'
import { CopyIcon } from '../../../shared/ui/icons'
import { CHIP, GHOST_BTN, INSET } from '../../../shared/ui/styles'
import { flatten, prettyAnswer, splitPath } from '../nvxData'
import type { NvxUnit, RunResult } from '../types'

export type AnswerFormat = 'table' | 'json'

function Answer({ result, format }: { result: RunResult; format: AnswerFormat }) {
  const { reply } = result
  if (!reply.ok) {
    return (
      <p role="alert" className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
        {reply.error ?? 'No answer.'}
      </p>
    )
  }
  if (format === 'table' && reply.data !== undefined) {
    return (
      <dl className="grid grid-cols-[minmax(0,max-content)_minmax(0,1fr)] gap-x-8 gap-y-1.5 font-mono text-sm">
        {flatten(reply.data).map(({ path, value }) => {
          const { prefix, leaf } = splitPath(path)
          return (
            <div key={path} className="contents">
              <dt className="break-all" title={path}>
                <span className="text-ink-faint">{prefix}</span>
                <span className="text-ink-muted font-semibold">{leaf || '(value)'}</span>
              </dt>
              <dd className="text-ink font-medium break-all">{value}</dd>
            </div>
          )
        })}
      </dl>
    )
  }
  return <pre className="text-ink max-h-96 overflow-auto font-mono text-sm whitespace-pre-wrap">{prettyAnswer(reply) || '(empty answer)'}</pre>
}

function CallResult({ result, format }: { result: RunResult; format: AnswerFormat }) {
  const { copied, copy } = useCopyToClipboard<string>()
  const { reply } = result
  return (
    <article className={`${INSET} p-4`}>
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
        <h4 className="text-ink text-base font-semibold">{result.title}</h4>
        <span className="text-ink-muted font-mono text-xs">{result.path}</span>
        <span className={`${CHIP} ${reply.ok ? 'border-emerald-500/40 text-emerald-300' : 'border-rose-500/40 text-rose-300'}`}>
          {reply.ok ? `OK · ${reply.ms} ms` : (reply.status ?? 'No answer')}
        </span>
        {reply.ok && (
          <button type="button" className={`${GHOST_BTN} ml-auto`} onClick={() => void copy(prettyAnswer(reply), result.key)}>
            <CopyIcon className="h-3.5 w-3.5" />
            {copied === result.key ? 'Copied' : 'Copy JSON'}
          </button>
        )}
      </div>
      <Answer result={result} format={format} />
    </article>
  )
}

type UnitResultsProps = {
  unit: NvxUnit
  results: RunResult[]
  running: boolean
  format: AnswerFormat
}

/** Everything one unit answered in the last run: a header with its state and a card per call. */
export function UnitResults({ unit, results, running, format }: UnitResultsProps) {
  const failed = results.filter((r) => !r.reply.ok).length
  const waiting = running && results.length === 0
  const tone = failed > 0 ? 'bg-rose-400' : waiting ? 'bg-sky-400 animate-pulse' : 'bg-emerald-400'
  const state = failed > 0 ? `${failed} failed` : waiting ? 'waiting…' : `${results.length} answered`

  return (
    <section aria-label={unit.label || unit.ip} className="space-y-3">
      <h3 className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className={`${tone} h-2.5 w-2.5 rounded-full`} aria-hidden="true" />
        <span className="text-ink text-lg font-semibold">{unit.label || unit.ip}</span>
        <span className="text-ink-muted font-mono text-sm">{unit.ip}</span>
        <span className="text-ink-muted text-sm">· {state}</span>
      </h3>
      <div className="grid items-start gap-4 2xl:grid-cols-2">
        {results.map((result) => (
          <CallResult key={result.key} result={result} format={format} />
        ))}
      </div>
    </section>
  )
}
