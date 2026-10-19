import { useMemo, useState } from 'react'
import { useCopyToClipboard } from '../../../shared/hooks/useCopyToClipboard'
import { CopyIcon } from '../../../shared/ui/icons'
import { CARD, CARD_HEADER, GHOST_BTN, SECTION_LABEL } from '../../../shared/ui/styles'
import { formatReport, sortResults } from '../nvxData'
import { CompareTable } from './CompareTable'
import { UnitResults } from './UnitResults'
import type { AnswerFormat } from './UnitResults'
import type { NvxUnit, RunResult, SettingValue } from '../types'

type View = 'units' | 'compare'

function Toggle<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { id: T; label: string; disabled?: boolean }[]; onChange: (v: T) => void }) {
  return (
    <div className="border-line flex rounded-md border p-0.5" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          aria-pressed={value === option.id}
          disabled={option.disabled}
          onClick={() => onChange(option.id)}
          className={`rounded px-3 py-1 text-xs font-semibold tracking-wide uppercase disabled:opacity-40 ${
            value === option.id ? 'bg-brand text-on-brand' : 'text-ink-muted hover:text-ink'
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
  onChange: (unit: NvxUnit, path: string, value: SettingValue) => void
  onOpenStream: (unit: NvxUnit) => void
}

/** The answers of the last run: a section per unit, or — with several units — one table comparing them. */
export function ResultsCard({ results, units, running, onClear, canChange, onChange, onOpenStream }: ResultsCardProps) {
  const [view, setView] = useState<View>('units')
  const [format, setFormat] = useState<AnswerFormat>('table')
  const [onlyDifferences, setOnlyDifferences] = useState(false)
  const { copied, copy } = useCopyToClipboard<string>()
  const sorted = useMemo(() => sortResults(results, units), [results, units])
  const canCompare = units.length > 1
  const shownView: View = canCompare ? view : 'units'

  return (
    <section className={CARD} aria-label="Results" aria-busy={running}>
      <header className={`${CARD_HEADER} flex-wrap`}>
        <h3 className={SECTION_LABEL}>Results</h3>
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
            <label className="text-ink-muted flex cursor-pointer items-center gap-2 text-sm">
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
      </header>
      <div className="space-y-8 p-4">
        {units.length === 0 && <p className="text-ink-muted py-4 text-center text-sm">Run a call to see the answer here.</p>}
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
              onChange={onChange}
              onOpenStream={onOpenStream}
            />
          ))}
      </div>
    </section>
  )
}
