import { useState } from 'react'
import { useNvxData } from '../../app/appDataContext'
import { useCopyToClipboard } from '../../shared/hooks/useCopyToClipboard'
import { storageKey, usePersistentState } from '../../shared/storage/usePersistentState'
import { GHOST_BTN, PAGE_SUBTITLE, PAGE_TITLE, PANEL } from '../../shared/ui/styles'
import { AllowChanges } from './components/AllowChanges'
import { CallsCard } from './components/CallsCard'
import { ChangesCard } from './components/ChangesCard'
import { ConfirmChangeDialog } from './components/ConfirmChangeDialog'
import type { PendingChange } from './components/ConfirmChangeDialog'
import { ConnectionPanel } from './components/ConnectionPanel'
import { CallDialog, GroupDialog, UnitDialog } from './components/Dialogs'
import { ExplorerCard } from './components/ExplorerCard'
import { GroupBar } from './components/GroupBar'
import { ResultsCard } from './components/ResultsCard'
import { buildChangeBody, changeLine, flatten, getAtPath } from './nvxData'
import { useNvxRunner } from './useNvxRunner'
import type { NvxCall, NvxUnit, SettingValue } from './types'

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
  /** Off at every start: the page only reads until the user turns this on. */
  const [writesEnabled, setWritesEnabled] = useState(false)
  const [pending, setPending] = useState<PendingChange | null>(null)
  const [streamNotice, setStreamNotice] = useState<{ ok: boolean; text: string; url: string } | null>(null)
  const { copied, copy } = useCopyToClipboard()

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

  const login = { username: group?.username ?? '', password }
  const canChange = writesEnabled && runner.available && login.username !== '' && password !== '' && !runner.running
  const changeBlockedReason = !writesEnabled
    ? 'Switch on “Changes allowed” (top right) to send a change.'
    : (blockedReason ?? (targets.length !== 1 ? 'Tick exactly one unit to change settings.' : null))

  /** Ask for confirmation before anything is sent. */
  const requestChange = (unit: NvxUnit, body: Record<string, unknown>) => {
    const shown = (path: string) =>
      runner.results
        .filter((r) => r.unit.id === unit.id)
        .map((r) => getAtPath(r.reply.data, path))
        .find((v) => v !== undefined)
    setPending({ unit, body, lines: flatten(body).map(({ path }) => changeLine(path, getAtPath(body, path), shown(path))) })
  }

  const changeValue = (unit: NvxUnit, path: string, value: SettingValue) => {
    const body = buildChangeBody(path, value)
    if (body) requestChange(unit, body)
  }

  const openStream = async (unit: NvxUnit) => {
    if (!unit.streamUrl) return
    const result = (await window.desktop?.openStream(unit.streamUrl)) ?? { ok: false, error: 'Streams open from the Support Hub desktop app.' }
    const label = unit.label || unit.ip
    setStreamNotice({ ok: result.ok, text: result.ok ? `Opening ${label} in VLC…` : (result.error ?? 'The stream could not be opened.'), url: unit.streamUrl })
  }

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
        <div className="flex flex-wrap items-center gap-3">
          <GroupBar
            groups={nvx.groups}
            activeId={group?.id ?? null}
            onSelect={setActiveId}
            onAdd={() => setDialog({ kind: 'newGroup' })}
            onEdit={() => setDialog({ kind: 'editGroup' })}
          />
          {group && <AllowChanges on={writesEnabled} onChange={setWritesEnabled} />}
        </div>
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
            onOpenStream={(u) => void openStream(u)}
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
            changeBlockedReason={changeBlockedReason}
            onChange={(body) => targets[0] && requestChange(targets[0], body)}
          />
          {streamNotice && (
            <p role="status" className={`${PANEL} flex flex-wrap items-center gap-3 px-4 py-3 text-sm ${streamNotice.ok ? 'text-ink-muted' : 'text-rose-200'}`}>
              {streamNotice.text}
              {!streamNotice.ok && (
                <button type="button" className={GHOST_BTN} onClick={() => void copy(streamNotice.url)}>
                  {copied ? 'Copied' : 'Copy address'}
                </button>
              )}
              <button type="button" className={`${GHOST_BTN} ml-auto`} onClick={() => setStreamNotice(null)}>
                Dismiss
              </button>
            </p>
          )}
          <ResultsCard
            results={runner.results}
            units={runner.units}
            running={runner.running}
            onClear={runner.clear}
            canChange={canChange}
            onChange={changeValue}
            onOpenStream={(u) => void openStream(u)}
          />
          {runner.changes.length > 0 && <ChangesCard entries={runner.changes} onClear={runner.clearChanges} />}
        </>
      )}

      {pending && (
        <ConfirmChangeDialog
          key={pending.lines.join('|')}
          change={pending}
          onApply={() => runner.apply(pending.unit, login, pending.body)}
          onClose={() => setPending(null)}
        />
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
