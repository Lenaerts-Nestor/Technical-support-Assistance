import { useState } from 'react'
import { Modal } from '../../../shared/ui/Modal'
import { DANGER_BTN, GHOST_BTN_MD, INPUT_LG, PRIMARY_BTN, SELECT, TEXTAREA } from '../../../shared/ui/styles'
import { NAME_MAX_LENGTH, cleanRequest, formatHeaderLines, normalizeIp, normalizePath, parseHeaderLines } from '../nvxData'
import { HTTP_METHODS } from '../types'
import type { DeviceRequest, HttpMethod, NvxCall, NvxFolder, NvxGroup, NvxUnit } from '../types'

/** Delete asks twice: the first press turns the button into the confirmation. */
function DeleteButton({ what, onDelete }: { what: string; onDelete: () => void }) {
  const [sure, setSure] = useState(false)
  return (
    <button type="button" className={`${DANGER_BTN} mr-auto`} onClick={() => (sure ? onDelete() : setSure(true))}>
      {sure ? `Really delete ${what}?` : 'Delete'}
    </button>
  )
}

type FieldProps = {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  mono?: boolean
  autoFocus?: boolean
  error?: string | null
}

function Field({ label, value, onChange, placeholder, mono, autoFocus, error }: FieldProps) {
  return (
    <label className="block">
      <span className="text-ink-muted mb-1 block text-xs font-medium">{label}</span>
      <input
        className={`${INPUT_LG} ${mono ? 'font-mono' : ''}`}
        value={value}
        placeholder={placeholder}
        autoFocus={autoFocus}
        spellCheck={false}
        autoComplete="off"
        onChange={(e) => onChange(e.target.value)}
      />
      {error && <span className="mt-1 block text-xs text-rose-300">{error}</span>}
    </label>
  )
}

type DialogFrameProps = {
  title: string
  formId: string
  canSave: boolean
  saveLabel?: string
  onSubmit: () => void
  onClose: () => void
  onDelete?: { what: string; run: () => void }
  wide?: boolean
  children: React.ReactNode
}

function DialogFrame({ title, formId, canSave, saveLabel = 'Save', onSubmit, onClose, onDelete, children }: DialogFrameProps) {
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          {onDelete && <DeleteButton what={onDelete.what} onDelete={onDelete.run} />}
          <button type="button" className={GHOST_BTN_MD} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form={formId} className={PRIMARY_BTN} disabled={!canSave}>
            {saveLabel}
          </button>
        </>
      }
    >
      <form
        id={formId}
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault()
          if (canSave) onSubmit()
        }}
      >
        {children}
      </form>
    </Modal>
  )
}

type GroupDialogProps = {
  /** The group being renamed; `undefined` adds a new one. */
  group?: NvxGroup
  onSave: (name: string) => void
  onDelete?: () => void
  onClose: () => void
}

export function GroupDialog({ group, onSave, onDelete, onClose }: GroupDialogProps) {
  const [name, setName] = useState(group?.name ?? '')
  return (
    <DialogFrame
      title={group ? 'Rename group' : 'New group'}
      formId="nvx-group"
      canSave={name.trim().length > 0}
      onSubmit={() => onSave(name)}
      onClose={onClose}
      onDelete={onDelete && { what: 'the group', run: onDelete }}
    >
      <Field label="Name" value={name} onChange={(v) => setName(v.slice(0, NAME_MAX_LENGTH))} placeholder="NAX API" autoFocus />
      {!group && <p className="text-ink-muted text-xs">A new group starts with the same starter calls and an empty list of units.</p>}
    </DialogFrame>
  )
}

type FolderDialogProps = {
  /** The folder being renamed; `undefined` adds a new one. */
  folder?: NvxFolder
  onSave: (name: string) => void
  onDelete?: () => void
  onClose: () => void
}

export function FolderDialog({ folder, onSave, onDelete, onClose }: FolderDialogProps) {
  const [name, setName] = useState(folder?.name ?? '')
  return (
    <DialogFrame
      title={folder ? 'Rename folder' : 'New folder'}
      formId="nvx-folder"
      canSave={name.trim().length > 0}
      onSubmit={() => onSave(name)}
      onClose={onClose}
      onDelete={onDelete && { what: 'the folder', run: onDelete }}
    >
      <Field label="Name" value={name} onChange={(v) => setName(v.slice(0, NAME_MAX_LENGTH))} placeholder="Network" autoFocus />
      {folder && <p className="text-ink-muted text-xs">Deleting a folder keeps its calls: they move to the top of the list.</p>}
    </DialogFrame>
  )
}

