import { useMemo, useState } from 'react'
import { Modal } from '../../../shared/ui/Modal'
import { DANGER_BTN, GHOST_BTN_MD, INPUT_LG, PRIMARY_BTN, SECTION_LABEL } from '../../../shared/ui/styles'
import { MAX_RANGE_DAYS, NOTE_MAX_LENGTH, datesBetween, formatLong, parseIso } from '../calendarData'
import { KIND_STYLE } from '../calendarStyles'
import type { CalendarEntry, LeaveKind } from '../types'
import type { CalendarController } from '../useCalendar'

type DayDialogProps = {
  /** The day that was picked; the dialog opens on it. */
  date: string
  byDate: ReadonlyMap<string, CalendarEntry>
  calendar: CalendarController
  onClose: () => void
}

const KINDS: LeaveKind[] = ['pto', 'other']
const FORM_ID = 'calendar-day-form'

/** Mark one day — or a span of days — as PTO or something else, or clear it. */
export function DayDialog({ date, byDate, calendar, onClose }: DayDialogProps) {
  const existing = byDate.get(date)
  const [kind, setKind] = useState<LeaveKind>(existing?.kind ?? 'pto')
  const [note, setNote] = useState(existing?.note ?? '')
  const [from, setFrom] = useState(date)
  const [to, setTo] = useState(date)
  const [skipWeekends, setSkipWeekends] = useState(true)

  const dates = useMemo(() => datesBetween(from, to, skipWeekends), [from, to, skipWeekends])
  const hasEntries = dates.some((d) => byDate.has(d))
  const backwards = parseIso(from) !== null && parseIso(to) !== null && to < from
  const spanDays = from !== to && !backwards && parseIso(from) !== null && parseIso(to) !== null

  const save = () => {
    if (dates.length === 0) return
    calendar.setDays(dates, kind, note)
    onClose()
  }

  const clear = () => {
    calendar.clearDays(dates)
    onClose()
  }

  return (
    <Modal
      title={formatLong(date)}
      onClose={onClose}
      footer={
        <>
          {hasEntries && (
            <button type="button" className={`${DANGER_BTN} mr-auto`} onClick={clear}>
              Remove {dates.length > 1 ? 'days' : 'day'}
            </button>
          )}
          <button type="button" className={GHOST_BTN_MD} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form={FORM_ID} className={PRIMARY_BTN} disabled={dates.length === 0}>
            Save
          </button>
        </>
      }
    >
      <form
        id={FORM_ID}
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          save()
        }}
      >
        <div>
          <p className={`${SECTION_LABEL} mb-1.5`}>Type</p>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Type of day">
            {KINDS.map((k) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={kind === k}
                onClick={() => setKind(k)}
                className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                  kind === k
                    ? `${KIND_STYLE[k].fill} border-transparent`
                    : 'border-line text-ink-muted hover:border-line-strong hover:text-ink'
                }`}
              >
                <span className={`${KIND_STYLE[k].swatch} h-2.5 w-2.5 rounded-full`} aria-hidden="true" />
                {KIND_STYLE[k].label}
              </button>
            ))}
          </div>
        </div>

        {kind === 'other' && (
          <label className="block">
            <span className={`${SECTION_LABEL} mb-1.5 block`}>What is it? (optional)</span>
            <input
              type="text"
              className={INPUT_LG}
              value={note}
              maxLength={NOTE_MAX_LENGTH}
              placeholder="e.g. Doctor, training, moving house"
              autoFocus
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
        )}

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className={`${SECTION_LABEL} mb-1.5 block`}>From</span>
            <input
              type="date"
              className={INPUT_LG}
              value={from}
              onChange={(e) => {
                setFrom(e.target.value)
                if (e.target.value && (to === '' || to < e.target.value)) setTo(e.target.value)
              }}
            />
          </label>
          <label className="block">
            <span className={`${SECTION_LABEL} mb-1.5 block`}>To</span>
            <input
              type="date"
              className={INPUT_LG}
              value={to}
              min={from || undefined}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
        </div>

        {spanDays && (
          <label className="text-ink-muted flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={skipWeekends}
              onChange={(e) => setSkipWeekends(e.target.checked)}
              className="accent-brand h-4 w-4"
            />
            Skip Saturdays and Sundays
          </label>
        )}

        <p className="text-ink-faint text-xs" aria-live="polite">
          {backwards
            ? 'The end date is before the start date.'
            : dates.length === 0
              ? 'Pick a valid date.'
              : `${dates.length} ${dates.length === 1 ? 'day' : 'days'} will be marked${
                  dates.length === MAX_RANGE_DAYS ? ` (the most that can be set at once)` : ''
                }.`}
        </p>
      </form>
    </Modal>
  )
}
