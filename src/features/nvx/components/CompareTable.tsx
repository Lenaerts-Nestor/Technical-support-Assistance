import { useMemo } from 'react'
import { compareRows, splitPath } from '../nvxData'
import type { NvxUnit, RunResult } from '../types'

type CompareTableProps = {
  results: RunResult[]
  units: NvxUnit[]
  onlyDifferences: boolean
}

/** The units side by side: one row per property, the ones that differ highlighted. */
export function CompareTable({ results, units, onlyDifferences }: CompareTableProps) {
  const rows = useMemo(() => compareRows(results, units), [results, units])
  const shown = onlyDifferences ? rows.filter((r) => r.differs) : rows
  const failedUnits = new Set(results.filter((r) => !r.reply.ok).map((r) => r.unit.id))

  if (rows.length === 0) return <p className="text-ink-muted py-4 text-center text-sm">No answers to compare yet.</p>

  return (
    <div className="space-y-3">
      <p className="text-ink-muted text-sm">
        {rows.filter((r) => r.differs).length} of {rows.length} properties differ between the units.
      </p>
      <div className="border-line overflow-x-auto rounded-lg border">
        <table className="w-full border-collapse font-mono text-sm">
          <thead>
            <tr className="bg-subtle text-left">
              <th className="text-ink-muted px-3 py-2 font-sans text-xs font-semibold tracking-wide uppercase">Property</th>
              {units.map((unit) => (
                <th key={unit.id} className="text-ink px-3 py-2 font-sans text-sm font-semibold">
                  {unit.label || unit.ip}
                  <span className="text-ink-muted block font-mono text-xs font-normal">{unit.ip}</span>
                  {failedUnits.has(unit.id) && <span className="text-xs font-normal text-rose-300">some calls failed</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((row) => {
              const { prefix, leaf } = splitPath(row.path)
              return (
                <tr key={row.path} className="border-line-soft border-t">
                  <td className={`px-3 py-1.5 align-top break-all ${row.differs ? 'border-brand border-l-2' : 'border-l-2 border-transparent'}`} title={row.path}>
                    <span className="text-ink-faint">{prefix}</span>
                    <span className="text-ink-muted font-semibold">{leaf}</span>
                  </td>
                  {row.values.map((value, i) => (
                    <td
                      key={units[i].id}
                      className={`px-3 py-1.5 align-top break-all ${
                        row.differs ? 'bg-brand-soft text-brand-strong font-semibold' : 'text-ink font-medium'
                      }`}
                    >
                      {value ?? <span className="text-ink-faint">—</span>}
                    </td>
                  ))}
                </tr>
              )
            })}
            {shown.length === 0 && (
              <tr>
                <td colSpan={units.length + 1} className="text-ink-muted px-3 py-6 text-center font-sans">
                  Every property is the same on all units.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
