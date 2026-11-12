import { useEffect, useMemo, useRef, useState } from 'react'
import type { DragEvent, ReactNode } from 'react'
import { SHIFT_LABELS } from '../config'
import { applyMove, coverageLost } from '../coverage'
import { boardNames } from '../board'
import { sameShifts } from '../sharedHistory'
import { nameKey } from '../roster'
import { teamsHtml, teamsText } from '../teamsText'
import type { LunchPlanner } from '../useLunchPlanner'
import type { Agent, LanguageWarning, ShiftNo } from '../types'
import { useCopyToClipboard } from '../../../shared/hooks/useCopyToClipboard'
import { useIsPhone } from '../../../shared/hooks/useMediaQuery'
import { PUBLISHERS } from '../../shift/config'
import { useSharedShift } from '../../shift/sharedShiftContext'
import {
  ALERT_DANGER,
  ALERT_WARNING,
  CARD,
  CARD_HEADER,
  CARD_TITLE,
  EMPTY,
  GHOST_BTN,
  GHOST_BTN_MD,
  INSET,
  PRIMARY_BTN,
  SECTION_LABEL,
  SUCCESS_BTN,
} from '../../../shared/ui/styles'
import { CopyIcon } from '../../../shared/ui/icons'
import type { CardRole } from './AgentCard'
import { ConfirmDialog } from './ConfirmDialog'
import { AlertIcon, CheckIcon, RefreshIcon } from './icons'
import { ShiftColumn } from './ShiftColumn'

type Pending = { a: Agent; b?: Agent; lost: LanguageWarning[] }

const WARNING_TONE: Record<LanguageWarning['kind'], string> = {
  uncovered: 'border-danger/45 bg-danger-surface text-rose-100',
  single: 'border-warning/45 bg-warning-surface text-amber-100',
  none: 'border-warning/45 bg-warning-surface text-amber-100',
}

/**
 * Generate, adjust, save and copy today's lunch schedule. Swapping works three
 * ways: the Swap button on a card (keyboard friendly), the "Move … here" button
 * it opens, or dragging a card onto another card / the other column.
 */
