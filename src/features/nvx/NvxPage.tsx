import { useState } from 'react'
import { useNvxData } from '../../app/appDataContext'
import { storageKey, usePersistentState } from '../../shared/storage/usePersistentState'
import { PAGE_SUBTITLE, PAGE_TITLE, PANEL } from '../../shared/ui/styles'
import { CallsCard } from './components/CallsCard'
import { ConnectionPanel } from './components/ConnectionPanel'
import { CallDialog, GroupDialog, UnitDialog } from './components/Dialogs'
import { ExplorerCard } from './components/ExplorerCard'
import { GroupBar } from './components/GroupBar'
import { ResultsCard } from './components/ResultsCard'
import { useNvxRunner } from './useNvxRunner'
import type { NvxCall, NvxUnit } from './types'

type Dialog =
  | { kind: 'newGroup' }
  | { kind: 'editGroup' }
  | { kind: 'unit'; unit?: NvxUnit }
  | { kind: 'call'; call?: NvxCall; path?: string }

/**
 * Reads settings from Crestron devices over their HTTPS REST API: pick a group (NVX, NAX…),
 * tick one or more of its units, then run a saved call or try any path in the explorer. The login and
 * the requests are done by the desktop app, so on the website this page only prepares groups,
 * units and calls.
 */
export function NvxPage() {
  const nvx = useNvxData()
  const runner = useNvxRunner()
  const [activeId, setActiveId] = useState<string | null>(null)
  /** Per group: the ticked units, and the password (memory only — never saved). */
  const [ticked, setTicked] = useState<Record<string, string[]>>({})
  const [passwords, setPasswords] = useState<Record<string, string>>({})
  /** A personal preference: the units & login panel folded down to one line. */
  const [panelOpen, setPanelOpen] = usePersistentState<boolean>(
    storageKey('nvx', 'panelOpen'),
    () => true,
    (raw) => (typeof raw === 'boolean' ? raw : null),
  )
  const [explorerPath, setExplorerPath] = useState('/Device/DeviceInfo')
  const [dialog, setDialog] = useState<Dialog | null>(null)

  const group = nvx.groups.find((g) => g.id === activeId) ?? nvx.groups[0]
  const password = group ? (passwords[group.id] ?? '') : ''
  // Until the user ticks something, the first unit is the one that runs.
  const selectedIds = new Set(
    group ? (ticked[group.id] ?? group.units.slice(0, 1).map((u) => u.id)).filter((id) => group.units.some((u) => u.id === id)) : [],
  )
  const targets = group ? group.units.filter((u) => selectedIds.has(u.id)) : []
  const setSelected = (ids: string[]) => group && setTicked((prev) => ({ ...prev, [group.id]: ids }))

  const blockedReason = !runner.available
    ? 'Calls run from the Support Hub desktop app. Here you can prepare groups, units and calls.'
    : group.units.length === 0
      ? 'Add a unit first.'
      : targets.length === 0
        ? 'Tick at least one unit.'
        : !group.username
          ? 'Enter the username.'
          : !password
            ? 'Enter the password.'
            : null

  const runCalls = (calls: Pick<NvxCall, 'title' | 'path'>[]) => {
    if (group && targets.length > 0) void runner.run(targets, { username: group.username, password }, calls)
  }

  const closeDialog = () => setDialog(null)

  return (
    <div className="mx-auto max-w-[1700px] space-y-6 px-8 py-7">
      <header className="space-y-4">
        <div>
          <h2 className={PAGE_TITLE}>Device API</h2>
          <p className={PAGE_SUBTITLE}>
            Read a device&apos;s settings through its REST API
            {nvx.savedToFile && <span className="text-ink-faint"> · saved to nvx.json</span>}
          </p>
        </div>
        <GroupBar
          groups={nvx.groups}
          activeId={group?.id ?? null}
          onSelect={setActiveId}
          onAdd={() => setDialog({ kind: 'newGroup' })}
          onEdit={() => setDialog({ kind: 'editGroup' })}
        />
      </header>

      {!group ? (
        <p className="text-ink-muted border-line-strong rounded-xl border border-dashed px-4 py-12 text-center text-sm">
          No groups. Add one to start (for example NVX API).
        </p>
      ) : (
        <>
          {!runner.available && (
            <p className={`${PANEL} text-ink-muted px-4 py-3 text-sm`}>
              Running calls needs the Support Hub desktop app, because a web page cannot do the device login. You can still prepare
              your groups, units and calls here.
            </p>
          )}
          <ConnectionPanel
            units={group.units}
            selectedIds={selectedIds}
            onToggleUnit={(unitId) => setSelected(selectedIds.has(unitId) ? [...selectedIds].filter((id) => id !== unitId) : [...selectedIds, unitId])}
            onSelectAll={(on) => setSelected(on ? group.units.map((u) => u.id) : [])}
            onAddUnit={() => setDialog({ kind: 'unit' })}
            onEditUnit={(u) => setDialog({ kind: 'unit', unit: u })}
            username={group.username}
            password={password}
            onUsername={(name) => nvx.setUsername(group.id, name)}
            onPassword={(value) => setPasswords((prev) => ({ ...prev, [group.id]: value }))}
            open={panelOpen}
            onToggle={() => setPanelOpen((open) => !open)}
          />
          <CallsCard
            calls={group.calls}
            blockedReason={blockedReason}
            running={runner.running}
            unitCount={targets.length}
            onRun={(call) => runCalls([call])}
            onRunAll={() => runCalls(group.calls)}
            onEdit={(call) => setDialog({ kind: 'call', call })}
          />
          <ExplorerCard
            path={explorerPath}
            onPath={setExplorerPath}
            blockedReason={blockedReason}
            running={runner.running}
            onSend={(path) => runCalls([{ title: 'Explorer', path }])}
            onSave={(path) => setDialog({ kind: 'call', path })}
          />
          <ResultsCard results={runner.results} units={runner.units} running={runner.running} onClear={runner.clear} />
        </>
      )}

      {dialog?.kind === 'newGroup' && (
        <GroupDialog
          onClose={closeDialog}
          onSave={(name) => {
            setActiveId(nvx.addGroup(name))
            closeDialog()
          }}
        />
      )}
      {dialog?.kind === 'editGroup' && group && (
        <GroupDialog
          group={group}
          onClose={closeDialog}
          onSave={(name) => {
            nvx.renameGroup(group.id, name)
            closeDialog()
          }}
          onDelete={() => {
            nvx.deleteGroup(group.id)
            setActiveId(null)
            closeDialog()
          }}
        />
      )}
      {dialog?.kind === 'unit' && group && (
        <UnitDialog
          key={dialog.unit?.id ?? 'new'}
          unit={dialog.unit}
          onClose={closeDialog}
          onSave={(fields) => {
            const id = nvx.saveUnit(group.id, { ...fields, id: dialog.unit?.id })
            if (!selectedIds.has(id)) setSelected([...selectedIds, id])
            closeDialog()
          }}
          onDelete={
            dialog.unit
              ? () => {
                  nvx.removeUnit(group.id, dialog.unit!.id)
                  closeDialog()
                }
              : undefined
          }
        />
      )}
      {dialog?.kind === 'call' && group && (
        <CallDialog
          key={dialog.call?.id ?? 'new'}
          call={dialog.call}
          initialPath={dialog.path}
          onClose={closeDialog}
          onSave={(fields) => {
            nvx.saveCall(group.id, { ...fields, id: dialog.call?.id })
            closeDialog()
          }}
          onDelete={
            dialog.call
              ? () => {
                  nvx.removeCall(group.id, dialog.call!.id)
                  closeDialog()
                }
              : undefined
          }
        />
      )}
    </div>
  )
}
