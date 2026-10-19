import { useState } from 'react'
import { Modal } from '../../../shared/ui/Modal'
import { DANGER_BTN, GHOST_BTN_MD, INPUT_LG, PRIMARY_BTN } from '../../../shared/ui/styles'
import { NAME_MAX_LENGTH, normalizeIp, normalizePath, normalizeStreamUrl } from '../nvxData'
import type { NvxCall, NvxGroup, NvxUnit } from '../types'

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

type UnitDialogProps = {
  unit?: NvxUnit
  onSave: (unit: { label: string; ip: string; streamUrl?: string }) => void
  onDelete?: () => void
  onClose: () => void
}

export function UnitDialog({ unit, onSave, onDelete, onClose }: UnitDialogProps) {
  const [label, setLabel] = useState(unit?.label ?? '')
  const [ip, setIp] = useState(unit?.ip ?? '')
  const [stream, setStream] = useState(unit?.streamUrl ?? '')
  const clean = normalizeIp(ip)
  const cleanStream = normalizeStreamUrl(stream)
  return (
    <DialogFrame
      title={unit ? 'Edit unit' : 'Add unit'}
      formId="nvx-unit"
      canSave={clean !== null && cleanStream !== null}
      onSubmit={() => clean && cleanStream !== null && onSave({ label: label.trim(), ip: clean, ...(cleanStream ? { streamUrl: cleanStream } : {}) })}
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
      <Field
        label="Stream address (optional)"
        value={stream}
        onChange={setStream}
        placeholder="rtsp://10.0.0.5/…"
        mono
        error={cleanStream === null ? 'Use rtsp://, then the unit’s IP address and path. Leave out any user name and password.' : null}
      />
      <p className="text-ink-muted text-xs">Opens in VLC from a button on the unit. VLC asks for the password itself; it is never saved here.</p>
    </DialogFrame>
  )
}

type CallDialogProps = {
  /** The call being edited; `undefined` saves a new one. */
  call?: NvxCall
  /** The path to start from for a new call. */
  initialPath?: string
  onSave: (call: { title: string; path: string }) => void
  onDelete?: () => void
  onClose: () => void
}

export function CallDialog({ call, initialPath = '', onSave, onDelete, onClose }: CallDialogProps) {
  const [title, setTitle] = useState(call?.title ?? '')
  const [path, setPath] = useState(call?.path ?? initialPath)
  const clean = normalizePath(path)
  return (
    <DialogFrame
      title={call ? 'Edit call' : 'Save call'}
      formId="nvx-call"
      canSave={clean !== null && title.trim().length > 0}
      onSubmit={() => clean && onSave({ title: title.trim(), path: clean })}
      onClose={onClose}
      onDelete={onDelete && { what: 'this call', run: onDelete }}
    >
      <Field label="Title" value={title} onChange={(v) => setTitle(v.slice(0, NAME_MAX_LENGTH))} placeholder="Firmware version" autoFocus />
      <Field
        label="Path (GET)"
        value={path}
        onChange={setPath}
        placeholder="/Device/DeviceInfo"
        mono
        error={path.trim() && !clean ? 'It must start with / and have no spaces.' : null}
      />
    </DialogFrame>
  )
}
