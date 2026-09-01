import { INPUT, INPUT_HEADING, SECTION_LABEL } from '../../../shared/ui/styles'
import { BlockFrame } from './BlockFrame'
import type { BlockEditProps } from './blockEditProps'
import type { TablePart } from '../types'

const STEPPER_BTN =
  'border-line bg-surface text-ink-muted hover:border-line-strong hover:bg-subtle hover:text-ink h-6 w-6 rounded-md border transition-colors disabled:opacity-30'

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
    <span className="text-ink-muted inline-flex items-center gap-1.5 text-xs font-medium">
      {label}
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        disabled={value <= min}
        className={STEPPER_BTN}
      >
        −
      </button>
      <span className="text-ink w-4 text-center font-semibold">{value}</span>
      <button type="button" onClick={() => onChange(value + 1)} className={STEPPER_BTN}>
        +
      </button>
    </span>
  )
}

export function TableEdit({
  part,
  addr,
  index,
  count,
  nested,
  onMove,
  onRemove,
  d,
}: BlockEditProps<TablePart>) {
  const { headers, rows } = part.table

  return (
    <BlockFrame
      kind="table"
      chip="TBL · Table"
      index={index}
      count={count}
      nested={nested}
      onMove={onMove}
      onRemove={onRemove}
    >
      <label className={`mb-1.5 block ${SECTION_LABEL}`}>Table title</label>
      <input
        value={part.title}
        onChange={(e) => d.setTableTitle(addr, e.target.value)}
        placeholder="Table title (optional)…"
        className={INPUT_HEADING}
      />

      <div className="border-line bg-subtle mt-3 flex gap-5 rounded-lg border px-3 py-2">
        <Stepper
          label="Cols"
          value={headers.length}
          min={1}
          onChange={(n) => d.setTableCols(addr, n)}
        />
        <Stepper
          label="Rows"
          value={rows.length}
          min={0}
          onChange={(n) => d.setTableRows(addr, n)}
        />
      </div>

      <div className="mt-3 overflow-x-auto">
        <div className="min-w-full space-y-1">
          <div className="flex gap-1">
            {headers.map((h, c) => (
              <input
                key={c}
                value={h}
                onChange={(e) => d.setTableHeader(addr, c, e.target.value)}
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
                  onChange={(e) => d.setTableCell(addr, r, c, e.target.value)}
                  placeholder="…"
                  className={`${INPUT} min-w-[140px] flex-1`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </BlockFrame>
  )
}
