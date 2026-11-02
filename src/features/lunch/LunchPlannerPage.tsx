import { HistoryCard } from './components/HistoryCard'
import { ImportExport } from './components/ImportExport'
import { RosterCard } from './components/RosterCard'
import { ScheduleCard } from './components/ScheduleCard'
import { useLunchPlanner } from './useLunchPlanner'
import { PageHeader } from '../../app/PageHeader'
import { ALERT_DANGER } from '../../shared/ui/styles'

const dateFormat = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })

/**
 * Lunch Planner: keep the agent roster, generate a fair two-shift lunch schedule,
 * adjust it by hand, save it, and copy it for Teams. The scheduling rules live in
 * `scheduler.ts`; storage in `lunchStorage.ts`; this page only arranges the cards.
 */
export function LunchPlannerPage() {
  const planner = useLunchPlanner()

  return (
    <div className="mx-auto max-w-[1600px] space-y-5 px-4 py-7 sm:px-8">
      <PageHeader
        title="Lunch Planner"
        label="Coverage planning"
        description={
          planner
            ? `${dateFormat.format(new Date(`${planner.today}T00:00:00Z`))} · saved in this browser`
            : 'Loading…'
        }
        actions={planner && <ImportExport planner={planner} />}
      />

      {planner?.saveFailed && (
        <p role="alert" className={`${ALERT_DANGER} font-semibold`}>
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
