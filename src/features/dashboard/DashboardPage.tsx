import { useMemo, useState } from 'react'
import { useCalendarData } from '../../app/appDataContext'
import { useSharedShift } from '../shift/sharedShiftContext'
import { useToday } from '../calendar/useToday'
import { daysBetweenIso, formatDay, formatEyebrow, parseIso, upcomingRuns } from '../calendar/calendarData'
import { KIND_STYLE } from '../calendar/calendarStyles'
import { nameKey } from '../lunch/roster'
import { SHIFT_LABELS } from '../lunch/config'
import type { ShiftNo } from '../lunch/types'
import type { LeaveRun } from '../calendar/types'
import { storageKey, usePersistentState } from '../../shared/storage/usePersistentState'
import { CARD, CARD_HEADER, CARD_TITLE, CHIP, EMPTY, PAGE_TITLE, SECTION_LABEL, SELECT } from '../../shared/ui/styles'
import { LUNCH_WINDOWS, clock, favoritesByShift, reviveFavorites, shiftOf, shiftOnLunch } from './dashboardData'
import type { FavoritesMap } from './dashboardData'
import { CalendarIcon, ClockIcon, CloseIcon, StarIcon } from './icons'
import { useMinute } from './useMinute'

const SHIFTS = [1, 2] as const

/** How far ahead of the lunch window the "starts in …" banner appears. */
const BANNER_LEAD_MINUTES = 120

