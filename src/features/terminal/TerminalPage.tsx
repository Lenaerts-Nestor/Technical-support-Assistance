import { useRef, useState } from 'react'
import { UnitCard } from './components/UnitCard'
import { UnitForm } from './components/UnitForm'
import { ConnectDialog } from './components/ConnectDialog'
import { TerminalTabs } from './components/TerminalTabs'
import { useUnits } from './useUnits'
import type { UnitDraft } from './useUnits'
import type { ConnectionState, Credentials, Session, Unit } from './types'
import { EMPTY, PAGE_SUBTITLE, PAGE_TITLE, PRIMARY_BTN } from '../../shared/ui/styles'
import { PlusIcon } from '../../shared/ui/icons'

type Dialog =
  | { kind: 'edit'; unit: Unit | null } // null = add
  | { kind: 'connect'; unit: Unit; initial?: Credentials }

export function TerminalPage() {
  const { units, status, saveError, add, update, remove } = useUnits()
  const [sessions, setSessions] = useState<Session[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [states, setStates] = useState<Record<string, ConnectionState>>({})
  const [dialog, setDialog] = useState<Dialog | null>(null)
  // Remembered only until the page is reloaded, so a second terminal on the same
  // unit doesn't ask again. Never written to storage.
  const recent = useRef(new Map<string, Credentials>())

  const openCount = (unitId: string) => sessions.filter((s) => s.unit.id === unitId).length

  const openSession = (unit: Unit, credentials: Credentials) => {
    recent.current.set(unit.id, credentials)
    const sameUnit = openCount(unit.id)
    const session: Session = {
      id: crypto.randomUUID(),
      unit,
      ...credentials,
      label: sameUnit ? `${unit.name} #${sameUnit + 1}` : unit.name,
    }
    setSessions((prev) => [...prev, session])
    setActiveId(session.id)
    setDialog(null)
  }

  const closeSession = (id: string) => {
    const index = sessions.findIndex((s) => s.id === id)
    const remaining = sessions.filter((s) => s.id !== id)
    setSessions(remaining)
    if (activeId === id) setActiveId(remaining[Math.min(index, remaining.length - 1)]?.id ?? null)
  }

  // The login was refused: drop that tab and ask again, pre-filled with what was typed.
  const reauth = (id: string) => {
    const session = sessions.find((s) => s.id === id)
    if (!session) return
    closeSession(id)
    setDialog({
      kind: 'connect',
      unit: session.unit,
      initial: { username: session.username, password: '' },
    })
  }

  const saveUnit = (draft: UnitDraft) => {
    if (dialog?.kind === 'edit' && dialog.unit) update(dialog.unit.id, draft)
    else add(draft)
    setDialog(null)
  }

  const deleteUnit = (unit: Unit) => {
    const open = openCount(unit.id)
    const warning = open ? ` Its ${open} open terminal${open > 1 ? 's' : ''} will stay open.` : ''
    if (window.confirm(`Delete "${unit.name}"?${warning}`)) remove(unit.id)
  }

  return (
    <div className="flex h-full flex-col">
      <div className={`min-h-0 overflow-y-auto px-8 py-7 ${sessions.length ? 'max-h-[45%] shrink-0' : 'flex-1'}`}>
        <div className="mx-auto max-w-[1600px] space-y-6">
          <header className="flex items-start justify-between gap-4">
            <div>
              <h2 className={PAGE_TITLE}>Terminal</h2>
              <p className={PAGE_SUBTITLE}>SSH into a unit on this network — credentials are never saved</p>
            </div>
            <button
              type="button"
              onClick={() => setDialog({ kind: 'edit', unit: null })}
              disabled={status !== 'ready'}
              className={`${PRIMARY_BTN} disabled:opacity-40`}
            >
              <PlusIcon className="h-4 w-4" />
              Add unit
            </button>
          </header>

          {status === 'unavailable' && (
            <div className={EMPTY}>
              The local SSH bridge isn&apos;t reachable. Start the app with{' '}
              <code className="text-ink">npm run dev</code> (or <code className="text-ink">npm run preview</code>) on
              the laptop that is on the unit&apos;s network.
            </div>
          )}
          {saveError && (
            <p className="text-sm text-rose-300">Couldn&apos;t save the unit list — the change is only in this tab.</p>
          )}
          {status === 'ready' && units.length === 0 && (
            <div className={EMPTY}>No units yet. Add one with its name and IP address.</div>
          )}
          {units.length > 0 && (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(20rem,1fr))] gap-4">
              {units.map((unit) => (
                <UnitCard
                  key={unit.id}
                  unit={unit}
                  openCount={openCount(unit.id)}
                  onOpen={() => setDialog({ kind: 'connect', unit, initial: recent.current.get(unit.id) })}
                  onEdit={() => setDialog({ kind: 'edit', unit })}
                  onDelete={() => deleteUnit(unit)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {sessions.length > 0 && (
        <TerminalTabs
          sessions={sessions}
          activeId={activeId}
          states={states}
          onSelect={setActiveId}
          onClose={closeSession}
          onReauth={reauth}
          onState={(id, state) => setStates((prev) => (prev[id] === state ? prev : { ...prev, [id]: state }))}
        />
      )}

      {dialog?.kind === 'edit' && (
        <UnitForm initial={dialog.unit ?? undefined} onSave={saveUnit} onCancel={() => setDialog(null)} />
      )}
      {dialog?.kind === 'connect' && (
        <ConnectDialog
          unit={dialog.unit}
          initial={dialog.initial}
          onConnect={(credentials) => openSession(dialog.unit, credentials)}
          onCancel={() => setDialog(null)}
        />
      )}
    </div>
  )
}