export function ScheduleCard({ planner }: { planner: LunchPlanner }) {
  const { board, agents } = planner
  const phone = useIsPhone()
  const sectionRef = useRef<HTMLElement>(null)
  const [pickedId, setPickedId] = useState<string | null>(null)
  const [pending, setPending] = useState<Pending | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const { copied, copy } = useCopyToClipboard()
  const [copyFailed, setCopyFailed] = useState(false)
  const shared = useSharedShift()
  /** Whether the last Copy for Teams also reached the team, and for which schedule (a later change makes it stale). */
  const [shareResult, setShareResult] = useState<{ ok: boolean; forText: string } | null>(null)
  /** Names of the shared schedule this roster does not have (kept here: the card is rebuilt when a schedule appears). */
  const [notOnRoster, setNotOnRoster] = useState<string[]>([])
  /** The card being dragged. A ref, not state: a drop can land before React has re-rendered. */
  const dragging = useRef<string | null>(null)
  /** True while a card is being dragged, as opposed to picked with the Swap button. */
  const [dragActive, setDragActive] = useState(false)

  const everyone = useMemo(() => (board ? [...board.shift1, ...board.shift2] : []), [board])
  const picked = pickedId ? everyone.find((a) => a.id === pickedId) : undefined
  const pickedShift: ShiftNo | null = picked && board ? (board.shift1.includes(picked) ? 1 : 2) : null

  // What each possible move would cost, worked out once per pick rather than per card.
  const options = useMemo(() => {
    if (!board || !picked || !pickedShift) return null
    const others = pickedShift === 1 ? board.shift2 : board.shift1
    return {
      partners: new Map(others.map((p) => [p.id, coverageLost(agents, board.assignment, picked.id, p.id)])),
      move: coverageLost(agents, board.assignment, picked.id),
    }
  }, [agents, board, picked, pickedShift])

  useEffect(() => {
    if (!picked) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !pending && setPickedId(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [picked, pending])

  /** On a phone the result is below the long agent list, so Generate also brings the schedule into view. */
  const generate = () => {
    planner.generate()
    if (!phone) return
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.requestAnimationFrame(() => sectionRef.current?.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' }))
  }

  if (!board) {
    return (
      <section ref={sectionRef} className={`${CARD} scroll-mt-3`} aria-labelledby="lunch-schedule-title">
        <Header planner={planner} onGenerate={generate} onCopy={null} copied={false} phone={phone} notice={null} />
        <div className="space-y-3 p-4">
          <SharedBanner planner={planner} differs missing={notOnRoster} onLoad={setNotOnRoster} />
          <p className={EMPTY}>
            No schedule yet. Mark who is in today in the {phone ? 'list' : 'table'}, then press Generate.
          </p>
        </div>
      </section>
    )
  }

  const commit = (a: Agent, b?: Agent) => {
    planner.setAssignment(applyMove(board.assignment, a.id, b?.id))
    setAnnouncement(
      b
        ? `${a.name} and ${b.name} swapped shifts.`
        : `${a.name} moved to ${SHIFT_LABELS[pickedShiftOf(a) === 1 ? 2 : 1]}.`,
    )
    setPickedId(null)
    setPending(null)
  }
  const pickedShiftOf = (a: Agent): ShiftNo => (board.shift1.includes(a) ? 1 : 2)

  /** Performs a move or swap, asking first when it would leave a language uncovered. */
  const perform = (a: Agent, b?: Agent) => {
    const lost = coverageLost(agents, board.assignment, a.id, b?.id)
    if (lost.length === 0) return commit(a, b)
    setPickedId(null)
    setPending({ a, b, lost })
  }

  const roleOf = (agent: Agent): CardRole => {
    if (!picked || !options || !pickedShift) return { kind: 'idle' }
    if (agent.id === picked.id) return { kind: 'picked', moveTo: pickedShift === 1 ? 2 : 1, moveLost: options.move }
    const lost = options.partners.get(agent.id)
    if (!lost) return { kind: 'other' }
    return { kind: 'partner', picked, lost, shared: agent.languages.filter((l) => picked.languages.includes(l)) }
  }

  const draggedAgent = () => everyone.find((a) => a.id === dragging.current)
  const acceptsDrop = (shift: ShiftNo) => {
    const dragged = draggedAgent()
    return dragged !== undefined && pickedShiftOf(dragged) !== shift
  }

  const startDrag = (agent: Agent, e: DragEvent) => {
    dragging.current = agent.id
    e.dataTransfer.setData('text/plain', agent.id)
    e.dataTransfer.effectAllowed = 'move'
    // Re-rendering inside dragstart makes Chrome cancel the drag, so the highlight waits a tick.
    window.setTimeout(() => {
      setDragActive(true)
      setPickedId(agent.id)
    }, 0)
  }

  const copyText = async () => {
    const names = boardNames(board)
    // Both flavours at once: Teams takes the bold headings, a plain-text field gets the text.
    const text = teamsText(names)
    const ok = await copy(text, 'default', teamsHtml(names))
    setCopyFailed(!ok)
    // Kevin C / Nestor: the same press also shows each agent their own shift in their sidebar and on the Dashboard.
    if (ok && shared.canPublish) {
      const result = await shared.publish({
        day: planner.today,
        shift1: names.shift1,
        shift2: names.shift2,
        team: agents.map((a) => a.name),
        chat: names.chat,
        out: names.out,
        notes: names.notes,
      })
      setShareResult({ ok: result !== null, forText: text })
    } else {
      setShareResult(null)
    }
  }
  const currentText = teamsText(boardNames(board))
  // What Copy for Teams achieved. In the card on a computer; on a phone in the pinned bar, next to the button just pressed.
  const copyNotice = copyFailed ? (
    <p role="alert" className={`${ALERT_DANGER} font-semibold`}>
      {phone
        ? 'Could not copy. Allow clipboard access for this site and try again.'
        : 'Could not copy to the clipboard. Allow clipboard access for this site and try again.'}
    </p>
  ) : null
  const shareNotice =
    shareResult?.forText === currentText ? (
      shareResult.ok ? (
        <p role="status" className="flex items-center gap-2 text-sm font-semibold text-emerald-300">
          <CheckIcon className="h-4 w-4 shrink-0" />
          {phone
            ? 'Copied. Shared with the team.'
            : 'Shared with the team: everyone who picked their name sees their shift in the sidebar and on the Dashboard.'}
        </p>
      ) : (
        <p role="alert" className={`${ALERT_DANGER} font-semibold`}>
          {phone
            ? 'Copied, but not shared with the team. Check the connection and press Copy for Teams again.'
            : 'Copied, but the shifts could not be shared with the team. Check the connection and press Copy for Teams again.'}
        </p>
      )
    ) : null
  /** The shared schedule without the names this roster does not have, which can never be on screen. */
  const known = new Set(agents.map((a) => nameKey(a.name)))
  const onRoster = (day: { shift1: string[]; shift2: string[] }) => ({
    shift1: day.shift1.filter((n) => known.has(nameKey(n))),
    shift2: day.shift2.filter((n) => known.has(nameKey(n))),
  })

  const columnFor = (shift: ShiftNo, list: Agent[]) => (
    <ShiftColumn
      key={shift}
      shift={shift}
      agents={list}
      roleOf={roleOf}
      highlight={new Set(picked?.languages)}
      dragging={dragActive}
      incoming={picked && pickedShift !== shift && options ? { agent: picked, lostLanguages: options.move.map((w) => w.language) } : null}
      onPick={(agent) => setPickedId(agent.id)}
      onCancel={() => setPickedId(null)}
      onMove={(agent) => perform(agent)}
      onSwap={(a, b) => perform(a, b)}
      onDragStart={startDrag}
      onDragEnd={() => {
        dragging.current = null
        window.setTimeout(() => {
          setDragActive(false)
          setPickedId(null)
        }, 0)
      }}
      acceptsDrop={() => acceptsDrop(shift)}
      onDropOnCard={(target) => {
        const dragged = draggedAgent()
        if (dragged) perform(dragged, target)
      }}
      onDropOnColumn={() => {
        const dragged = draggedAgent()
        if (dragged) perform(dragged)
      }}
    />
  )

  const order: [ShiftNo, Agent[]][] = [
    [1, board.shift1],
    [2, board.shift2],
  ]

  return (
    <section ref={sectionRef} className={`${CARD} scroll-mt-3`} aria-labelledby="lunch-schedule-title">
      <Header
        planner={planner}
        onGenerate={generate}
        onCopy={copyText}
        copied={copied === 'default'}
        phone={phone}
        notice={
          copyNotice || shareNotice ? (
            <>
              {copyNotice}
              {shareNotice}
            </>
          ) : null
        }
      />

      <div className="space-y-4 p-4">
        <p className="sr-only" role="status">
          {picked && pickedShift
            ? `${picked.name} selected. Choose an agent in ${SHIFT_LABELS[pickedShift === 1 ? 2 : 1]} to swap with, or move ${picked.name} there. Press Escape to cancel.`
            : announcement}
        </p>
        {!phone && copyNotice}
        {!phone && shareNotice}
        {shared.enabled && !shared.canPublish && (
          <p className="text-ink-muted text-xs">
            Only {PUBLISHERS.join(' and ')} share the shifts when copying. Choose who you are under “I am”{' '}
            {phone ? 'at the top of the page' : 'in the sidebar'}.
          </p>
        )}

        <SharedBanner
          planner={planner}
          differs={planner.sharedToday ? !sameShifts(boardNames(board), onRoster(planner.sharedToday)) : false}
          missing={notOnRoster}
          onLoad={setNotOnRoster}
        />

        <div role="status" aria-label="Language warnings" className="space-y-2">
          {board.warnings.length === 0 ? (
            <p className="flex items-center gap-2 text-sm font-semibold text-emerald-300">
              <CheckIcon className="h-4 w-4" />
              Every language is covered in both shifts.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {board.warnings.map((w) => (
                <li
                  key={`${w.kind}-${w.language}-${w.shift ?? ''}`}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm max-md:items-start max-md:py-2 ${WARNING_TONE[w.kind]}`}
                >
                  <AlertIcon className="h-4 w-4 shrink-0 max-md:mt-0.5" />
                  {w.message}
                </li>
              ))}
            </ul>
          )}
        </div>

        {board.unassigned.length > 0 && (
          <div className={ALERT_WARNING}>
            <p className="font-semibold">
              Available but not scheduled (the table changed after generating). Generate again, or place them:
            </p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {board.unassigned.map((agent) => (
                <li key={agent.id} className="flex items-center gap-1.5 max-md:w-full max-md:justify-between">
                  <span className="font-semibold">{agent.name}</span>
                  {([1, 2] as const).map((shift) => (
                    <button
                      key={shift}
                      type="button"
                      className={`${GHOST_BTN} max-md:min-h-10`}
                      aria-label={`Add ${agent.name} to ${SHIFT_LABELS[shift]}`}
                      onClick={() =>
                        planner.setAssignment({
                          shift1: [...board.assignment.shift1, ...(shift === 1 ? [agent.id] : [])],
                          shift2: [...board.assignment.shift2, ...(shift === 2 ? [agent.id] : [])],
                        })
                      }
                    >
                      {SHIFT_LABELS[shift]}
                    </button>
                  ))}
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-ink-muted text-xs">
          {phone
            ? 'Tap Swap on an agent, then tap who to swap with, or move them to the other shift.'
            : 'Drag an agent onto a card in the other shift to swap, or onto the column to move. With the keyboard, press Swap on a card and pick a partner.'}
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          {order.map(([shift, list]) => columnFor(shift, list))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <section className={`${INSET} p-4`} aria-labelledby="lunch-chat-title">
            <p className="text-ink text-2xl leading-none font-extrabold tabular-nums">{board.chat.length}</p>
            <h4 id="lunch-chat-title" className={`${SECTION_LABEL} mt-2`}>
              Chat
            </h4>
            {board.chat.length === 0 ? (
              <p className="text-ink-muted mt-3 text-sm">No chat agents scheduled.</p>
            ) : (
              <ul className="border-line mt-3 divide-y divide-[var(--color-line-soft)] border-t text-sm">
                {board.chat.map((agent) => (
                  <li key={agent.id} className="text-ink flex justify-between gap-2 py-1.5">
                    {agent.name}
                    <span className="text-ink-muted">{board.shift1.includes(agent) ? SHIFT_LABELS[1] : SHIFT_LABELS[2]}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className={`${INSET} p-4`} aria-labelledby="lunch-out-title">
            <p className="text-ink text-2xl leading-none font-extrabold tabular-nums">{board.out.length}</p>
            <h4 id="lunch-out-title" className={`${SECTION_LABEL} mt-2`}>
              PTO / OOO
            </h4>
            {board.out.length === 0 ? (
              <p className="text-ink-muted mt-3 text-sm">Everybody is in today.</p>
            ) : (
              <ul className="border-line text-ink mt-3 divide-y divide-[var(--color-line-soft)] border-t text-sm">
                {board.out.map((agent) => (
                  <li key={agent.id} className="py-1.5">
                    {agent.name}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      {pending && (
        <ConfirmDialog
          title="This leaves a language uncovered"
          confirmLabel={pending.b ? 'Swap anyway' : 'Move anyway'}
          onCancel={() => setPending(null)}
          onConfirm={() => commit(pending.a, pending.b)}
        >
          <p>
            {pending.b ? `Swapping ${pending.a.name} with ${pending.b.name}` : `Moving ${pending.a.name}`} would cause:
          </p>
          <ul className="list-disc space-y-1 pl-5 font-semibold text-rose-300">
            {pending.lost.map((w) => (
              <li key={`${w.language}-${w.shift}`}>{w.message}</li>
            ))}
          </ul>
          <p>You can still do it; the warning stays on the schedule.</p>
        </ConfirmDialog>
      )}
    </section>
  )
}

/**
 * Today's schedule as shared by Kevin C or Nestor (Copy for Teams), offered to whoever opens the page: the other
 * one picks up the same schedule instead of generating a second, different one.
 */
function SharedBanner({
  planner,
  differs,
  missing,
  onLoad,
}: {
  planner: LunchPlanner
  differs: boolean
  missing: string[]
  onLoad: (missing: string[]) => void
}) {
  const { enabled } = useSharedShift()
  const shared = planner.sharedToday
  return (
    <>
      {enabled && shared && differs && (
        <div className={`${ALERT_WARNING} flex flex-wrap items-center justify-between gap-2`}>
          <p>
            <strong className="text-amber-200 mr-2 font-bold">
              {planner.board ? 'Schedule difference detected' : 'Shared schedule available'}
            </strong>
            {shared.publishedBy} shared today’s schedule{planner.board ? ', and it differs from the one on screen' : ''}.
          </p>
          <button type="button" className={`${GHOST_BTN} max-md:min-h-11 max-md:w-full`} onClick={() => onLoad(planner.loadShared())}>
            {planner.board ? 'Use the shared schedule' : 'Load it'}
          </button>
        </div>
      )}
      {missing.length > 0 && (
        <p role="status" className={`${ALERT_WARNING} font-semibold`}>
          Not on your roster, so not placed: {missing.join(', ')}. Add them to the table and load it again.
        </p>
      )}
    </>
  )
}

type HeaderProps = {
  planner: LunchPlanner
  onGenerate: () => void
  /** `null` while there is no schedule to copy. */
  onCopy: (() => void) | null
  copied: boolean
  phone: boolean
  /** What Copy for Teams just did, shown next to the buttons on a phone. */
  notice: ReactNode
}

function Header({ planner, onGenerate, onCopy, copied, phone, notice }: HeaderProps) {
  const hasToday = planner.history.some((e) => e.date === planner.today)
  const board = planner.board
  const saveLabel = (
    <>
      {planner.savedToday ? (
        <>
          <CheckIcon className="h-4 w-4" />
          Saved
        </>
      ) : phone ? (
        hasToday ? (
          'Update saved'
        ) : (
          'Save'
        )
      ) : hasToday ? (
        'Update saved schedule'
      ) : (
        "Save today's schedule"
      )}
    </>
  )

  return (
    <div className={`${CARD_HEADER} flex-wrap`}>
      <div>
        <p className={SECTION_LABEL}>Generated coverage</p>
        <h3 id="lunch-schedule-title" className={`${CARD_TITLE} mt-1`}>
          Lunch schedule
        </h3>
      </div>
      {phone ? (
        // Pinned to the bottom of the screen (not to the card), so Generate, Save and Copy for Teams are in
        // reach from the agent list above as well as from the schedule. The page leaves room for it (LunchPlannerPage).
        <div
          role="group"
          aria-label="Schedule actions"
          className="border-line-strong bg-surface fixed inset-x-0 bottom-0 z-30 space-y-2 border-t px-4 pt-3 pb-4 shadow-[0_-8px_24px_rgb(0_0_0/0.3)]"
        >
          {notice}
          <button
            type="button"
            className={`${PRIMARY_BTN} min-h-12 w-full text-base`}
            onClick={onGenerate}
            disabled={planner.agents.every((a) => !a.available)}
          >
            <RefreshIcon className="h-4 w-4" />
            {board ? 'Generate again' : 'Generate'}
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className={`${GHOST_BTN_MD} min-h-11`} onClick={planner.saveToday} disabled={!board || planner.savedToday}>
              {saveLabel}
            </button>
            <button
              type="button"
              className={`${copied ? SUCCESS_BTN : GHOST_BTN_MD} min-h-11`}
              onClick={onCopy ?? undefined}
              disabled={!onCopy}
            >
              <CopyIcon className="h-4 w-4" />
              {copied ? 'Copied' : 'Copy for Teams'}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={PRIMARY_BTN} onClick={onGenerate} disabled={planner.agents.every((a) => !a.available)}>
            <RefreshIcon className="h-4 w-4" />
            {board ? 'Generate again' : 'Generate'}
          </button>
          <button type="button" className={GHOST_BTN_MD} onClick={planner.saveToday} disabled={!board || planner.savedToday}>
            {saveLabel}
          </button>
          <button type="button" className={copied ? SUCCESS_BTN : GHOST_BTN_MD} onClick={onCopy ?? undefined} disabled={!onCopy}>
            <CopyIcon className="h-4 w-4" />
            {copied ? 'Copied' : 'Copy for Teams'}
          </button>
        </div>
      )}
    </div>
  )
}