const greeting = (hour: number) => (hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening')

/** "01:12": hours and minutes, for a countdown that never shifts width. */
const countdown = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`

/** "Agent B", "Agent B and Agent C", "A, B and C" — names in bold. */
function NameList({ names }: { names: string[] }) {
  return (
    <>
      {names.map((name, i) => (
        <span key={name}>
          {i > 0 && (i === names.length - 1 ? ' and ' : ', ')}
          <strong className="text-ink font-semibold">{name}</strong>
        </span>
      ))}
    </>
  )
}

/**
 * Read-only overview: the lunch banner, your shift for today, your next PTO/Other, today's published
 * lunch roster and your favourite coworkers. Nothing here changes the schedule; the only thing it
 * stores is who you starred.
 */
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
  // The banner is dismissed per day and per state ("starts in" → "it's lunch time!" shows again).
  const [dismissed, setDismissed] = useState<string | null>(null)

  const day = days.find((d) => d.day === today)
  const myShift = me ? shiftOf(day, me) : null
  const meKey = me ? nameKey(me) : null
  // Only coworkers that still exist; a removed agent drops out by itself.
  const coworkers = useMemo(() => choices.filter((n) => nameKey(n) !== meKey), [choices, meKey])
  const favorites = useMemo(() => {
    const picked = new Set(meKey ? (favoritesMap[meKey] ?? []).map(nameKey) : [])
    return coworkers.filter((n) => picked.has(nameKey(n)))
  }, [coworkers, favoritesMap, meKey])
  const favoriteKeys = useMemo(() => new Set(favorites.map(nameKey)), [favorites])
  const grouped = favoritesByShift(day, favorites)
  const next = upcomingRuns(calendar.entries, today, 1)[0]
  const lunchNow = shiftOnLunch(now)
  const onLunchNow = myShift !== null && lunchNow === myShift
  const minutesNow = now.getHours() * 60 + now.getMinutes()
  const minutesToLunch = myShift ? LUNCH_WINDOWS[myShift].start - minutesNow : null
  const lunchSoon = minutesToLunch !== null && minutesToLunch > 0 && minutesToLunch <= BANNER_LEAD_MINUTES
  const bannerKey = myShift ? `${today}:${myShift}:${onLunchNow ? 'now' : 'soon'}` : null
  const showBanner = bannerKey !== null && (onLunchNow || lunchSoon) && dismissed !== bannerKey

  const toggleFavorite = (name: string) => {
    if (!meKey) return
    setFavoritesMap((prev) => {
      const current = prev[meKey] ?? []
      const has = current.some((n) => nameKey(n) === nameKey(name))
      return { ...prev, [meKey]: has ? current.filter((n) => nameKey(n) !== nameKey(name)) : [...current, name] }
    })
  }

  const sharing = myShift && day ? (myShift === 1 ? day.shift1 : day.shift2).filter((n) => nameKey(n) !== meKey) : []

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5 px-8 py-7">
      <header>
        <p className={SECTION_LABEL}>{formatEyebrow(today)}</p>
        <h1 className={`${PAGE_TITLE} mt-2`}>
          {greeting(now.getHours())}
          {me ? `, ${me}` : ''}
        </h1>
      </header>

      {showBanner && myShift && (
        <div
          role={onLunchNow ? 'alert' : 'status'}
          className="border-warning/45 bg-warning-surface flex items-center gap-3 rounded-xl border px-4 py-3"
        >
          <ClockIcon className="text-warning h-5 w-5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-ink text-sm font-bold">
              {onLunchNow ? "It's lunch time!" : `Lunch window starts in ${countdown(minutesToLunch ?? 0)}`}
            </p>
            <p className="text-ink-muted mt-0.5 text-xs">
              {onLunchNow
                ? `${SHIFT_LABELS[myShift]} is on lunch now (${clock(LUNCH_WINDOWS[myShift].start)}–${clock(LUNCH_WINDOWS[myShift].end)}). Enjoy your break.`
                : `You are on ${SHIFT_LABELS[myShift]} today · ${clock(LUNCH_WINDOWS[myShift].start)}–${clock(LUNCH_WINDOWS[myShift].end)}`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDismissed(bannerKey)}
            aria-label="Dismiss"
            title="Dismiss"
            className="text-ink-muted hover:bg-hover hover:text-ink shrink-0 rounded-md p-1.5 transition-colors"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        {/* Your shift: the strongest block on the page. The oversized numeral behind it is only decoration. */}
        <section
          aria-labelledby="coverage-title"
          className="border-brand-line bg-surface shadow-card relative flex min-h-[18rem] flex-col overflow-hidden rounded-xl border"
        >
          <div aria-hidden="true" className="bg-brand-soft/40 absolute inset-0" />
          {myShift && (
            <span
              aria-hidden="true"
              className="text-brand-soft absolute right-8 bottom-3 text-[9rem] leading-none font-black tracking-tighter select-none"
            >
              {String(myShift).padStart(2, '0')}
            </span>
          )}
          <div className="relative flex flex-1 flex-col p-6 pr-[34%]">
            <h2 id="coverage-title" className="text-brand-strong flex items-center gap-2 text-[11px] font-bold tracking-[0.14em] uppercase">
              <span aria-hidden="true" className={`h-2 w-2 rounded-full ${onLunchNow ? 'bg-success' : 'bg-brand'}`} />
              Today's coverage
            </h2>

            {!me ? (
              <div className="mt-6 max-w-sm">
                <p className="text-ink text-lg font-semibold">Pick who you are to see your shift.</p>
                {enabled && (
                  <label className="mt-3 block">
                    <span className="sr-only">I am</span>
                    <select value="" onChange={(e) => setMe(e.target.value || null)} className={`${SELECT} w-full`}>
                      <option value="">Not selected</option>
                      {choices.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
            ) : myShift ? (
              <div className="mt-6">
                <p className={SECTION_LABEL}>Your lunch shift</p>
                <p className="text-ink mt-2 flex flex-wrap items-center gap-3 text-5xl font-extrabold tracking-[-0.04em]">
                  {SHIFT_LABELS[myShift]}
                  {onLunchNow && <span className={`${CHIP} !bg-success-surface !text-emerald-100 !border-success/45`}>Now</span>}
                </p>
                <p className="text-ink-muted mt-2 text-xl tabular-nums">
                  {clock(LUNCH_WINDOWS[myShift].start)} — {clock(LUNCH_WINDOWS[myShift].end)}
                </p>
                <p className="text-ink-soft mt-5 text-sm">
                  {sharing.length === 0 ? (
                    'You have this lunch shift to yourself.'
                  ) : (
                    <>
                      You are sharing lunch with <NameList names={sharing} />.
                    </>
                  )}
                </p>
                <p className="text-ink-muted mt-1.5 text-sm">
                  {favorites.length === 0
                    ? 'You have no favourite coworkers yet. Star some below.'
                    : SHIFTS.some((s) => grouped[s].length > 0)
                      ? SHIFTS.filter((s) => grouped[s].length > 0)
                          .map((s) => `Favourites on ${SHIFT_LABELS[s].toLowerCase()}: ${grouped[s].join(', ')}`)
                          .join(' · ')
                      : "None of your favourite coworkers are in today's schedule."}
                </p>
              </div>
            ) : (
              <div className="mt-6">
                <p className="text-ink text-2xl font-extrabold tracking-tight">No lunch shift today</p>
                <p className="text-ink-muted mt-2 text-sm">
                  You, {me}, are not in today's schedule{day ? '' : ' (not published yet)'}.
                </p>
              </div>
            )}
          </div>
        </section>

        <PtoCard next={next} today={today} />
      </div>

      <section className={CARD} aria-labelledby="roster-title">
        <div className={`${CARD_HEADER} flex-wrap`}>
          <div>
            <p className={SECTION_LABEL}>Today · {formatEyebrow(today).split(' / ')[1]}</p>
            <h2 id="roster-title" className={`${CARD_TITLE} mt-1`}>
              Lunch roster
            </h2>
          </div>
          <ul className="text-ink-muted flex items-center gap-4 text-xs" aria-label="Legend">
            <li className="flex items-center gap-1.5">
              <span aria-hidden="true" className="bg-brand h-2 w-2 rounded-full" />
              You
            </li>
            <li className="flex items-center gap-1.5">
              <StarIcon filled className="text-brand-strong h-3.5 w-3.5" />
              Favourite
            </li>
          </ul>
        </div>
        <div className="p-4">
          {day ? (
            <Roster day={day} meKey={meKey} favoriteKeys={favoriteKeys} lunchNow={lunchNow} />
          ) : (
            <div className={EMPTY}>Today's schedule has not been posted to Teams yet.</div>
          )}
        </div>
      </section>

      <section className={CARD} aria-labelledby="favourites-title">
        <div className={`${CARD_HEADER} flex-wrap`}>
          <div>
            <p className={SECTION_LABEL}>Quick signal</p>
            <h2 id="favourites-title" className={`${CARD_TITLE} mt-1`}>
              Favourite coworkers
            </h2>
          </div>
          <p className="text-ink-muted text-xs">Starred people appear first in your roster</p>
        </div>
        <div className="p-4">
          {!me ? (
            <p className="text-ink-muted text-sm">Pick who you are to choose favourites.</p>
          ) : coworkers.length === 0 ? (
            <p className="text-ink-muted text-sm">No coworkers to pick from yet.</p>
          ) : (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
              <p className="border-line-strong flex items-baseline gap-2 border-r pr-5" aria-live="polite">
                <span className="text-brand-strong text-3xl leading-none font-extrabold tabular-nums">{favorites.length}</span>
                <span className="text-ink-muted text-xs">of {coworkers.length} starred</span>
              </p>
              <ul className="flex flex-1 flex-wrap gap-2">
                {coworkers.map((name) => {
                  const on = favoriteKeys.has(nameKey(name))
                  return (
                    <li key={name}>
                      <button
                        type="button"
                        aria-pressed={on}
                        onClick={() => toggleFavorite(name)}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[13px] font-semibold transition-colors ${
                          on
                            ? 'bg-brand-soft text-brand-strong border-brand-line'
                            : 'border-line-strong bg-surface-hi text-ink-soft hover:border-brand-line hover:bg-subtle hover:text-ink'
                        }`}
                      >
                        <StarIcon filled={on} className="h-3.5 w-3.5" />
                        {name}
                        <span className="sr-only">{on ? ' (favourite)' : ''}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

