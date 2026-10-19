import { useState } from 'react'
import { useNvxData } from '../../app/appDataContext'
import { storageKey, usePersistentState } from '../../shared/storage/usePersistentState'
import { PAGE_SUBTITLE, PAGE_TITLE, PANEL } from '../../shared/ui/styles'
import { AllowChanges } from './components/AllowChanges'
import { ChangesCard } from './components/ChangesCard'
import { ConfirmChangeDialog } from './components/ConfirmChangeDialog'
import type { PendingRequest } from './components/ConfirmChangeDialog'
import { CallDialog, FolderDialog, GroupDialog, UnitDialog } from './components/Dialogs'
import { GroupBar } from './components/GroupBar'
import { LoginCard } from './components/LoginCard'
import { RequestBuilder } from './components/RequestBuilder'
import type { Draft } from './components/RequestBuilder'
import { ResultsCard } from './components/ResultsCard'
import { SavedCallsCard } from './components/SavedCallsCard'
import { UnitsPanel } from './components/UnitsPanel'
import { bodyWarnings, buildChangeBody, changeLine, cleanRequest, flatten, formatHeaderLines, getAtPath, parseDeviceBody } from './nvxData'
import { useNvxRunner } from './useNvxRunner'
import type { DeviceRequest, NvxCall, NvxFolder, NvxUnit, SettingValue } from './types'

type Dialog =
  | { kind: 'newGroup' }
  | { kind: 'editGroup' }
  | { kind: 'unit'; unit?: NvxUnit }
  | { kind: 'folder'; folder?: NvxFolder }
  | { kind: 'call'; call?: NvxCall; initial?: DeviceRequest }

const EMPTY_DRAFT: Draft = { method: 'GET', path: '/Device/DeviceInfo', headers: '', body: '' }

/**
 * A small Postman for Crestron devices: pick a group (NVX, NAX…), tick one or more of its units,
 * then send a request (any method, path, headers and body) or run a saved call, and read the
 * answers. The login and the requests are done by the desktop app, so on the website this page
 * only prepares groups, units and calls.
 */
