import { useEffect, useRef, useState } from 'react'
import { useNvxData } from '../../app/appDataContext'
import { storageKey, usePersistentState } from '../../shared/storage/usePersistentState'
import { PAGE_SUBTITLE, PAGE_TITLE, PANEL } from '../../shared/ui/styles'
import { AllowChanges } from './components/AllowChanges'
import { CallPicker } from './components/CallPicker'
import type { PickerTab } from './components/CallPicker'
import { ChangesCard } from './components/ChangesCard'
import { ConfirmChangeDialog } from './components/ConfirmChangeDialog'
import type { PendingRequest } from './components/ConfirmChangeDialog'
import { CallDialog, FolderDialog, GroupDialog, UnitDialog } from './components/Dialogs'
import { GroupBar } from './components/GroupBar'
import { LoginFields } from './components/LoginFields'
import { RequestBuilder } from './components/RequestBuilder'
import type { Draft } from './components/RequestBuilder'
import { ResultsCard } from './components/ResultsCard'
import { SavedCallsCard } from './components/SavedCallsCard'
import { UnitsPanel } from './components/UnitsPanel'
import type { Requirement } from './components/UnitsPanel'
import { bodyWarnings, buildChangesBody, changeLine, cleanRequest, flatten, formToRows, formatHeaderLines, getAtPath, missingFiles, parseDeviceBody } from './nvxData'
import { useNvxRunner } from './useNvxRunner'
import type { DeviceRequest, NvxCall, NvxFolder, NvxUnit, SettingValue } from './types'

type Dialog =
  | { kind: 'newGroup' }
  | { kind: 'editGroup' }
  | { kind: 'unit'; unit?: NvxUnit }
  | { kind: 'folder'; folder?: NvxFolder }
  | { kind: 'call'; call?: NvxCall; initial?: DeviceRequest }

/** A copy of the record without one key. */
const omit = <T,>(record: Record<string, T>, key: string): Record<string, T> => Object.fromEntries(Object.entries(record).filter(([k]) => k !== key))

const EMPTY_DRAFT: Draft = { method: 'GET', path: '/Device/DeviceInfo', headers: '', bodyMode: 'raw', body: '', form: [] }

