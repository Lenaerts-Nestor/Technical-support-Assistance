import { useState } from 'react'
import { PlusIcon, XIcon } from '../components/icons'
import { cableColor, isHubLink, parsePoint, pointName } from '../panel/scene'
import { getUnitKind, getUnitModel, unitPortSpecs } from '../panel/units'
import type { DeviceDef } from '../panel/devices'
import { DELETE_BTN, GHOST_BTN } from '../../../shared/ui/styles'
import { GroupLabel } from './fields'
import { UnitIcon, UnitPicker } from './UnitPicker'
import type { PanelCable, PanelEndpoint } from '../types'

type Props = {
  device: DeviceDef
  endpoints: PanelEndpoint[]
  cables: PanelCable[]
  selectedUnitId?: string
  selectedCableId: string | null
  onSelectUnit: (id: string) => void
  onSelectCable: (id: string) => void
  onRemoveCable: (id: string) => void
  onAddUnit: (kindId: string) => void
}

/**
 * Units and cables as two lists under the diagram. On a big diagram the list is
 * the quick way to find a box or a cable: click one and the diagram pans to it
 * and opens its details.
 */
export function PanelUnitsTab({
  device,
  endpoints,
  cables,
  selectedUnitId,
  selectedCableId,
  onSelectUnit,
  onSelectCable,
  onRemoveCable,
  onAddUnit,
}: Props) {
  const [adding, setAdding] = useState(false)
  const cablesOf = (unitId: string) =>
    cables.filter((c) => parsePoint(c.from)?.unitId === unitId || parsePoint(c.to)?.unitId === unitId).length

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section>
        <div className="mb-2 flex items-center gap-2">
          <GroupLabel>Units ({endpoints.length})</GroupLabel>
          <span className="flex-1" />
          <button type="button" onClick={() => setAdding((a) => !a)} aria-expanded={adding} className={GHOST_BTN}>
            <PlusIcon className="h-3.5 w-3.5" />
            Add unit
          </button>
        </div>
        {adding && (
          <div className="border-line bg-canvas mb-2 rounded-lg border p-2.5">
            <UnitPicker
              onPick={(kind) => {
                onAddUnit(kind)
                setAdding(false)
              }}
            />
          </div>
        )}
        {endpoints.length === 0 ? (
          <p className="text-ink-faint text-sm">
            No units yet. Add one here, with “Add unit” on the diagram, or click a port or “+” to add something already
            cabled to it.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {endpoints.map((e) => {
              const kind = getUnitKind(e.kind)
              const model = getUnitModel(e.kind, e.model)
              const n = cablesOf(e.id)
              const active = e.id === selectedUnitId
              return (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => onSelectUnit(e.id)}
                    aria-pressed={active}
                    className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${
                      active
                        ? 'border-fuchsia-400/60 bg-fuchsia-400/10'
                        : 'border-line bg-surface hover:border-line-strong hover:bg-subtle'
                    }`}
                  >
                    <UnitIcon kind={e.kind} className="h-6 w-6 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="text-ink block truncate text-sm font-semibold">
                        {e.name || <span className="text-ink-faint font-normal">Unnamed {kind.label.toLowerCase()}</span>}
                      </span>
                      <span className="text-ink-muted block truncate text-xs">
                        {kind.label}
                        {model && kind.models.length > 0 ? ` · ${model.name}` : ''}
                        {e.detail ? ` · ${e.detail}` : ''}
                      </span>
                    </span>
                    <span className="text-ink-faint shrink-0 text-xs">
                      {unitPortSpecs(e.kind, e.model).length > 0 ? `${n} cable${n === 1 ? '' : 's'}` : ''}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section>
        <GroupLabel className="mb-2">Cables ({cables.length})</GroupLabel>
        {cables.length === 0 ? (
          <p className="text-ink-faint text-sm">
            No cables yet. Drag from a port onto another port or unit on the diagram. A unit joined to a switch links to
            the switch itself — no port to pick.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {cables.map((c, i) => {
              const active = c.id === selectedCableId
              const viaSwitch = isHubLink(c, endpoints)
              return (
                <li
                  key={c.id}
                  className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 transition-colors ${
                    active ? 'border-fuchsia-400/60 bg-fuchsia-400/10' : 'border-line bg-surface hover:border-line-strong'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelectCable(c.id)}
                    aria-pressed={active}
                    className="flex min-w-0 flex-1 items-center gap-2.5 px-1 text-left"
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: viaSwitch ? '#a78bfa' : cableColor(i) }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="text-ink block truncate text-xs font-medium">
                        {pointName(c.from, device, endpoints)}
                        <span className="text-ink-faint mx-1.5">→</span>
                        {pointName(c.to, device, endpoints)}
                      </span>
                      {(c.label || viaSwitch) && (
                        <span className="text-ink-faint block truncate text-[11px]">
                          {[viaSwitch && 'path through a switch', c.label].filter(Boolean).join(' · ')}
                        </span>
                      )}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemoveCable(c.id)}
                    aria-label="Remove cable"
                    title="Remove cable"
                    className={`${DELETE_BTN} p-1`}
                  >
                    <XIcon className="h-4 w-4" />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
