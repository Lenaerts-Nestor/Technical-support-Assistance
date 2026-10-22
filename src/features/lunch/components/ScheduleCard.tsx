import { useEffect, useMemo, useRef, useState } from 'react'
import type { DragEvent } from 'react'
import { SHIFT_LABELS } from '../config'
import { applyMove, coverageLost } from '../coverage'
import { boardNames } from '../board'
import { teamsText } from '../teamsText'
import type { LunchPlanner } from '../useLunchPlanner'
import type { Agent, LanguageWarning, ShiftNo } from '../types'
import { useCopyToClipboard } from '../../../shared/hooks/useCopyToClipboard'
import {
  CARD,
  CARD_HEADER,
  COUNT_BADGE,
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
  uncovered: 'border-rose-400/50 bg-rose-400/10 text-rose-200',
  single: 'border-amber-400/45 bg-amber-400/10 text-amber-100',
  none: 'border-amber-400/45 bg-amber-400/10 text-amber-100',
}

/**
 * Generate, adjust, save and copy today's lunch schedule. Swapping works three
 * ways: the Swap button on a card (keyboard friendly), the "Move … here" button
 * it opens, or dragging a card onto another card / the other column.
 */
export function ScheduleCard({ planner }: { planner: LunchPlanner }) {
  const { board, agents } = planner
  const [pickedId, setPickedId] = useState<string | null>(null)
  const [pending, setPending] = useState<Pending | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const { copied, copy } = useCopyToClipboard()
  const [copyFailed, setCopyFailed] = useState(false)
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

  if (!board) {
    return (
      <section className={CARD} aria-labelledby="lunch-schedule-title">
        <Header planner={planner} onCopy={null} copied={false} />
        <div className="p-4">
          <p className={EMPTY}>
            No schedule yet. Mark who is in today in the table, then press Generate.
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
    const ok = await copy(teamsText(boardNames(board)))
    setCopyFailed(!ok)
  }

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
    <section className={CARD} aria-labelledby="lunch-schedule-title">
      <Header planner={planner} onCopy={copyText} copied={copied === 'default'} />

      <div className="space-y-4 p-4">
        <p className="sr-only" role="status">
          {picked && pickedShift
            ? `${picked.name} selected. Choose an agent in ${SHIFT_LABELS[pickedShift === 1 ? 2 : 1]} to swap with, or move ${picked.name} there. Press Escape to cancel.`
            : announcement}
        </p>
        {copyFailed && (
          <p role="alert" className="text-sm font-semibold text-rose-300">
            Could not copy to the clipboard. Allow clipboard access for this site and try again.
          </p>
        )}

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
                  className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm ${WARNING_TONE[w.kind]}`}
                >
                  <AlertIcon className="h-4 w-4 shrink-0" />
                  {w.message}
                </li>
              ))}
            </ul>
          )}
        </div>

        {board.unassigned.length > 0 && (
          <div className="rounded-lg border border-amber-400/45 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">
            <p className="font-semibold">
              Available but not scheduled (the table changed after generating). Generate again, or place them:
            </p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {board.unassigned.map((agent) => (
                <li key={agent.id} className="flex items-center gap-1.5">
                  <span className="font-semibold">{agent.name}</span>
                  {([1, 2] as const).map((shift) => (
                    <button
                      key={shift}
                      type="button"
                      className={GHOST_BTN}
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
          Drag an agent onto a card in the other shift to swap, or onto the column to move. With the keyboard, press
          Swap on a card and pick a partner.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          {order.map(([shift, list]) => columnFor(shift, list))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <section className={`${INSET} p-3`} aria-labelledby="lunch-chat-title">
            <div className="mb-2 flex items-center justify-between">
              <h4 id="lunch-chat-title" className={SECTION_LABEL}>Chat</h4>
              <span className={COUNT_BADGE}>{board.chat.length}</span>
            </div>
            {board.chat.length === 0 ? (
              <p className="text-ink-muted text-sm">No chat agents scheduled.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {board.chat.map((agent) => (
                  <li key={agent.id} className="text-ink flex justify-between gap-2">
                    {agent.name}
                    <span className="text-ink-muted">{board.shift1.includes(agent) ? SHIFT_LABELS[1] : SHIFT_LABELS[2]}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className={`${INSET} p-3`} aria-labelledby="lunch-out-title">
            <div className="mb-2 flex items-center justify-between">
              <h4 id="lunch-out-title" className={SECTION_LABEL}>PTO / OOO</h4>
              <span className={COUNT_BADGE}>{board.out.length}</span>
            </div>
            {board.out.length === 0 ? (
              <p className="text-ink-muted text-sm">Everybody is in today.</p>
            ) : (
              <ul className="text-ink space-y-1 text-sm">
                {board.out.map((agent) => (
                  <li key={agent.id}>{agent.name}</li>
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

type HeaderProps = {
  planner: LunchPlanner
  /** `null` while there is no schedule to copy. */
  onCopy: (() => void) | null
  copied: boolean
}

function Header({ planner, onCopy, copied }: HeaderProps) {
  const hasToday = planner.history.some((e) => e.date === planner.today)
  const board = planner.board
  return (
    <div className={`${CARD_HEADER} flex-wrap`}>
      <h3 id="lunch-schedule-title" className="text-ink text-sm font-bold tracking-tight">
        Lunch schedule
      </h3>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={PRIMARY_BTN} onClick={planner.generate} disabled={planner.agents.every((a) => !a.available)}>
          <RefreshIcon className="h-4 w-4" />
          {board ? 'Generate again' : 'Generate'}
        </button>
        <button
          type="button"
          className={GHOST_BTN_MD}
          onClick={planner.saveToday}
          disabled={!board || planner.savedToday}
        >
          {planner.savedToday ? (
            <>
              <CheckIcon className="h-4 w-4" />
              Saved
            </>
          ) : hasToday ? (
            'Update saved schedule'
          ) : (
            "Save today's schedule"
          )}
        </button>
        <button type="button" className={copied ? SUCCESS_BTN : GHOST_BTN_MD} onClick={onCopy ?? undefined} disabled={!onCopy}>
          <CopyIcon className="h-4 w-4" />
          {copied ? 'Copied' : 'Copy for Teams'}
        </button>
      </div>
    </div>
  )
}
