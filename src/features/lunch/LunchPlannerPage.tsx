import { HistoryCard } from './components/HistoryCard'
import { ImportExport } from './components/ImportExport'
import { PhoneIdentity } from './components/PhoneIdentity'
import { RosterCard } from './components/RosterCard'
import { ScheduleCard } from './components/ScheduleCard'
import { useLunchPlanner } from './useLunchPlanner'
import { PageHeader } from '../../app/PageHeader'
import { useIsPhone } from '../../shared/hooks/useMediaQuery'
import { isShared } from './rosterApi'
import { ALERT_DANGER } from '../../shared/ui/styles'

const dateFormat = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })

/**
 * Lunch Planner: keep the agent roster, generate a fair two-shift lunch schedule,
 * adjust it by hand, save it, and copy it for Teams. The scheduling rules live in
 * `scheduler.ts`; storage in `lunchStorage.ts`; this page only arranges the cards.
 *
 * On a phone (the website, opening straight on this page) the cards are tuned for a team lead who
 * wants to mark who is in, generate and paste into Teams: no Import / Export, no Add agent, and the
 * Generate / Save / Copy for Teams buttons stay pinned to the bottom of the screen (see ScheduleCard).
 * The extra bottom padding keeps that bar from covering the last card.
 */
export function LunchPlannerPage() {
  const planner = useLunchPlanner()
  const phone = useIsPhone()
  /** The agents are shared with the other people who plan lunch (the schedule and history stay in this browser). */
  const sharing = planner !== null && isShared(planner.roster.status)

  return (
    <div className="mx-auto max-w-[1600px] space-y-5 px-4 py-7 sm:px-8 max-md:space-y-4 max-md:py-4 max-md:pb-48">
      <PageHeader
        title="Lunch Planner"
        // On a phone the date is already in the line above the title, and the label says nothing the title does not.
        label={phone ? undefined : 'Coverage planning'}
        description={
          planner
            ? phone
              ? sharing
                ? 'Agents shared with the team'
                : 'Saved in this browser'
              : `${dateFormat.format(new Date(`${planner.today}T00:00:00Z`))} · ${
                  sharing ? 'agents shared with the team, the rest saved in this browser' : 'saved in this browser'
                }`
            : 'Loading…'
        }
        actions={planner && !phone && <ImportExport planner={planner} />}
      />

      {phone && planner && <PhoneIdentity />}

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
            roster={planner.roster}
          />
          <ScheduleCard planner={planner} />
          <HistoryCard history={planner.history} today={planner.today} onDelete={planner.deleteHistory} />
        </>
      )}
    </div>
  )
}
