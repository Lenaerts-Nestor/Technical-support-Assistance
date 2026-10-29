import { useMemo, useState } from 'react'
import { useCalendarData } from '../../app/appDataContext'
import { useSharedShift } from '../shift/sharedShiftContext'
import {
  MONTH_NAMES,
  countDays,
  monthOf,
  shiftMonth,
  upcomingRuns,
} from './calendarData'
import type { MonthRef } from './calendarData'
import { KIND_STYLE, TODAY_RING } from './calendarStyles'
import { DayDialog } from './components/DayDialog'
import { ChevronLeftIcon, ChevronRightIcon } from './components/icons'
import { MonthView } from './components/MonthView'
import { UpcomingList } from './components/UpcomingList'
import { YearView } from './components/YearView'
import { useToday } from './useToday'
import { PlusIcon } from '../../shared/ui/icons'
import { GHOST_BTN_MD, ICON_BTN, PAGE_SUBTITLE, PAGE_TITLE, PRIMARY_BTN } from '../../shared/ui/styles'
import type { CalendarEntry } from './types'
import type { DatabaseStatus } from './useCalendar'

type View = 'month' | 'all'

/** Where the days are kept besides this computer — or what to do (pick a name in the sidebar) to keep them there. */
function DatabaseNote({ status, me }: { status: DatabaseStatus; me: string | null }) {
  const text =
    status === 'off'
      ? 'pick who you are in the sidebar to also keep it in the database'
      : status === 'synced'
        ? `saved to the database as ${me}`
        : status === 'error'
          ? 'the database could not be reached, trying again'
          : 'syncing with the database'
  return (
    <span role="status" className={status === 'error' ? 'text-rose-400' : 'text-ink-faint'}>
      {' '}
      · {text}
    </span>
  )
}

const VIEWS: { id: View; label: string }[] = [
  { id: 'month', label: 'Month' },
  { id: 'all', label: 'All' },
]

/**
 * A personal calendar for days away: mark a day (or a span) as PTO or something
 * else, see the next five coming up, and zoom out to the whole year. It follows
 * today's date by itself until the user moves away from it.
 */
export function CalendarPage() {
  const calendar = useCalendarData()
  const { enabled: serviceOn, me } = useSharedShift()
  const today = useToday()
  const [view, setView] = useState<View>('month')
  /** The month the user navigated to; `null` follows today's month. */
  const [anchor, setAnchor] = useState<MonthRef | null>(null)
  /** The date being edited in the dialog. */
  const [picked, setPicked] = useState<string | null>(null)

  const shown = anchor ?? monthOf(today)
  const byDate = useMemo(
    () => new Map<string, CalendarEntry>(calendar.entries.map((e) => [e.date, e])),
    [calendar.entries],
  )
  const upcoming = useMemo(() => upcomingRuns(calendar.entries, today, 5), [calendar.entries, today])
  const totals = countDays(calendar.entries, shown.year)

  const step = (direction: 1 | -1) => setAnchor(shiftMonth(shown, direction * (view === 'all' ? 12 : 1)))
  const noun = view === 'all' ? 'year' : 'month'
  const atToday = anchor === null

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 px-8 py-7">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className={PAGE_TITLE}>Calendar</h2>
          <p className={PAGE_SUBTITLE}>
            Your PTO and other days away
            {calendar.savedToFile && <span className="text-ink-faint"> · saved to calendar.json</span>}
            {serviceOn && <DatabaseNote status={calendar.database} me={me} />}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="border-line flex rounded-lg border p-0.5" role="group" aria-label="View">
            {VIEWS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                aria-pressed={view === id}
                onClick={() => setView(id)}
                className={`rounded-md px-3.5 py-1 text-xs font-semibold tracking-wide uppercase transition-colors ${
                  view === id ? 'bg-brand text-on-brand' : 'text-ink-muted hover:text-ink'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <button type="button" className={PRIMARY_BTN} onClick={() => setPicked(today)}>
            <PlusIcon className="h-4 w-4" />
            Mark days
          </button>
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-ink text-3xl font-light tracking-tight">
          {view === 'all' ? (
            <>
              <span className="font-semibold">{shown.year}</span> <span className="text-ink-muted">overview</span>
            </>
          ) : (
            <>
              {MONTH_NAMES[shown.month]} <span className="text-ink-muted">{shown.year}</span>
            </>
          )}
        </h3>
        <div className="flex items-center gap-2">
          <button type="button" className={ICON_BTN} aria-label={`Previous ${noun}`} onClick={() => step(-1)}>
            <ChevronLeftIcon className="h-4 w-4" />
          </button>
          <button type="button" className={GHOST_BTN_MD} disabled={atToday} onClick={() => setAnchor(null)}>
            Today
          </button>
          <button type="button" className={ICON_BTN} aria-label={`Next ${noun}`} onClick={() => step(1)}>
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {view === 'month' ? (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <MonthView month={shown} today={today} byDate={byDate} onPick={setPicked} />
          <UpcomingList runs={upcoming} today={today} onPick={setPicked} />
        </div>
      ) : (
        <YearView year={shown.year} today={today} byDate={byDate} onPick={setPicked} />
      )}

      <ul className="text-ink-muted flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
        {(['pto', 'other'] as const).map((kind) => (
          <li key={kind} className="flex items-center gap-2">
            <span className={`${KIND_STYLE[kind].swatch} h-3 w-3 rounded-[3px]`} aria-hidden="true" />
            {KIND_STYLE[kind].label} · {totals[kind]} {totals[kind] === 1 ? 'day' : 'days'} in {shown.year}
          </li>
        ))}
        <li className="flex items-center gap-2">
          <span className="bg-canvas border-line-soft h-3 w-3 rounded-[3px] border" aria-hidden="true" />
          Weekend
        </li>
        <li className="flex items-center gap-2">
          <span className={`${TODAY_RING} h-3 w-3 rounded-[3px]`} aria-hidden="true" />
          Today
        </li>
      </ul>

      {picked && <DayDialog key={picked} date={picked} byDate={byDate} calendar={calendar} onClose={() => setPicked(null)} />}
    </div>
  )
}
