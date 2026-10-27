import { HistoryCard } from './components/HistoryCard'
import { ImportExport } from './components/ImportExport'
import { RosterCard } from './components/RosterCard'
import { ScheduleCard } from './components/ScheduleCard'
import { useLunchPlanner } from './useLunchPlanner'
import { PAGE_SUBTITLE, PAGE_TITLE } from '../../shared/ui/styles'

const dateFormat = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })

/**
 * Lunch Planner: keep the agent roster, generate a fair two-shift lunch schedule,
 * adjust it by hand, save it, and copy it for Teams. The scheduling rules live in
 * `scheduler.ts`; storage in `lunchStorage.ts`; this page only arranges the cards.
 */
export function LunchPlannerPage() {
  const planner = useLunchPlanner()

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-7 sm:px-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className={PAGE_TITLE}>Lunch Planner</h2>
          <p className={PAGE_SUBTITLE}>
            {planner ? dateFormat.format(new Date(`${planner.today}T00:00:00Z`)) : 'Loading…'}
            <span className="text-ink-faint"> · saved in this browser</span>
          </p>
        </div>
        {planner && <ImportExport planner={planner} />}
      </header>

      {planner?.saveFailed && (
        <p role="alert" className="rounded-lg border border-rose-400/50 bg-rose-400/10 px-3 py-2 text-sm font-semibold text-rose-200">
          Your changes could not be saved in this browser (storage is full or blocked). Export the roster to keep them.
        </p>
      )}

      {planner && (
        <>
          <RosterCard
            agents={planner.agents}
            onAdd={planner.addAgent}
            onUpdate={planner.updateAgent}
            onRemove={planner.removeAgent}
            onRefillYesterday={planner.refillYesterday}
            onMarkAllAvailable={planner.markAllAvailable}
          />
          <ScheduleCard planner={planner} />
          <HistoryCard history={planner.history} today={planner.today} onDelete={planner.deleteHistory} />
        </>
      )}
    </div>
  )
}
