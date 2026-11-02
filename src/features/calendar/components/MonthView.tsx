import { MONTH_NAMES, WEEKDAY_NAMES, formatLong, isWeekend, monthCells } from '../calendarData'
import type { MonthRef } from '../calendarData'
import { KIND_STYLE, TODAY_RING } from '../calendarStyles'
import { CARD } from '../../../shared/ui/styles'
import type { CalendarEntry } from '../types'

type MonthViewProps = {
  month: MonthRef
  today: string
  byDate: ReadonlyMap<string, CalendarEntry>
  onPick: (date: string) => void
}

/** One month as a Monday-first grid; each day is a button that opens the date dialog. */
export function MonthView({ month, today, byDate, onPick }: MonthViewProps) {
  const cells = monthCells(month)

  return (
    <div className={`${CARD} overflow-hidden`}>
      <div className="border-line-soft bg-subtle grid grid-cols-7 border-b">
        {WEEKDAY_NAMES.map((name, i) => (
          <div
            key={name}
            className={`px-2 py-2 text-center text-[11px] font-semibold tracking-[0.08em] uppercase ${
              i >= 5 ? 'text-ink-faint' : 'text-ink-muted'
            }`}
          >
            {name.slice(0, 3)}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map(({ iso, inMonth }) => {
          const entry = byDate.get(iso)
          const isToday = iso === today
          const day = Number(iso.slice(8))
          const label = entry ? (entry.kind === 'pto' ? 'PTO' : entry.note || 'Other') : null
          const title = `${formatLong(iso)}${entry ? ` — ${KIND_STYLE[entry.kind].label}${entry.note ? `: ${entry.note}` : ''}` : ''}`
          const first = day === 1 ? MONTH_NAMES[Number(iso.slice(5, 7)) - 1].slice(0, 3) : null
          return (
            <button
              key={iso}
              type="button"
              onClick={() => onPick(iso)}
              title={title}
              aria-label={title}
              className={`border-line-soft relative flex min-h-[92px] flex-col items-start justify-between gap-1 border-r border-b p-2 text-left transition-colors focus-visible:z-10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus [&:nth-child(7n)]:border-r-0 ${
                entry
                  ? `${KIND_STYLE[entry.kind].fill} ${inMonth ? '' : 'opacity-50'}`
                  : `${isWeekend(iso) ? 'bg-canvas' : 'bg-surface'} ${inMonth ? 'text-ink hover:bg-subtle' : 'text-ink-faint hover:bg-subtle'}`
              } ${isToday ? TODAY_RING : ''}`}
            >
              <span
                className={`flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs font-semibold ${
                  isToday ? 'bg-brand text-on-brand' : ''
                }`}
              >
                {first ? `${first} ${day}` : day}
              </span>
              {label && <span className="w-full truncate text-xs font-bold">{label}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
