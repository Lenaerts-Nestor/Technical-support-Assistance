import type { TablePart } from '../types'

/** A reference table: tinted header row, horizontal scroll on overflow. */
export function TableView({ part }: { part: TablePart }) {
  const { headers, rows } = part.table

  return (
    <section
      id={part.id}
      className="scroll-mt-24 overflow-hidden rounded-xl border border-slate-200 bg-white"
    >
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2.5">
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
          TBL
        </span>
        <span className="text-sm font-semibold text-slate-900">{part.title || 'Table'}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              {headers.map((h, i) => (
                <th
                  key={i}
                  className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, r) => (
              <tr key={r} className="even:bg-slate-50/50">
                {row.map((cell, c) => (
                  <td
                    key={c}
                    className="border-b border-slate-100 px-3 py-2 align-top text-slate-600"
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