/**
 * A small Postman for Crestron devices: pick a group (NVX, NAX…), tick one or more of its units,
 * then send a request (any method, path, headers and body) or run a saved call, and read the
 * answers. The login and the requests are done by the desktop app, so on the website this page
 * only prepares groups, units and calls.
 *
 * The page is laid out as three numbered steps, so it is always clear what to do next and where
 * the answer will land: 1 Connect and 2 Choose what to send stack on the left, and 3 Results stays
 * pinned beside them, so a Send is answered right next to the pointer.
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
  /** Step 2 opens on the saved calls when there are any, otherwise on the builder. */
  const [pickerTab, setPickerTab] = useState<PickerTab>(() => ((nvx.groups[0]?.calls.length ?? 0) > 0 ? 'saved' : 'request'))
  /** The saved call last loaded into the builder, highlighted in the list. */
  const [loadedId, setLoadedId] = useState<string | null>(null)
  const [dialog, setDialog] = useState<Dialog | null>(null)
  /** On at every start; the switch at the top turns it off to make the page read only. Every change still asks for a review. */
  const [writesEnabled, setWritesEnabled] = useState(true)
  const [pending, setPending] = useState<PendingRequest | null>(null)
  /** Edits made in the results table, waiting to be sent together: per unit id, then per property path. */
  const [edits, setEdits] = useState<Record<string, Record<string, SettingValue>>>({})

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

  /** What a request needs, in the order to do it: shown as the "before you send" checklist and used to jump to what is missing. */
  const requirements: Requirement[] = group
    ? [
        group.units.length === 0
          ? { id: 'unit', label: 'Unit', met: false, detail: 'Add a unit' }
          : targets.length === 0
            ? { id: 'unit', label: 'Unit', met: false, detail: 'Tick a unit' }
            : { id: 'unit', label: 'Unit', met: true, detail: targets.length <= 2 ? targets.map((u) => u.label || u.ip).join(', ') : `${targets.length} ticked` },
        { id: 'username', label: 'Username', met: login.username !== '', detail: login.username !== '' ? login.username : 'Enter the username' },
        { id: 'password', label: 'Password', met: password !== '', detail: password !== '' ? '' : 'Enter the password' },
      ]
    : []
  const ready = requirements.every((r) => r.met)

  /** Move the cursor to a field a request still needs, opening the folded units first if that is where it is. */
  const focusRequirement = (id: Requirement['id']) => {
    if (id === 'unit' && !panelOpen) setPanelOpen(true)
    // After the units have had a render to appear.
    window.requestAnimationFrame(() => {
      const el = id === 'unit' ? document.querySelector<HTMLElement>('[data-nvx-focus="unit"]') : document.getElementById(`nvx-${id}`)
      el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      el?.focus()
    })
  }
  // Only offered when what is blocking is a missing field, not the missing desktop app.
  const fixBlocked = runner.available && !ready ? () => focusRequirement((requirements.find((r) => !r.met) ?? requirements[0]).id) : undefined

  // Stacked layout (narrow window): bring the answer into view when a run starts. Side by side it is already pinned in view.
  const resultsRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (runner.running) resultsRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [runner.running])

  const runCalls = (calls: (Pick<NvxCall, 'title'> & DeviceRequest)[]) => {
    if (targets.length === 0) return
    setEdits({}) // a new run shows new values, so edits made on the old ones are dropped
    void runner.run(targets, login, calls)
  }

  /** Ask for confirmation before anything that changes a device is sent. */
  const review = (unit: NvxUnit, request: DeviceRequest, fromEdits = false) => {
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
      ...(fromEdits ? { fromEdits } : {}),
      lines: sent ? flatten(sent).map(({ path }) => changeLine(path, getAtPath(sent, path), shown(path))) : [],
    })
  }

  const editValue = (unit: NvxUnit, path: string, value: SettingValue | undefined) =>
    setEdits((prev) => {
      const next = value === undefined ? omit(prev[unit.id] ?? {}, path) : { ...prev[unit.id], [path]: value }
      return Object.keys(next).length > 0 ? { ...prev, [unit.id]: next } : omit(prev, unit.id)
    })
  const discardEdits = (unit: NvxUnit) => setEdits((prev) => omit(prev, unit.id))

  /** Every edit of a unit goes in one POST to /Device, after one review. */
  const sendEdits = (unit: NvxUnit) => {
    const body = buildChangesBody(edits[unit.id] ?? {})
    if (body) review(unit, { method: 'POST', path: '/Device', body: JSON.stringify(body) }, true)
  }

  const runCall = (call: NvxCall) => {
    const request = cleanRequest(call)
    if (call.method === 'GET') runCalls([{ title: call.title, ...request }])
    else if (missingFiles(request.form).length > 0) loadCall(call) // a saved call keeps a file's name, not the file: choose it again in the builder
    else if (targets[0]) review(targets[0], request)
  }

  const loadCall = (call: NvxCall) => {
    setLoadedId(call.id)
    setPickerTab('request')
    setDraft({
      method: call.method,
      path: call.path,
      headers: formatHeaderLines(call.headers),
      bodyMode: call.form ? 'form' : 'raw',
      body: call.body ?? '',
      form: formToRows(call.form),
    })
  }

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
          {/*
            Work on the left (steps 1 and 2), the answer pinned on the right (step 3). Sending is answered
            right beside the pointer, and the results never scroll out of sight while a long request is built.
            With three or more units the answers get more of the width.
          */}
          <div className={`grid items-start gap-5 ${runner.units.length > 2 ? 'xl:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]' : 'xl:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]'}`}>
            <div className="min-w-0 space-y-5">
              <UnitsPanel
                units={group.units}
                selectedIds={selectedIds}
                onToggleUnit={(unitId) => setSelected(selectedIds.has(unitId) ? [...selectedIds].filter((id) => id !== unitId) : [...selectedIds, unitId])}
                onSelectAll={(on) => setSelected(on ? group.units.map((u) => u.id) : [])}
                onAddUnit={() => setDialog({ kind: 'unit' })}
                onEditUnit={(u) => setDialog({ kind: 'unit', unit: u })}
                open={panelOpen}
                onToggle={() => setPanelOpen((open) => !open)}
                requirements={requirements}
                onFix={focusRequirement}
                login={
                  <LoginFields
                    username={group.username}
                    password={password}
                    onUsername={(name) => nvx.setUsername(group.id, name)}
                    onPassword={(value) => setPasswords((prev) => ({ ...prev, [group.id]: value }))}
                  />
                }
              />
              <CallPicker
                tab={pickerTab}
                onTab={setPickerTab}
                savedCount={group.calls.length}
                state={ready ? 'next' : 'idle'}
                saved={
                  <SavedCallsCard
                    embedded
                    calls={group.calls}
                    folders={group.folders}
                    readBlockedReason={readBlockedReason}
                    changeBlockedReason={changeBlockedReason}
                    onFixBlocked={fixBlocked}
                    running={runner.running}
                    unitCount={targets.length}
                    activeId={loadedId}
                    onLoad={loadCall}
                    onRun={runCall}
                    onRunMany={(calls) => runCalls(calls.map((c) => ({ title: c.title, ...cleanRequest(c) })))}
                    onEditCall={(call) => setDialog({ kind: 'call', call })}
                    onAddFolder={() => setDialog({ kind: 'folder' })}
                    onEditFolder={(folder) => setDialog({ kind: 'folder', folder })}
                  />
                }
                request={
                  <RequestBuilder
                    embedded
                    draft={draft}
                    onDraft={(next) => {
                      setLoadedId(null)
                      setDraft(next)
                    }}
                    readBlockedReason={readBlockedReason}
                    changeBlockedReason={changeBlockedReason}
                    onFixBlocked={fixBlocked}
                    running={runner.running}
                    onSend={(request) => runCalls([{ title: 'Request', ...request }])}
                    onReview={(request) => targets[0] && review(targets[0], request)}
                    onSave={(request) => setDialog({ kind: 'call', initial: request })}
                  />
                }
              />
              {runner.changes.length > 0 && <ChangesCard entries={runner.changes} onClear={runner.clearChanges} />}
            </div>
            <div ref={resultsRef} className="min-w-0 xl:sticky xl:top-5">
              <ResultsCard
                results={runner.results}
                units={runner.units}
                running={runner.running}
                onClear={() => {
                  setEdits({})
                  runner.clear()
                }}
                canChange={canChange}
                edits={edits}
                onEdit={editValue}
                onSendEdits={sendEdits}
                onDiscardEdits={discardEdits}
              />
            </div>
          </div>
        </>
      )}

      {pending && (
        <ConfirmChangeDialog
          key={`${pending.request.method} ${pending.request.path} ${pending.request.body ?? ''} ${pending.request.form?.length ?? 0}`}
          pending={pending}
          onSend={async () => {
            const entry = await runner.apply(pending.unit, login, pending.request)
            // Kept when the device refused, so they can be sent again.
            if (pending.fromEdits && entry.outcome !== 'failed') discardEdits(pending.unit)
            return entry
          }}
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
