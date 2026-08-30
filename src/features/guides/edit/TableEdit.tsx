import { INPUT } from './fieldStyles'
import { PartFrame } from './PartFrame'
import type { GuideDraftController } from '../useGuideDraft'
import type { TablePart } from '../types'

type TableEditProps = {
  part: TablePart
  index: number
  count: number
  d: GuideDraftController
}

function Stepper({
  label,
  value,
  onChange,
  min,
}: {
  label: string
  value: number
  onChange: (n: number) => void
  min: number
}) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-slate-500">
      {label}:
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        disabled={value <= min}
        className="h-5 w-5 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
      >
        −
      </button>
      <span className="w-4 text-center font-medium text-slate-700">{value}</span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="h-5 w-5 rounded border border-slate-200 text-slate-600 hover:bg-slate-50"
      >
        +
      </button>
    </span>
  )
}

export function TableEdit({ part, index, count, d }: TableEditProps) {
  const { headers, rows } = part.table

  return (
    <PartFrame
      chip="TBL · Table"
      index={index}
      count={count}
      onMove={(dir) => d.movePart(part.id, dir)}
      onRemove={() => d.removePart(part.id)}
    >
      <input
        value={part.title}
        onChange={(e) => d.setTableTitle(part.id, e.target.value)}
        placeholder="Table title (optional)…"
        className={`${INPUT} font-semibold`}
      />

      <div className="mt-2 flex gap-4">
        <Stepper
          label="Cols"
          value={headers.length}
          min={1}
          onChange={(n) => d.setTableCols(part.id, n)}
        />
        <Stepper
          label="Rows"
          value={rows.length}
          min={0}
          onChange={(n) => d.setTableRows(part.id, n)}
        />
      </div>

      <div className="mt-2 overflow-x-auto">
        <div className="min-w-full space-y-1">
          <div className="flex gap-1">
            {headers.map((h, c) => (
              <input
                key={c}
                value={h}
                onChange={(e) => d.setTableHeader(part.id, c, e.target.value)}
                placeholder={`Column ${c + 1}`}
                className={`${INPUT} min-w-[140px] flex-1 font-semibold`}
              />
            ))}
          </div>
          {rows.map((row, r) => (
            <div key={r} className="flex gap-1">
              {row.map((cell, c) => (
                <input
                  key={c}
                  value={cell}
                  onChange={(e) => d.setTableCell(part.id, r, c, e.target.value)}
                  placeholder="…"
                  className={`${INPUT} min-w-[140px] flex-1`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </PartFrame>
  )
}
