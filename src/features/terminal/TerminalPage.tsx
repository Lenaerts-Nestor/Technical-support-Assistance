import { useState } from 'react'
import { useNvxData } from '../../app/appDataContext'
import { useFocusMode } from '../../app/focusMode'
import { storageKey, usePersistentState } from '../../shared/storage/usePersistentState'
import { DANGER_BTN, EMPTY, PAGE_SUBTITLE, PAGE_TITLE, PANEL, PRIMARY_BTN } from '../../shared/ui/styles'
import { PlusIcon } from '../../shared/ui/icons'
import { AddTerminalDialog } from './components/AddTerminalDialog'
import type { NewTerminal } from './components/AddTerminalDialog'
import { ConnectCard } from './components/ConnectCard'
import { TerminalCard } from './components/TerminalCard'
import type { NvxUnit } from '../nvx/types'
import type { TerminalEntry } from './types'

type PerRow = 1 | 2 | 3

/** Grid classes per setting. Three across only on a wide window; two on a medium one. */
const GRID: Record<PerRow, string> = {
  1: 'grid-cols-1',
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-2 xl:grid-cols-3',
}

/**
 * SSH terminals to units, side by side: up to three across, more below. Click a saved unit (or type
 * an IP address) and a terminal opens for it with the login on the page. Each terminal has a small
 * card with the unit's host name, firmware and PUF, and a button to open its web interface.
 */
export function TerminalPage() {
  const nvx = useNvxData()
  const available = typeof window !== 'undefined' && window.desktop?.terminal !== undefined
  const [username, setUsername] = usePersistentState<string>(
    storageKey('terminal', 'username'),
    () => 'admin',
    (raw) => (typeof raw === 'string' ? raw : null),
  )
  /** Memory only — never saved. */
  const [password, setPassword] = useState('')
  const [terminals, setTerminals] = useState<TerminalEntry[]>([])
  const [adding, setAdding] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  /** How many terminals sit side by side (at most three); the rest wrap below. A personal preference. */
  const [perRow, setPerRow] = usePersistentState<PerRow>(
    storageKey('terminal', 'perRow'),
    () => 3,
    (raw) => (raw === 1 || raw === 2 || raw === 3 ? raw : null),
  )
  // Terminals need width: while any is open the sidebar shrinks to icons.
  useFocusMode('terminal', terminals.length > 0)

  const open = (label: string, ip: string, login = { username, password }) => {
    if (!available) {
      setNotice('Terminals run from the Support Hub desktop app.')
      return false
    }
    if (!login.username.trim() || !login.password) {
      setNotice('Enter the username and password in the login card first.')
      return false
    }
    setNotice(null)
    setTerminals((prev) => [...prev, { key: crypto.randomUUID(), label, ip, username: login.username.trim(), password: login.password }])
    return true
  }

  const openUnit = (unit: NvxUnit) => open(unit.label, unit.ip)

  const addByHand = (added: NewTerminal) => {
    if (!open(added.label, added.ip, added.login)) {
      setAdding(false)
      return
    }
    if (added.saveToGroupId) nvx.saveUnit(added.saveToGroupId, { label: added.label, ip: added.ip })
    setAdding(false)
  }

  return (
    <div className="mx-auto max-w-[2000px] space-y-5 px-6 py-7">
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_330px]">
        <header className="space-y-4">
          <div>
            <h2 className={PAGE_TITLE}>Terminal</h2>
            <p className={PAGE_SUBTITLE}>SSH consoles to your units, side by side</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className={PRIMARY_BTN} disabled={!available} onClick={() => setAdding(true)}>
              <PlusIcon className="h-4 w-4" />
              Add terminal
            </button>
            {terminals.length > 0 && (
              <button type="button" className={DANGER_BTN} onClick={() => setTerminals([])}>
                Close all
              </button>
            )}
          </div>
          <div className="text-ink-muted flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span>Per row</span>
              <div className="border-line flex rounded-md border p-0.5" role="group" aria-label="Terminals per row">
                {([1, 2, 3] as const).map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-pressed={perRow === n}
                    onClick={() => setPerRow(n)}
                    className={`rounded px-3 py-0.5 text-xs font-semibold ${perRow === n ? 'bg-brand text-on-brand' : 'hover:text-ink'}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <span>Up/Down recall past commands, Tab completes a command name. Select text and press Ctrl+C to copy; Ctrl+V pastes.</span>
          </div>
          {!available && (
            <p className={`${PANEL} text-ink-muted px-4 py-3 text-sm`}>
              Terminals run from the Support Hub desktop app, because a web page cannot open an SSH connection.
            </p>
          )}
          {notice && (
            <p role="alert" className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
              {notice}
            </p>
          )}
        </header>
        <ConnectCard username={username} password={password} onUsername={setUsername} onPassword={setPassword} groups={nvx.groups} onOpen={openUnit} />
      </div>

      {terminals.length === 0 ? (
        <p className={EMPTY}>No terminals open. Click a saved unit on the right, or use Add terminal to type an IP address.</p>
      ) : (
        <div className={`grid items-start gap-4 ${GRID[perRow]}`}>
          {terminals.map((entry) => (
            <TerminalCard key={entry.key} entry={entry} onClose={() => setTerminals((prev) => prev.filter((t) => t.key !== entry.key))} />
          ))}
        </div>
      )}

      {adding && <AddTerminalDialog groups={nvx.groups} username={username} onAdd={addByHand} onClose={() => setAdding(false)} />}
    </div>
  )
}
