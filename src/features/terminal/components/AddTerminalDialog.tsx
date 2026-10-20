import { useState } from 'react'
import { Modal } from '../../../shared/ui/Modal'
import { GHOST_BTN_MD, INPUT_LG, PRIMARY_BTN, SELECT } from '../../../shared/ui/styles'
import { NAME_MAX_LENGTH, normalizeIp } from '../../nvx/nvxData'
import type { NvxGroup } from '../../nvx/types'

export type NewTerminal = {
  label: string
  ip: string
  /** A login for this terminal only, when the one on the page is not the right one. */
  login?: { username: string; password: string }
  /** Also save the unit into this group. */
  saveToGroupId?: string
}

type AddTerminalDialogProps = {
  groups: NvxGroup[]
  /** The username on the page, as the starting point for a different login. */
  username: string
  onAdd: (terminal: NewTerminal) => void
  onClose: () => void
}

/** Type an IP address by hand and open a terminal for it, instead of picking a saved unit. */
export function AddTerminalDialog({ groups, username, onAdd, onClose }: AddTerminalDialogProps) {
  const [label, setLabel] = useState('')
  const [ip, setIp] = useState('')
  const [save, setSave] = useState(false)
  const [groupId, setGroupId] = useState(groups[0]?.id ?? '')
  const [other, setOther] = useState(false)
  const [user, setUser] = useState(username)
  const [pass, setPass] = useState('')
  const clean = normalizeIp(ip)
  const canAdd = clean !== null && (!other || (user.trim() !== '' && pass !== ''))

  return (
    <Modal
      title="Add terminal"
      onClose={onClose}
      footer={
        <>
          <button type="button" className={GHOST_BTN_MD} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="add-terminal" className={PRIMARY_BTN} disabled={!canAdd}>
            Connect
          </button>
        </>
      }
    >
      <form
        id="add-terminal"
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault()
          if (!clean || !canAdd) return
          onAdd({
            label: label.trim(),
            ip: clean,
            ...(other ? { login: { username: user.trim(), password: pass } } : {}),
            ...(save && groupId ? { saveToGroupId: groupId } : {}),
          })
        }}
      >
        <label className="block">
          <span className="text-ink-muted mb-1 block text-xs font-medium">IP address</span>
          <input className={`${INPUT_LG} font-mono`} value={ip} placeholder="172.16.4.189" autoFocus spellCheck={false} autoComplete="off" onChange={(e) => setIp(e.target.value)} />
          {ip.trim() && !clean && <span className="mt-1 block text-xs text-rose-300">Enter four numbers from 0 to 255, like 172.16.4.189.</span>}
        </label>
        <label className="block">
          <span className="text-ink-muted mb-1 block text-xs font-medium">Name (optional)</span>
          <input className={INPUT_LG} value={label} placeholder="Lab NAX" spellCheck={false} autoComplete="off" onChange={(e) => setLabel(e.target.value.slice(0, NAME_MAX_LENGTH))} />
        </label>
        {groups.length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-ink flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" className="accent-brand h-4 w-4" checked={save} onChange={(e) => setSave(e.target.checked)} />
              Also save this unit to
            </label>
            <select className={`${SELECT} py-1.5 text-sm`} value={groupId} disabled={!save} aria-label="Group to save the unit in" onChange={(e) => setGroupId(e.target.value)}>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <label className="text-ink flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" className="accent-brand h-4 w-4" checked={other} onChange={(e) => setOther(e.target.checked)} />
          Use a different login for this terminal
        </label>
        {other && (
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-ink-muted mb-1 block text-xs font-medium">Username</span>
              <input className={INPUT_LG} value={user} spellCheck={false} autoComplete="off" onChange={(e) => setUser(e.target.value)} />
            </label>
            <label className="block">
              <span className="text-ink-muted mb-1 block text-xs font-medium">Password</span>
              <input className={INPUT_LG} type="password" value={pass} autoComplete="off" onChange={(e) => setPass(e.target.value)} />
            </label>
          </div>
        )}
        <p className="text-ink-muted text-xs">Connects over SSH (port 22). The first time a unit is seen, its SSH key is remembered.</p>
      </form>
    </Modal>
  )
}
