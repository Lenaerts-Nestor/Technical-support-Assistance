import { MONTH_NAMES, daysInMonth, formatLong, isWeekend, toIso } from '../calendarData'
import { KIND_STYLE, TODAY_RING } from '../calendarStyles'
import { CARD } from '../../../shared/ui/styles'
import type { CalendarEntry } from '../types'

type YearViewProps = {
  year: number
  today: string
  byDate: ReadonlyMap<string, CalendarEntry>
  onPick: (date: string) => void
}

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1)
const COLUMNS = { gridTemplateColumns: '5.5rem repeat(31, minmax(0, 1fr))' }

/** The whole year at a glance: a row per month, a column per day of the month. */
export function YearView({ year, today, byDate, onPick }: YearViewProps) {
  return (
    <div className={`${CARD} overflow-x-auto`}>
      <div className="min-w-[960px] p-3">
        <div className="grid gap-px" style={COLUMNS} role="grid" aria-label={`${year} overview`}>
          <div />
          {DAYS.map((d) => (
            <div key={d} className="text-ink-faint pb-1 text-center text-[10px] font-semibold">
              {d}
            </div>
          ))}
          {MONTH_NAMES.map((name, month) => {
            const length = daysInMonth(year, month)
            return (
              <div key={name} className="contents" role="row">
                <div className="text-ink-muted flex items-center pr-2 text-xs font-medium">{name}</div>
                {DAYS.map((day) => {
                  if (day > length) return <div key={day} aria-hidden="true" />
                  const iso = toIso(year, month, day)
                  const entry = byDate.get(iso)
                  const title = `${formatLong(iso)}${entry ? ` — ${KIND_STYLE[entry.kind].label}${entry.note ? `: ${entry.note}` : ''}` : ''}`
                  return (
                    <button
                      key={day}
                      type="button"
                      role="gridcell"
                      onClick={() => onPick(iso)}
                      title={title}
                      aria-label={title}
                      className={`h-9 rounded-[3px] border transition-colors focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-brand ${
                        entry
                          ? `${KIND_STYLE[entry.kind].fill} border-black/30`
                          : isWeekend(iso)
                            ? 'bg-canvas border-line-soft hover:border-line-strong'
                            : 'bg-subtle border-line-soft hover:border-line-strong'
                      } ${iso === today ? TODAY_RING : ''}`}
                    />
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
