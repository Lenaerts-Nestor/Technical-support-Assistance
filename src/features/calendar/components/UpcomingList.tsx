import { formatShort, parseIso, weekdayIndex, WEEKDAY_NAMES } from '../calendarData'
import { KIND_STYLE } from '../calendarStyles'
import { SECTION_LABEL } from '../../../shared/ui/styles'
import type { LeaveRun } from '../types'

type UpcomingListProps = {
  runs: LeaveRun[]
  today: string
  onPick: (date: string) => void
}

/** The next few days away, soonest first — a coloured card each, like an agenda. */
export function UpcomingList({ runs, today, onPick }: UpcomingListProps) {
  return (
    <aside aria-label="Coming up" className="space-y-3">
      <h3 className={SECTION_LABEL}>Coming up</h3>
      {runs.length === 0 && (
        <p className="border-line-strong text-ink-muted rounded-xl border border-dashed px-4 py-8 text-center text-sm">
          Nothing planned. Pick a day on the calendar to mark it.
        </p>
      )}
      {runs.map((run) => {
        const style = KIND_STYLE[run.kind]
        const ongoing = run.start <= today
        const multi = run.start !== run.end
        const when = multi
          ? `${formatShort(run.start, run.start.slice(0, 4) !== run.end.slice(0, 4))} – ${formatShort(run.end, true)}`
          : `${WEEKDAY_NAMES[weekdayIndex(run.start)]}, ${formatShort(run.start, true)}`
        return (
          <button
            key={`${run.start}-${run.kind}-${run.note}`}
            type="button"
            onClick={() => onPick(run.start)}
            className={`${style.fill} flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left shadow-card transition-transform hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus`}
          >
            <span className="text-3xl leading-none font-bold tabular-nums">{parseIso(run.start)?.day}</span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="truncate text-sm font-bold tracking-wide uppercase">
                  {run.kind === 'pto' ? 'PTO' : run.note || 'Other'}
                </span>
                {ongoing && (
                  <span className="shrink-0 rounded bg-black/15 px-1.5 py-0.5 text-[10px] font-bold uppercase">
                    {run.start === today && !multi ? 'Today' : 'Ongoing'}
                  </span>
                )}
              </span>
              <span className="block truncate text-xs font-medium opacity-80">
                {when}
                {multi && ` · ${run.days} ${run.days === 1 ? 'day' : 'days'}`}
              </span>
            </span>
          </button>
        )
      })}
    </aside>
  )
}
