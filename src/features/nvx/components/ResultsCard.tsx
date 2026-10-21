import { useMemo, useState } from 'react'
import { useCopyToClipboard } from '../../../shared/hooks/useCopyToClipboard'
import { CopyIcon } from '../../../shared/ui/icons'
import { CARD, GHOST_BTN } from '../../../shared/ui/styles'
import { formatReport, sortResults } from '../nvxData'
import { CompareTable } from './CompareTable'
import { PlayIcon } from './icons'
import { StatusChip, StepHeader } from './StepHeader'
import { UnitResults } from './UnitResults'
import type { AnswerFormat } from './UnitResults'
import type { NvxUnit, RunResult, SettingValue } from '../types'

type View = 'units' | 'compare'

function Toggle<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { id: T; label: string; disabled?: boolean }[]; onChange: (v: T) => void }) {
  return (
    <div className="border-line-strong bg-field/60 flex rounded-md border p-0.5" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          aria-pressed={value === option.id}
          disabled={option.disabled}
          onClick={() => onChange(option.id)}
          className={`rounded px-3 py-1 text-xs font-bold tracking-wide uppercase disabled:opacity-40 ${
            value === option.id ? 'bg-brand text-on-brand shadow-btn' : 'text-ink-soft hover:text-ink'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

type ResultsCardProps = {
  results: RunResult[]
  /** The units of the latest run, in order. */
  units: NvxUnit[]
  running: boolean
  onClear: () => void
  canChange: boolean
  edits: Readonly<Record<string, Readonly<Record<string, SettingValue>>>>
  onEdit: (unit: NvxUnit, path: string, value: SettingValue | undefined) => void
  onSendEdits: (unit: NvxUnit) => void
  onDiscardEdits: (unit: NvxUnit) => void
}

/** Step 3, Results: the answers of the last run — a section per unit, or, with several units, one table comparing them. */
export function ResultsCard({ results, units, running, onClear, canChange, edits, onEdit, onSendEdits, onDiscardEdits }: ResultsCardProps) {
  const [view, setView] = useState<View>('units')
  const [format, setFormat] = useState<AnswerFormat>('table')
  const [onlyDifferences, setOnlyDifferences] = useState(false)
  const { copied, copy } = useCopyToClipboard<string>()
  const sorted = useMemo(() => sortResults(results, units), [results, units])
  const canCompare = units.length > 1
  const shownView: View = canCompare ? view : 'units'
  const failed = results.filter((r) => !r.reply.ok).length

  return (
    <section
      className={`${CARD} flex flex-col transition-colors xl:max-h-[calc(100vh-2.5rem)] ${running ? '!border-brand-line' : ''}`}
      aria-label="Results"
      aria-busy={running}
    >
      <StepHeader
        step={3}
        title="Results"
        state={running ? 'next' : results.length > 0 ? 'done' : 'idle'}
        status={
          running ? (
            <StatusChip tone="info" pulse>
              Running…
            </StatusChip>
          ) : results.length > 0 ? (
            <StatusChip tone={failed > 0 ? 'warn' : 'ok'}>{failed > 0 ? `${failed} of ${results.length} failed` : `${results.length} answered`}</StatusChip>
          ) : (
            <StatusChip tone="quiet">Nothing sent yet</StatusChip>
          )
        }
      >
        <div className="flex flex-wrap items-center gap-3">
          {canCompare && (
            <Toggle
              label="Show"
              value={shownView}
              options={[
                { id: 'units', label: 'By unit' },
                { id: 'compare', label: 'Compare' },
              ]}
              onChange={setView}
            />
          )}
          {shownView === 'units' ? (
            <Toggle
              label="Show answers as"
              value={format}
              options={[
                { id: 'table', label: 'Table' },
                { id: 'json', label: 'JSON' },
              ]}
              onChange={setFormat}
            />
          ) : (
            <label className="text-ink-soft flex cursor-pointer items-center gap-2 text-sm font-medium">
              <input type="checkbox" className="accent-brand h-4 w-4" checked={onlyDifferences} onChange={(e) => setOnlyDifferences(e.target.checked)} />
              Only differences
            </label>
          )}
          <button type="button" className={GHOST_BTN} disabled={results.length === 0} onClick={() => void copy(formatReport(sorted), 'report')}>
            <CopyIcon className="h-3.5 w-3.5" />
            {copied === 'report' ? 'Copied' : 'Copy report'}
          </button>
          <button type="button" className={GHOST_BTN} disabled={results.length === 0 && !running} onClick={onClear}>
            Clear
          </button>
        </div>
      </StepHeader>
      <div className="min-h-0 flex-1 space-y-8 overflow-y-auto p-4">
        {units.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-10 text-center">
            <span className="border-line-strong bg-field/60 flex h-12 w-12 items-center justify-center rounded-full border">
              <PlayIcon className="text-ink-muted h-5 w-5" />
            </span>
            <div className="space-y-1">
              <p className="text-ink text-base font-semibold">The answer will appear here</p>
              <p className="text-ink-muted mx-auto max-w-sm text-sm">
                Press <PlayIcon className="text-ink-soft mx-0.5 inline h-3 w-3 align-[-1px]" /> on a saved call, or build a request and press <span className="text-ink-soft font-semibold">Send</span>. Each unit answers in its own section.
              </p>
            </div>
          </div>
        )}
        {units.length > 0 && shownView === 'compare' && <CompareTable results={sorted} units={units} onlyDifferences={onlyDifferences} />}
        {units.length > 0 &&
          shownView === 'units' &&
          units.map((unit) => (
            <UnitResults
              key={unit.id}
              unit={unit}
              results={sorted.filter((r) => r.unit.id === unit.id)}
              running={running}
              format={format}
              canChange={canChange}
              edits={edits}
              onEdit={onEdit}
              onSendEdits={onSendEdits}
              onDiscardEdits={onDiscardEdits}
            />
          ))}
      </div>
    </section>
  )
}
