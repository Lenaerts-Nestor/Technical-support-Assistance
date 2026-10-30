import { useMemo } from 'react'
import { useCalendarData } from '../../app/appDataContext'
import { useSharedShift } from '../shift/sharedShiftContext'
import { useToday } from '../calendar/useToday'
import { formatLong, upcomingRuns, formatShort } from '../calendar/calendarData'
import { nameKey } from '../lunch/roster'
import { SHIFT_LABELS } from '../lunch/config'
import type { ShiftNo } from '../lunch/types'
import { storageKey, usePersistentState } from '../../shared/storage/usePersistentState'
import { CARD, CARD_HEADER, CHIP, EMPTY, PAGE_SUBTITLE, PAGE_TITLE, SECTION_LABEL, SELECT } from '../../shared/ui/styles'
import { LUNCH_WINDOWS, clock, favoritesByShift, reviveFavorites, shiftOf, shiftOnLunch } from './dashboardData'
import type { FavoritesMap } from './dashboardData'
import { useMinute } from './useMinute'

const SHIFTS = [1, 2] as const

/** Read-only overview: today's published lunch schedule, favorite coworkers, next PTO/Other and a lunch alert. */
export function DashboardPage() {
  const { enabled, me, setMe, choices, days } = useSharedShift()
  const calendar = useCalendarData()
  const today = useToday()
  const now = useMinute()
  const [favoritesMap, setFavoritesMap] = usePersistentState<FavoritesMap>(
    storageKey('dashboard', 'favorites'),
    () => ({}),
    reviveFavorites,
  )

  const day = days.find((d) => d.day === today)
  const myShift = me ? shiftOf(day, me) : null
  const meKey = me ? nameKey(me) : null
  // Only coworkers that still exist; a removed agent drops out by itself.
  const coworkers = useMemo(() => choices.filter((n) => nameKey(n) !== meKey), [choices, meKey])
  const favorites = useMemo(() => {
    const picked = new Set(meKey ? (favoritesMap[meKey] ?? []).map(nameKey) : [])
    return coworkers.filter((n) => picked.has(nameKey(n)))
  }, [coworkers, favoritesMap, meKey])
  const grouped = favoritesByShift(day, favorites)
  const next = upcomingRuns(calendar.entries, today, 1)[0]
  const lunchNow = shiftOnLunch(now)
  const onLunchNow = myShift !== null && lunchNow === myShift

  const toggleFavorite = (name: string) => {
    if (!meKey) return
    setFavoritesMap((prev) => {
      const current = prev[meKey] ?? []
      const has = current.some((n) => nameKey(n) === nameKey(name))
      return { ...prev, [meKey]: has ? current.filter((n) => nameKey(n) !== nameKey(name)) : [...current, name] }
    })
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5 p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className={PAGE_TITLE}>Dashboard</h1>
          <p className={PAGE_SUBTITLE}>{formatLong(today)}</p>
        </div>
        {enabled && (
          <label className="flex items-center gap-2 text-sm font-semibold">
            <span className={SECTION_LABEL}>I am</span>
            <select value={me ?? ''} onChange={(e) => setMe(e.target.value || null)} className={SELECT}>
              <option value="">Not selected</option>
              {choices.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        )}
      </header>

      {onLunchNow && myShift && (
        <div
          role="alert"
          className="rounded-xl border-2 border-amber-200 bg-linear-to-br from-amber-400 to-orange-500 p-5 text-center text-slate-900 shadow-lg"
        >
          <p className="text-xl font-black tracking-tight">It's lunch time!</p>
          <p className="mt-1 text-sm font-semibold">
            {SHIFT_LABELS[myShift]} is on lunch now ({clock(LUNCH_WINDOWS[myShift].start)}–{clock(LUNCH_WINDOWS[myShift].end)}). Enjoy your break.
          </p>
        </div>
      )}

      <section className={CARD}>
        <div className={CARD_HEADER}>
          <h2 className={SECTION_LABEL}>Today's lunch schedule</h2>
        </div>
        <div className="flex flex-col gap-4 p-4">
          {!me ? (
            <p className="text-ink-muted text-sm">Pick who you are to see your shift.</p>
          ) : myShift ? (
            <p className="text-ink text-sm font-semibold">
              You, {me}, are in shift {myShift}.
            </p>
          ) : (
            <p className="text-ink-muted text-sm">
              You, {me}, are not in today's schedule{day ? '' : ' (not published yet)'}.
            </p>
          )}

          {me && (
            <p className="text-ink-soft text-sm">
              {favorites.length === 0
                ? 'You have no favorite coworkers yet. Pick some below.'
                : SHIFTS.some((s) => grouped[s].length > 0)
                  ? SHIFTS.filter((s) => grouped[s].length > 0)
                      .map((s) => `Your favorite coworkers are on shift ${s} lunch: ${grouped[s].join(', ')}`)
                      .join('. ')
                  : 'None of your favorite coworkers are in today\'s schedule.'}
            </p>
          )}

          {day ? (
            <ScheduleTable day={day} meKey={meKey} favoriteKeys={new Set(favorites.map(nameKey))} lunchNow={lunchNow} />
          ) : (
            <div className={EMPTY}>Today's schedule has not been posted to Teams yet.</div>
          )}
        </div>
      </section>

      <div className="grid gap-5 md:grid-cols-2">
        <section className={CARD}>
          <div className={CARD_HEADER}>
            <h2 className={SECTION_LABEL}>Your next PTO/Other</h2>
          </div>
          <div className="p-4 text-sm">
            {next ? (
              <>
                <p className="text-ink font-semibold">
                  Your next {next.kind === 'pto' ? 'PTO' : 'Other'} is on {formatLong(next.start)}
                  {next.end !== next.start && ` – ${formatShort(next.end, true)}`}.
                </p>
                {next.note && <p className="text-ink-muted mt-1">{next.note}</p>}
              </>
            ) : (
              <p className="text-ink-muted">No upcoming PTO/Other in your calendar.</p>
            )}
          </div>
        </section>

        <section className={CARD}>
          <div className={CARD_HEADER}>
            <h2 className={SECTION_LABEL}>Favorite coworkers</h2>
          </div>
          <div className="p-4">
            {!me ? (
              <p className="text-ink-muted text-sm">Pick who you are to choose favorites.</p>
            ) : coworkers.length === 0 ? (
              <p className="text-ink-muted text-sm">No coworkers to pick from yet.</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {coworkers.map((name) => {
                  const on = favorites.some((f) => nameKey(f) === nameKey(name))
                  return (
                    <li key={name}>
                      <button
                        type="button"
                        aria-pressed={on}
                        onClick={() => toggleFavorite(name)}
                        className={`rounded-md border px-2.5 py-1 text-[13px] font-semibold transition-colors ${
                          on
                            ? 'bg-brand-soft text-brand-strong border-brand/40'
                            : 'border-line-strong bg-surface-hi text-ink-soft hover:bg-subtle hover:text-ink'
                        }`}
                      >
                        {on ? '★ ' : '☆ '}
                        {name}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

function ScheduleTable({
  day,
  meKey,
  favoriteKeys,
  lunchNow,
}: {
  day: { shift1: string[]; shift2: string[] }
  meKey: string | null
  favoriteKeys: Set<string>
  lunchNow: ShiftNo | null
}) {
  const columns: Record<ShiftNo, string[]> = { 1: day.shift1, 2: day.shift2 }
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr>
            {SHIFTS.map((s) => (
              <th key={s} className="border-line bg-subtle border px-3 py-2 align-bottom">
                <span className="text-ink font-bold">{SHIFT_LABELS[s]}</span>{' '}
                <span className="text-ink-muted text-xs font-normal">
                  {clock(LUNCH_WINDOWS[s].start)}–{clock(LUNCH_WINDOWS[s].end)}
                </span>
                {lunchNow === s && <span className={`${CHIP} ml-2`}>Now</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: Math.max(day.shift1.length, day.shift2.length, 1) }, (_, i) => (
            <tr key={i}>
              {SHIFTS.map((s) => {
                const name = columns[s][i]
                const key = name ? nameKey(name) : null
                return (
                  <td
                    key={s}
                    className={`border-line border px-3 py-1.5 ${key !== null && key === meKey ? 'bg-brand-soft text-brand-strong font-bold' : 'text-ink'}`}
                  >
                    {name}
                    {key !== null && favoriteKeys.has(key) && <span className="text-amber-400"> ★</span>}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
