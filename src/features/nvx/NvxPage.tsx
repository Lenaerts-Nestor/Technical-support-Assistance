import { useState } from 'react'
import { useNvxData } from '../../app/appDataContext'
import { PAGE_SUBTITLE, PAGE_TITLE, PANEL } from '../../shared/ui/styles'
import { CallsCard } from './components/CallsCard'
import { CallDialog, GroupDialog, UnitDialog } from './components/Dialogs'
import { ExplorerCard } from './components/ExplorerCard'
import { GroupBar } from './components/GroupBar'
import { LoginCard } from './components/LoginCard'
import { ResultsCard } from './components/ResultsCard'
import { UnitsCard } from './components/UnitsCard'
import { useNvxRunner } from './useNvxRunner'
import type { NvxCall, NvxUnit } from './types'

type Dialog =
  | { kind: 'newGroup' }
  | { kind: 'editGroup' }
  | { kind: 'unit'; unit?: NvxUnit }
  | { kind: 'call'; call?: NvxCall; path?: string }

/**
 * Reads settings from Crestron devices over their HTTPS REST API: pick a group (NVX, NAX…),
 * pick one of its units, then run a saved call or try any path in the explorer. The login and
 * the requests are done by the desktop app, so on the website this page only prepares groups,
 * units and calls.
 */
export function NvxPage() {
  const nvx = useNvxData()
  const runner = useNvxRunner()
  const [activeId, setActiveId] = useState<string | null>(null)
  /** Per group: the selected unit and the password (memory only — never saved). */
  const [unitIds, setUnitIds] = useState<Record<string, string>>({})
  const [passwords, setPasswords] = useState<Record<string, string>>({})
  const [explorerPath, setExplorerPath] = useState('/Device/DeviceInfo')
  const [dialog, setDialog] = useState<Dialog | null>(null)

  const group = nvx.groups.find((g) => g.id === activeId) ?? nvx.groups[0]
  const unit = group?.units.find((u) => u.id === unitIds[group.id]) ?? group?.units[0]
  const password = group ? (passwords[group.id] ?? '') : ''

  const blockedReason = !runner.available
    ? 'Calls run from the Support Hub desktop app. Here you can prepare groups, units and calls.'
    : !unit
      ? 'Add a unit first.'
      : !group.username
        ? 'Enter the username.'
        : !password
          ? 'Enter the password.'
          : null

  const runCalls = (calls: Pick<NvxCall, 'title' | 'path'>[]) => {
    if (group && unit) void runner.run(unit, { username: group.username, password }, calls)
  }

  const closeDialog = () => setDialog(null)

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 px-8 py-7">
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
          <div className="grid items-start gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
            <div className="space-y-6">
              <UnitsCard
                units={group.units}
                selectedId={unit?.id}
                onSelect={(unitId) => setUnitIds((prev) => ({ ...prev, [group.id]: unitId }))}
                onAdd={() => setDialog({ kind: 'unit' })}
                onEdit={(u) => setDialog({ kind: 'unit', unit: u })}
              />
              <LoginCard
                username={group.username}
                password={password}
                onUsername={(name) => nvx.setUsername(group.id, name)}
                onPassword={(value) => setPasswords((prev) => ({ ...prev, [group.id]: value }))}
              />
            </div>
            <div className="space-y-6">
              <CallsCard
                calls={group.calls}
                blockedReason={blockedReason}
                running={runner.running}
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
              <ResultsCard results={runner.results} running={runner.running} onClear={runner.clear} />
            </div>
          </div>
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
            setUnitIds((prev) => ({ ...prev, [group.id]: id }))
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
