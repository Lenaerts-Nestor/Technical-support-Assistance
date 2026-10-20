import { useCopyToClipboard } from '../../../shared/hooks/useCopyToClipboard'
import { CopyIcon } from '../../../shared/ui/icons'
import { CHIP, GHOST_BTN, INSET } from '../../../shared/ui/styles'
import { flatten, getAtPath, prettyAnswer, splitPath } from '../nvxData'
import { EditableValue } from './EditableValue'
import type { NvxUnit, RunResult, SettingValue } from '../types'

export type AnswerFormat = 'table' | 'json'

type EditProps = {
  /** Changes are allowed and a login is ready, so values can be edited. */
  canChange: boolean
  onChange: (unit: NvxUnit, path: string, value: SettingValue) => void
}

function Answer({ result, format, canChange, onChange }: { result: RunResult; format: AnswerFormat } & EditProps) {
  const { reply } = result
  if (!reply.ok) {
    return (
      <p role="alert" className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
        {reply.error ?? 'No answer.'}
      </p>
    )
  }
  if (reply.image) {
    return (
      // A picture the device sent (for example a preview). It is shown as an image, never run as anything.
      <img src={`data:${reply.image.type};base64,${reply.image.base64}`} alt={`${result.title} from ${result.unit.label || result.unit.ip}`} className="border-line max-h-[32rem] max-w-full rounded-md border object-contain" />
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
              <dd>
                <EditableValue
                  path={path}
                  raw={getAtPath(reply.data, path)}
                  text={value}
                  enabled={canChange}
                  onSubmit={(next) => onChange(result.unit, path, next)}
                />
              </dd>
            </div>
          )
        })}
      </dl>
    )
  }
  return <pre className="text-ink max-h-96 overflow-auto font-mono text-sm whitespace-pre-wrap">{prettyAnswer(reply) || '(empty answer)'}</pre>
}

const formatBytes = (n: number) => (n < 1024 ? `${n} B` : `${(n / 1024).toFixed(1)} KB`)

function CallResult({ result, format, canChange, onChange }: { result: RunResult; format: AnswerFormat } & EditProps) {
  const { copied, copy } = useCopyToClipboard<string>()
  const { reply } = result
  return (
    <article className={`${INSET} p-4`}>
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
        <h4 className="text-ink text-base font-semibold">{result.title}</h4>
        <span className="text-ink-muted font-mono text-xs">
          {result.method} {result.path}
        </span>
        <span className={`${CHIP} ${reply.ok ? 'border-emerald-500/40 text-emerald-300' : 'border-rose-500/40 text-rose-300'}`}>
          {reply.ok ? `${reply.status} · ${reply.ms} ms${reply.bytes === undefined ? '' : ` · ${formatBytes(reply.bytes)}`}` : (reply.status ?? 'No answer')}
        </span>
        {reply.ok && !reply.image && (
          <button type="button" className={`${GHOST_BTN} ml-auto`} onClick={() => void copy(prettyAnswer(reply), result.key)}>
            <CopyIcon className="h-3.5 w-3.5" />
            {copied === result.key ? 'Copied' : 'Copy JSON'}
          </button>
        )}
      </div>
      <Answer result={result} format={format} canChange={canChange} onChange={onChange} />
      {reply.headers && Object.keys(reply.headers).length > 0 && (
        <details className="text-ink-muted mt-3">
          <summary className="cursor-pointer text-xs">Response headers ({Object.keys(reply.headers).length})</summary>
          <dl className="mt-2 grid grid-cols-[max-content_minmax(0,1fr)] gap-x-4 gap-y-0.5 font-mono text-xs">
            {Object.entries(reply.headers).map(([name, value]) => (
              <div key={name} className="contents">
                <dt>{name}</dt>
                <dd className="text-ink break-all">{value}</dd>
              </div>
            ))}
          </dl>
        </details>
      )}
    </article>
  )
}

type UnitResultsProps = EditProps & {
  unit: NvxUnit
  results: RunResult[]
  running: boolean
  format: AnswerFormat
}

/** Everything one unit answered in the last run: a header with its state and a card per call. */
export function UnitResults({ unit, results, running, format, canChange, onChange }: UnitResultsProps) {
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
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(26rem,100%),1fr))] items-start gap-4">
        {results.map((result) => (
          <CallResult key={result.key} result={result} format={format} canChange={canChange} onChange={onChange} />
        ))}
      </div>
    </section>
  )
}