type UnitDialogProps = {
  unit?: NvxUnit
  onSave: (unit: { label: string; ip: string }) => void
  onDelete?: () => void
  onClose: () => void
}

export function UnitDialog({ unit, onSave, onDelete, onClose }: UnitDialogProps) {
  const [label, setLabel] = useState(unit?.label ?? '')
  const [ip, setIp] = useState(unit?.ip ?? '')
  const clean = normalizeIp(ip)
  return (
    <DialogFrame
      title={unit ? 'Edit unit' : 'Add unit'}
      formId="nvx-unit"
      canSave={clean !== null}
      onSubmit={() => clean && onSave({ label: label.trim(), ip: clean })}
      onClose={onClose}
      onDelete={onDelete && { what: 'this unit', run: onDelete }}
    >
      <Field label="Name (optional)" value={label} onChange={(v) => setLabel(v.slice(0, NAME_MAX_LENGTH))} placeholder="Lab encoder" autoFocus />
      <Field
        label="IP address"
        value={ip}
        onChange={setIp}
        placeholder="10.0.0.5"
        mono
        error={ip.trim() && !clean ? 'Enter four numbers from 0 to 255, like 10.0.0.5.' : null}
      />
    </DialogFrame>
  )
}

type CallDialogProps = {
  /** The call being edited; `undefined` saves a new one. */
  call?: NvxCall
  /** The request to start from for a new call. */
  initial?: DeviceRequest
  folders: NvxFolder[]
  onSave: (call: { title: string; folderId?: string } & DeviceRequest) => void
  onDelete?: () => void
  onClose: () => void
}

export function CallDialog({ call, initial, folders, onSave, onDelete, onClose }: CallDialogProps) {
  const start = call ?? initial
  const [title, setTitle] = useState(call?.title ?? '')
  const [folderId, setFolderId] = useState(call?.folderId ?? '')
  const [method, setMethod] = useState<HttpMethod>(start?.method ?? 'GET')
  const [path, setPath] = useState(start?.path ?? '')
  const [headers, setHeaders] = useState(formatHeaderLines(start?.headers))
  const [body, setBody] = useState(start?.body ?? '')
  const clean = normalizePath(path)
  const parsed = parseHeaderLines(headers)
  const canSave = clean !== null && title.trim().length > 0 && parsed.error === null

  return (
    <DialogFrame
      title={call ? 'Edit call' : 'Save call'}
      formId="nvx-call"
      canSave={canSave}
      onSubmit={() => clean && onSave({ title: title.trim(), ...(folderId ? { folderId } : {}), ...cleanRequest({ method, path: clean, headers: parsed.headers, body }) })}
      onClose={onClose}
      onDelete={onDelete && { what: 'this call', run: onDelete }}
    >
      <Field label="Title" value={title} onChange={(v) => setTitle(v.slice(0, NAME_MAX_LENGTH))} placeholder="Firmware version" autoFocus />
      {folders.length > 0 && (
        <label className="block">
          <span className="text-ink-muted mb-1 block text-xs font-medium">Folder</span>
          <select className={`${SELECT} w-full py-2 text-sm`} value={folderId} onChange={(e) => setFolderId(e.target.value)}>
            <option value="">No folder</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="flex gap-2">
        <label className="block">
          <span className="text-ink-muted mb-1 block text-xs font-medium">Method</span>
          <select className={`${SELECT} py-2.5 font-mono text-sm font-bold`} value={method} onChange={(e) => setMethod(e.target.value as HttpMethod)}>
            {HTTP_METHODS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
        <div className="flex-1">
          <Field
            label="Path"
            value={path}
            onChange={setPath}
            placeholder="/Device/DeviceInfo"
            mono
            error={path.trim() && !clean ? 'It must start with / and have no spaces.' : null}
          />
        </div>
      </div>
      <label className="block">
        <span className="text-ink-muted mb-1 block text-xs font-medium">Headers (one per line, Name: value)</span>
        <textarea className={`${TEXTAREA} font-mono text-sm`} rows={2} value={headers} spellCheck={false} onChange={(e) => setHeaders(e.target.value)} />
        {parsed.error && <span className="mt-1 block text-xs text-rose-300">{parsed.error}</span>}
      </label>
      {method !== 'GET' && (
        <label className="block">
          <span className="text-ink-muted mb-1 block text-xs font-medium">Body</span>
          <textarea className={`${TEXTAREA} font-mono text-sm`} rows={5} value={body} spellCheck={false} onChange={(e) => setBody(e.target.value)} />
        </label>
      )}
    </DialogFrame>
  )
}