/** Your next PTO/Other: dedicated card with a coloured edge, an icon, a clear date and the kind of leave. */
function PtoCard({ next, today }: { next: LeaveRun | undefined; today: string }) {
  const edge = next ? (next.kind === 'pto' ? 'border-l-pto' : 'border-l-leave-other') : 'border-l-line-strong'
  const when = next
    ? next.start <= today
      ? 'In progress'
      : (() => {
          const d = daysBetweenIso(today, next.start)
          return d === 1 ? 'Tomorrow' : `In ${d} days`
        })()
    : null
  const endYear = next ? parseIso(next.end)?.year : null
  return (
    <section aria-labelledby="pto-title" className={`${CARD} flex flex-col overflow-hidden border-l-[5px] ${edge}`}>
      <div className={CARD_HEADER}>
        <div>
          <p id="pto-title" className={SECTION_LABEL}>
            Upcoming PTO
          </p>
          <h2 className={`${CARD_TITLE} mt-1`}>Next time away</h2>
        </div>
      </div>
      {next ? (
        <>
          <div className="flex flex-1 items-center gap-4 px-4 py-5">
            <span
              aria-hidden="true"
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${KIND_STYLE[next.kind].fill}`}
            >
              <CalendarIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-ink text-xl font-extrabold tracking-tight">{formatDay(next.start)}</p>
              <p className="text-ink-muted mt-0.5 text-sm">
                {next.end !== next.start ? `through ${formatDay(next.end)} ${endYear}` : endYear}
                {when && <span className="text-ink-soft font-semibold"> · {when}</span>}
              </p>
              {next.note && <p className="text-ink-muted mt-1 truncate text-sm">{next.note}</p>}
            </div>
          </div>
          <div className="border-line bg-subtle/50 flex items-center gap-2 border-t px-4 py-2.5">
            <span aria-hidden="true" className={`${KIND_STYLE[next.kind].swatch} h-2.5 w-2.5 rounded-full`} />
            <span className="text-ink-soft text-xs font-bold tracking-[0.06em] uppercase">
              {next.kind === 'pto' ? 'PTO' : 'Other'}
            </span>
            <span className="text-ink-muted text-xs">
              · {next.days} {next.days === 1 ? 'day' : 'days'}
            </span>
          </div>
        </>
      ) : (
        <div className="text-ink-muted flex flex-1 items-center gap-3 px-4 py-5 text-sm">
          <CalendarIcon className="text-ink-faint h-5 w-5 shrink-0" />
          No upcoming PTO/Other in your calendar.
        </div>
      )}
    </section>
  )
}

/** The two shift columns. You first, then your favourites, then everyone else in the published order. */
function Roster({
  day,
  meKey,
  favoriteKeys,
  lunchNow,
}: {
  day: { shift1: string[]; shift2: string[] }
  meKey: string | null
  favoriteKeys: ReadonlySet<string>
  lunchNow: ShiftNo | null
}) {
  const columns: Record<ShiftNo, string[]> = { 1: day.shift1, 2: day.shift2 }
  const rank = (name: string) => (nameKey(name) === meKey ? 0 : favoriteKeys.has(nameKey(name)) ? 1 : 2)
  return (
    <div className="border-line-strong grid overflow-hidden rounded-lg border md:grid-cols-2">
      {SHIFTS.map((s, index) => {
        const names = [...columns[s]].sort((a, b) => rank(a) - rank(b))
        return (
          <div key={s} className={index === 1 ? 'border-line-strong border-t md:border-t-0 md:border-l' : ''}>
            <div className="bg-surface-hi border-line flex items-baseline gap-3 border-b px-4 py-2.5">
              <h3 className="text-brand-strong text-[11px] font-bold tracking-[0.14em] uppercase">{SHIFT_LABELS[s]}</h3>
              <span className="text-ink-muted text-xs tabular-nums">
                {clock(LUNCH_WINDOWS[s].start)}–{clock(LUNCH_WINDOWS[s].end)}
              </span>
              {lunchNow === s && <span className={CHIP}>Now</span>}
              <span className="text-ink-muted ml-auto text-xs">
                {names.length} {names.length === 1 ? 'agent' : 'agents'}
              </span>
            </div>
            {names.length === 0 ? (
              <p className="text-ink-muted px-4 py-3 text-sm">Nobody in this shift.</p>
            ) : (
              <ul>
                {names.map((name) => {
                  const key = nameKey(name)
                  const mine = key === meKey
                  const fav = favoriteKeys.has(key)
                  return (
                    <li
                      key={name}
                      aria-current={mine ? 'true' : undefined}
                      className={`border-line-soft flex min-h-11 items-center justify-between gap-3 border-b border-l-[3px] px-4 py-2.5 text-sm last:border-b-0 ${
                        mine ? 'border-l-brand bg-brand-soft text-brand-strong font-bold' : 'text-ink border-l-transparent'
                      }`}
                    >
                      <span className="truncate">{name}</span>
                      {mine && <span className="text-[10px] font-extrabold tracking-[0.14em] uppercase">You</span>}
                      {!mine && fav && (
                        <>
                          <StarIcon filled className="text-brand-strong h-4 w-4 shrink-0" />
                          <span className="sr-only">Favourite</span>
                        </>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )
      })}
    </div>
  )
}
