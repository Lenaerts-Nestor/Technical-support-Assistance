import { CARD } from '../../../shared/ui/styles'
import type { TablePart } from '../types'

type TableViewProps = {
  part: TablePart
  /** Nested inside a chapter/section card — drops a level of border weight. */
  nested?: boolean
}

/** A reference table: tinted header row, horizontal scroll on overflow. */
export function TableView({ part, nested = false }: TableViewProps) {
  return (
    <section
      id={nested ? undefined : part.id}
      className={
        nested
          ? 'border-line bg-canvas overflow-hidden rounded-lg border'
          : `${CARD} scroll-mt-20 overflow-hidden`
      }
    >
      <div className="border-line-soft bg-subtle flex items-center gap-2 border-b px-4 py-2.5">
        <span className="rounded-md bg-teal-400/15 px-1.5 py-0.5 text-[10px] font-bold tracking-[0.06em] text-teal-200 uppercase ring-1 ring-teal-400/30">
          TBL
        </span>
        <span className="text-ink text-[15px] font-semibold">{part.title || 'Table'}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[15px]">
          <thead>
            <tr>
              {part.table.headers.map((h, i) => (
                <th
                  key={i}
                  className="border-line text-ink bg-subtle border-b px-3.5 py-2.5 text-left font-semibold tracking-[0.02em]"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {part.table.rows.map((row, r) => (
              <tr key={r} className="even:bg-subtle/50">
                {row.map((cell, c) => (
                  <td
                    key={c}
                    className="border-line-soft text-ink-muted border-b px-3.5 py-2.5 align-top leading-relaxed"
                  >
                    <span className="whitespace-pre-line">{cell}</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
