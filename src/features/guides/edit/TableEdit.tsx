import { Fragment } from 'react'
import { PlusIcon, XIcon } from '../components/icons'
import { DELETE_BTN, GHOST_BTN } from '../../../shared/ui/styles'
import { AutoTextarea, Field, GroupLabel, INPUT, INPUT_HEADING } from './fields'
import { BlockFrame } from './BlockFrame'
import { useFresh } from './editorUi'
import type { BlockEditProps } from './blockEditProps'
import type { TablePart } from '../types'

export function TableEdit({
  part,
  addr,
  index,
  count,
  nested,
  reorder,
  onMove,
  onRemove,
  d,
}: BlockEditProps<TablePart>) {
  const { headers, rows } = part.table
  const fresh = useFresh(part.id)
  const cols = headers.length

  return (
    <BlockFrame
      id={part.id}
      kind="table"
      chip="TBL · Table"
      summary={`${part.title || 'Untitled table'} · ${cols} × ${rows.length}`}
      index={index}
      count={count}
      nested={nested}
      reorder={reorder}
      onMove={onMove}
      onRemove={onRemove}
    >
      <Field label="Table title" hint="optional">
        <input
          value={part.title}
          onChange={(e) => d.setTableTitle(addr, e.target.value)}
          autoFocus={fresh}
          placeholder="e.g. LED meanings"
          className={INPUT_HEADING}
        />
      </Field>

      <div className="mt-4 flex items-center gap-2">
        <GroupLabel>
          Cells · {cols} column{cols === 1 ? '' : 's'}, {rows.length} row{rows.length === 1 ? '' : 's'}
        </GroupLabel>
        <span className="flex-1" />
        <button type="button" onClick={() => d.insertTableCol(addr, cols)} className={GHOST_BTN}>
          <PlusIcon className="h-3.5 w-3.5" />
          Add column
        </button>
        <button type="button" onClick={() => d.insertTableRow(addr, rows.length)} className={GHOST_BTN}>
          <PlusIcon className="h-3.5 w-3.5" />
          Add row
        </button>
      </div>

      <div className="mt-2 overflow-x-auto pb-1">
        <div
          className="grid min-w-full items-start gap-1.5"
          style={{ gridTemplateColumns: `1.5rem repeat(${cols}, minmax(9.5rem, 1fr)) 4rem` }}
        >
          {/* Column controls */}
          <span />
          {headers.map((_, c) => (
            <div key={c} className="flex items-center justify-between px-0.5">
              <span className="text-ink-faint text-[10px] font-semibold tracking-wide uppercase">
                Column {c + 1}
              </span>
              <button
                type="button"
                onClick={() => d.removeTableCol(addr, c)}
                disabled={cols <= 1}
                aria-label={`Delete column ${c + 1}`}
                title="Delete this column"
                className={`${DELETE_BTN} p-0.5 disabled:pointer-events-none disabled:opacity-30`}
              >
                <XIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <span />

          {/* Header row */}
          <span className="text-ink-faint pt-2.5 text-center text-[10px] font-bold">H</span>
          {headers.map((h, c) => (
            <input
              key={c}
              value={h}
              onChange={(e) => d.setTableHeader(addr, c, e.target.value)}
              aria-label={`Column ${c + 1} header`}
              placeholder={`Column ${c + 1}`}
              className={`${INPUT} bg-subtle font-semibold`}
            />
          ))}
          <span />

          {/* Body rows */}
          {rows.map((row, r) => (
            <Fragment key={r}>
              <span className="text-ink-faint pt-2.5 text-center text-[11px] font-medium">{r + 1}</span>
              {row.map((cell, c) => (
                <AutoTextarea
                  key={c}
                  value={cell}
                  onChange={(e) => d.setTableCell(addr, r, c, e.target.value)}
                  aria-label={`Row ${r + 1}, ${headers[c] || `column ${c + 1}`}`}
                  placeholder="…"
                  className={`${INPUT} resize-none`}
                />
              ))}
              <div className="flex items-center gap-0.5 pt-1.5">
                <button
                  type="button"
                  onClick={() => d.insertTableRow(addr, r + 1)}
                  aria-label={`Insert a row below row ${r + 1}`}
                  title="Insert a row below"
                  className="text-ink-faint hover:text-ink hover:bg-subtle rounded-md p-1"
                >
                  <PlusIcon className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => d.removeTableRow(addr, r)}
                  aria-label={`Delete row ${r + 1}`}
                  title="Delete this row"
                  className={`${DELETE_BTN} p-1`}
                >
                  <XIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            </Fragment>
          ))}
        </div>
      </div>
    </BlockFrame>
  )
}
