import { useState } from 'react'
import { HISTORY_DAYS } from '../config'
import { recentHistory } from '../history'
import type { HistoryEntry } from '../types'
import { TrashIcon } from '../../../shared/ui/icons'
import { CARD, CARD_HEADER, COUNT_BADGE, DELETE_BTN, EMPTY, PANEL, SECTION_LABEL } from '../../../shared/ui/styles'
import { ConfirmDialog } from './ConfirmDialog'

const dateFormat = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
const formatDate = (iso: string) => dateFormat.format(new Date(`${iso}T00:00:00Z`))

type HistoryCardProps = {
  history: HistoryEntry[]
  today: string
  onDelete: (date: string) => void
}

/** The saved days of the last 30, newest first. Open one to see who sat where. */
export function HistoryCard({ history, today, onDelete }: HistoryCardProps) {
  const entries = recentHistory(history, today)
  const [deleting, setDeleting] = useState<HistoryEntry | null>(null)

  return (
    <section className={CARD} aria-labelledby="lunch-history-title">
      <div className={CARD_HEADER}>
        <div className="flex items-center gap-2.5">
          <h3 id="lunch-history-title" className="text-ink text-sm font-bold tracking-tight">
            History
          </h3>
          <span className={COUNT_BADGE}>last {HISTORY_DAYS} days</span>
        </div>
      </div>
      <div className="p-4">
        {entries.length === 0 ? (
          <p className={EMPTY}>Nothing saved yet. Save today's schedule and it shows up here.</p>
        ) : (
          <ul className="space-y-2">
            {entries.map((entry) => (
              <li key={entry.date} className={`${PANEL} flex items-start gap-2 p-3`}>
                <details className="min-w-0 flex-1">
                  <summary className="text-ink flex flex-wrap items-baseline gap-x-3 text-sm font-semibold">
                    {formatDate(entry.date)}
                    <span className="text-ink-muted text-xs font-normal">
                      Shift 1: {entry.shift1.length} · Shift 2: {entry.shift2.length} · Out: {entry.out.length}
                      {entry.notes.length > 0 && ` · ${entry.notes.length} ${entry.notes.length === 1 ? 'warning' : 'warnings'}`}
                    </span>
                  </summary>
                  <dl className="mt-3 grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[8rem_1fr]">
                    <Row label="Shift 1" names={entry.shift1} />
                    <Row label="Shift 2" names={entry.shift2} />
                    <Row label="Chat" names={entry.chat} />
                    <Row label="PTO / OOO" names={entry.out} />
                    {entry.notes.length > 0 && <Row label="Notes" names={entry.notes} separator=" · " />}
                  </dl>
                </details>
                <button
                  type="button"
                  className={`${DELETE_BTN} p-1.5`}
                  aria-label={`Delete the schedule of ${formatDate(entry.date)}`}
                  title="Delete this day"
                  onClick={() => setDeleting(entry)}
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {deleting && (
        <ConfirmDialog
          title={`Delete ${formatDate(deleting.date)}?`}
          confirmLabel="Delete day"
          danger
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            onDelete(deleting.date)
            setDeleting(null)
          }}
        >
          <p>This day is removed from the history. If it was the last saved working day, tomorrow's "Yesterday's shift" is read from the day before it.</p>
        </ConfirmDialog>
      )}
    </section>
  )
}

function Row({ label, names, separator = ', ' }: { label: string; names: string[]; separator?: string }) {
  return (
    <>
      <dt className={SECTION_LABEL}>{label}</dt>
      <dd className="text-ink">{names.length ? names.join(separator) : <span className="text-ink-faint">–</span>}</dd>
    </>
  )
}