export function NvxPage() {
  const nvx = useNvxData()
  const runner = useNvxRunner()
  const [activeId, setActiveId] = useState<string | null>(null)
  /** Per group: the ticked units, and the password (memory only — never saved). */
  const [ticked, setTicked] = useState<Record<string, string[]>>({})
  const [passwords, setPasswords] = useState<Record<string, string>>({})
  /** A personal preference: the units panel folded down to one line. */
  const [panelOpen, setPanelOpen] = usePersistentState<boolean>(
    storageKey('nvx', 'panelOpen'),
    () => true,
    (raw) => (typeof raw === 'boolean' ? raw : null),
  )
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT)
  const [dialog, setDialog] = useState<Dialog | null>(null)
  /** Off at every start: the page only reads until the user turns this on. */
  const [writesEnabled, setWritesEnabled] = useState(false)
  const [pending, setPending] = useState<PendingRequest | null>(null)

  const group = nvx.groups.find((g) => g.id === activeId) ?? nvx.groups[0]
  const password = group ? (passwords[group.id] ?? '') : ''
  // Until the user ticks something, the first unit is the one that runs.
  const selectedIds = new Set(
    group ? (ticked[group.id] ?? group.units.slice(0, 1).map((u) => u.id)).filter((id) => group.units.some((u) => u.id === id)) : [],
  )
  const targets = group ? group.units.filter((u) => selectedIds.has(u.id)) : []
  const setSelected = (ids: string[]) => group && setTicked((prev) => ({ ...prev, [group.id]: ids }))
  const login = { username: group?.username ?? '', password }

  const readBlockedReason = !runner.available
    ? 'Requests are sent from the Support Hub desktop app. Here you can prepare groups, units and calls.'
    : !group || group.units.length === 0
      ? 'Add a unit first.'
      : targets.length === 0
        ? 'Tick at least one unit.'
        : !login.username
          ? 'Enter the username.'
          : !password
            ? 'Enter the password.'
            : null
  const changeBlockedReason = !writesEnabled
    ? 'Switch on “Changes allowed” (top right) to send anything but a GET.'
    : (readBlockedReason ?? (targets.length !== 1 ? 'Tick exactly one unit to send a change.' : null))
  const canChange = writesEnabled && runner.available && login.username !== '' && password !== '' && !runner.running

  const runCalls = (calls: (Pick<NvxCall, 'title'> & DeviceRequest)[]) => {
    if (targets.length > 0) void runner.run(targets, login, calls)
  }

  /** Ask for confirmation before anything that changes a device is sent. */
  const review = (unit: NvxUnit, request: DeviceRequest) => {
    const sent = parseDeviceBody(request)
    const shown = (path: string) =>
      runner.results
        .filter((r) => r.unit.id === unit.id)
        .map((r) => getAtPath(r.reply.data, path))
        .find((v) => v !== undefined)
    setPending({
      unit,
      request,
      warnings: bodyWarnings(request.body),
      lines: sent ? flatten(sent).map(({ path }) => changeLine(path, getAtPath(sent, path), shown(path))) : [],
    })
  }

  const changeValue = (unit: NvxUnit, path: string, value: SettingValue) => {
    const body = buildChangeBody(path, value)
    if (body) review(unit, { method: 'POST', path: '/Device', body: JSON.stringify(body) })
  }

  const runCall = (call: NvxCall) => {
    const request = cleanRequest(call)
    if (call.method === 'GET') runCalls([{ title: call.title, ...request }])
    else if (targets[0]) review(targets[0], request)
  }

  const loadCall = (call: NvxCall) =>
    setDraft({ method: call.method, path: call.path, headers: formatHeaderLines(call.headers), body: call.body ?? '' })

  const closeDialog = () => setDialog(null)

  return (
    <div className="mx-auto max-w-[1700px] space-y-5 px-8 py-7">
      <header className="space-y-4">
        <div>
          <h2 className={PAGE_TITLE}>Device API</h2>
          <p className={PAGE_SUBTITLE}>
            Send requests to a device&apos;s REST API
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
              Sending requests needs the Support Hub desktop app, because a web page cannot do the device login. You can still prepare
              your groups, units and calls here.
            </p>
          )}
          <UnitsPanel
            units={group.units}
            selectedIds={selectedIds}
            onToggleUnit={(unitId) => setSelected(selectedIds.has(unitId) ? [...selectedIds].filter((id) => id !== unitId) : [...selectedIds, unitId])}
            onSelectAll={(on) => setSelected(on ? group.units.map((u) => u.id) : [])}
            onAddUnit={() => setDialog({ kind: 'unit' })}
            onEditUnit={(u) => setDialog({ kind: 'unit', unit: u })}
            open={panelOpen}
            onToggle={() => setPanelOpen((open) => !open)}
          />
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
            <SavedCallsCard
              calls={group.calls}
              folders={group.folders}
              readBlockedReason={readBlockedReason}
              changeBlockedReason={changeBlockedReason}
              running={runner.running}
              unitCount={targets.length}
              onLoad={loadCall}
              onRun={runCall}
              onRunMany={(calls) => runCalls(calls.map((c) => ({ title: c.title, ...cleanRequest(c) })))}
              onEditCall={(call) => setDialog({ kind: 'call', call })}
              onAddFolder={() => setDialog({ kind: 'folder' })}
              onEditFolder={(folder) => setDialog({ kind: 'folder', folder })}
            />
            <LoginCard
              username={group.username}
              password={password}
              onUsername={(name) => nvx.setUsername(group.id, name)}
              onPassword={(value) => setPasswords((prev) => ({ ...prev, [group.id]: value }))}
            />
          </div>
          <RequestBuilder
            draft={draft}
            onDraft={setDraft}
            readBlockedReason={readBlockedReason}
            changeBlockedReason={changeBlockedReason}
            running={runner.running}
            onSend={(request) => runCalls([{ title: 'Request', ...request }])}
            onReview={(request) => targets[0] && review(targets[0], request)}
            onSave={(request) => setDialog({ kind: 'call', initial: request })}
          />
          <ResultsCard
            results={runner.results}
            units={runner.units}
            running={runner.running}
            onClear={runner.clear}
            canChange={canChange}
            onChange={changeValue}
          />
          {runner.changes.length > 0 && <ChangesCard entries={runner.changes} onClear={runner.clearChanges} />}
        </>
      )}

      {pending && (
        <ConfirmChangeDialog
          key={`${pending.request.method} ${pending.request.path} ${pending.request.body ?? ''}`}
          pending={pending}
          onSend={() => runner.apply(pending.unit, login, pending.request)}
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
      {dialog?.kind === 'folder' && group && (
        <FolderDialog
          key={dialog.folder?.id ?? 'new'}
          folder={dialog.folder}
          onClose={closeDialog}
          onSave={(name) => {
            if (dialog.folder) nvx.renameFolder(group.id, dialog.folder.id, name)
            else nvx.addFolder(group.id, name)
            closeDialog()
          }}
          onDelete={
            dialog.folder
              ? () => {
                  nvx.deleteFolder(group.id, dialog.folder!.id)
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
          initial={dialog.initial}
          folders={group.folders}
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
