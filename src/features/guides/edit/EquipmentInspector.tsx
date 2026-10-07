import { TrashIcon, XIcon } from '../components/icons'
import { parsePoint, pointName } from '../panel/scene'
import { UNIT_KINDS, getUnitKind, getUnitModel } from '../panel/units'
import type { DeviceDef } from '../panel/devices'
import { DELETE_BTN, GHOST_BTN, INPUT, INPUT_HEADING, SELECT } from '../../../shared/ui/styles'
import { UnitIcon } from './UnitPicker'
import type { PanelCable, PanelEndpoint } from '../types'

const uid = () => crypto.randomUUID()

type Common = {
  device: DeviceDef
  endpoints: PanelEndpoint[]
  cables: PanelCable[]
  onClose: () => void
}

const CARD =
  'pointer-events-auto border-line-strong bg-surface shadow-card max-h-full overflow-y-auto rounded-lg border p-3'

/** Side panel for the selected unit: type, model, name, details, its cables. */
export function UnitInspector({
  unit,
  onChange,
  onDelete,
  onRemoveCable,
  device,
  endpoints,
  cables,
  onClose,
}: Common & {
  unit: PanelEndpoint
  onChange: (fields: Partial<PanelEndpoint>) => void
  onDelete: () => void
  onRemoveCable: (id: string) => void
}) {
  const kind = getUnitKind(unit.kind)
  const model = getUnitModel(unit.kind, unit.model)
  const mine = cables.filter((c) => parsePoint(c.from)?.unitId === unit.id || parsePoint(c.to)?.unitId === unit.id)
  const addInfo = (key: string) => onChange({ info: [...unit.info, { id: uid(), key, value: '' }] })

  return (
    <div className={CARD}>
      <div className="flex items-center gap-2">
        <UnitIcon kind={unit.kind} />
        <select
          value={kind.id}
          // A new type starts on its default model; cables to ports it no longer has are cleaned up by the editor.
          onChange={(e) => onChange({ kind: e.target.value, model: undefined })}
          className={`${SELECT} min-w-0 flex-1`}
          aria-label="Unit type"
        >
          {UNIT_KINDS.filter((k) => !k.legacy || k.id === kind.id).map((k) => (
            <option key={k.id} value={k.id}>
              {k.label}
            </option>
          ))}
        </select>
        <button type="button" aria-label="Close" onClick={onClose} className={`${DELETE_BTN} p-1`}>
          <XIcon className="h-4 w-4" />
        </button>
      </div>

      {kind.models.length > 0 && (
        <label className="mt-2 flex items-center gap-2 text-xs">
          <span className="text-ink-muted w-12 shrink-0">Model</span>
          <select
            value={model?.id}
            onChange={(e) => onChange({ model: e.target.value })}
            className={`${SELECT} min-w-0 flex-1`}
            aria-label="Model"
          >
            {kind.models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {model && !model.verified && (
        <p className="mt-1 text-[11px] text-amber-300/90">
          Port list is a generic stand-in for this family, not yet checked against the unit.
        </p>
      )}

      <input
        value={unit.name}
        onChange={(e) => onChange({ name: e.target.value })}
        placeholder="Name…"
        className={`${INPUT_HEADING} mt-2`}
      />
      <input
        value={unit.detail}
        onChange={(e) => onChange({ detail: e.target.value })}
        placeholder="Room or location (optional)…"
        className={`${INPUT} mt-1.5`}
      />

      {!device.freestyle && (
        <div className="border-line mt-2 inline-flex overflow-hidden rounded-md border text-xs font-medium">
          {(['source', 'display'] as const).map((side) => (
            <button
              key={side}
              type="button"
              onClick={() => onChange({ side, pos: undefined })}
              className={`px-2.5 py-1 ${unit.side === side ? 'bg-brand-soft text-brand-strong' : 'text-ink-muted hover:bg-subtle'}`}
            >
              {side === 'source' ? 'Left side' : 'Right side'}
            </button>
          ))}
        </div>
      )}

      {unit.info.length > 0 && (
        <div className="mt-2 space-y-1.5">
          {unit.info.map((i) => (
            <div key={i.id} className="flex items-center gap-1.5">
              <div className="w-24 shrink-0">
                <input
                  value={i.key}
                  onChange={(e) => onChange({ info: unit.info.map((x) => (x.id === i.id ? { ...x, key: e.target.value } : x)) })}
                  placeholder="Label"
                  className={INPUT}
                />
              </div>
              <div className="min-w-0 flex-1">
                <input
                  value={i.value}
                  onChange={(e) => onChange({ info: unit.info.map((x) => (x.id === i.id ? { ...x, value: e.target.value } : x)) })}
                  placeholder="Value"
                  className={INPUT}
                />
              </div>
              <button
                type="button"
                aria-label="Delete detail"
                onClick={() => onChange({ info: unit.info.filter((x) => x.id !== i.id) })}
                className={`${DELETE_BTN} p-1`}
              >
                <XIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="mt-2 flex flex-wrap gap-1">
        {kind.suggest
          .filter((k) => !unit.info.some((i) => i.key === k))
          .map((k) => (
            <button key={k} type="button" onClick={() => addInfo(k)} className={GHOST_BTN}>
              + {k}
            </button>
          ))}
        <button type="button" onClick={() => addInfo('')} className={GHOST_BTN}>
          + Other
        </button>
      </div>

      <p className="text-ink-muted mt-3 text-[11px] font-semibold tracking-wide uppercase">Cables</p>
      {mine.length === 0 ? (
        <p className="text-ink-faint mt-1 text-xs">None. Drag from a port onto another port or unit.</p>
      ) : (
        <ul className="mt-1 space-y-1">
          {mine.map((c) => (
            <li key={c.id} className="flex items-center gap-1.5 text-xs">
              <span className="text-ink-muted min-w-0 flex-1 truncate">
                {pointName(c.from, device, endpoints)} → {pointName(c.to, device, endpoints)}
              </span>
              <button type="button" onClick={() => onRemoveCable(c.id)} className={GHOST_BTN}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <button type="button" onClick={onDelete} className="mt-3 text-xs font-medium text-rose-300 underline underline-offset-2">
        Delete this unit
      </button>
    </div>
  )
}

/** Side panel for a selected cable: label and remove. */
export function CableInspector({
  cable,
  device,
  endpoints,
  onLabel,
  onRemove,
  onClose,
  removeLabel = 'Remove cable',
}: Omit<Common, 'cables'> & {
  cable: PanelCable
  onLabel: (label: string) => void
  onRemove: () => void
  removeLabel?: string
}) {
  return (
    <div className={CARD}>
      <div className="flex items-start gap-2">
        <p className="text-ink min-w-0 flex-1 text-sm font-semibold">
          {pointName(cable.from, device, endpoints)}
          <span className="text-ink-faint mx-1.5 font-normal">→</span>
          {pointName(cable.to, device, endpoints)}
        </p>
        <button type="button" aria-label="Close" onClick={onClose} className={`${DELETE_BTN} p-1`}>
          <XIcon className="h-4 w-4" />
        </button>
      </div>
      <input
        value={cable.label}
        onChange={(e) => onLabel(e.target.value)}
        placeholder="Cable label (optional)…"
        className={`${INPUT} mt-2`}
      />
      <button type="button" onClick={onRemove} className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-medium text-rose-300">
        <TrashIcon className="h-3.5 w-3.5" />
        {removeLabel}
      </button>
    </div>
  )
}
