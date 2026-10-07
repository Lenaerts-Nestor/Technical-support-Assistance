import { useMemo, useState } from 'react'
import { PlusIcon, TrashIcon } from '../components/icons'
import { DevicePanel } from '../panel/DevicePanel'
import { TEMPLATES, cardIdFor, cardsFor, getDevice, getTemplate, type DeviceDef } from '../panel/devices'
import {
  DELETE_BTN,
  GHOST_BTN,
  INPUT,
  INPUT_HEADING,
  SECTION_LABEL,
  SELECT,
  TEXTAREA,
} from '../../../shared/ui/styles'
import { BlockFrame } from './BlockFrame'
import type { BlockEditProps } from './blockEditProps'
import type { PanelPart } from '../types'

/** Port `<option>`s grouped by the slot or zone they belong to. */
function PortOptions({ device }: { device: DeviceDef }) {
  const groups = new Map<string, DeviceDef['ports']>()
  for (const p of device.ports) groups.set(p.group, [...(groups.get(p.group) ?? []), p])
  return (
    <>
      {[...groups].map(([group, ports]) => (
        <optgroup key={group} label={group}>
          {ports.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </optgroup>
      ))}
    </>
  )
}

/** Drop notes and checks that point at ports the layout no longer has. */
function pruneTo(p: PanelPart, device: DeviceDef | undefined): PanelPart {
  const has = (id: string) => !!device?.ports.some((x) => x.id === id)
  return {
    ...p,
    annotations: p.annotations.filter((a) => has(a.portId)),
    scenarios: p.scenarios.map((s) => ({
      ...s,
      portIds: s.portIds.filter(has),
      links: s.links.filter((l) => has(l.from) && has(l.to)),
    })),
  }
}

const uid = () => crypto.randomUUID()

/** What a click on the diagram does right now. */
type Target = { kind: 'annotation' | 'scenario'; id: string } | null

export function PanelEdit({
  part,
  addr,
  index,
  count,
  nested,
  onMove,
  onRemove,
  d,
}: BlockEditProps<PanelPart>) {
  const device = useMemo(() => getDevice(part.deviceId, part.cards), [part.deviceId, part.cards])
  const template = getTemplate(part.deviceId)
  const [target, setTarget] = useState<Target>(null)
  const [selected, setSelected] = useState<string | null>(null)

  const set = (fn: (p: PanelPart) => PanelPart) => d.patchPanel(addr, fn)

  const changeDevice = (deviceId: string) => {
    setTarget(null)
    setSelected(null)
    set((p) => pruneTo({ ...p, deviceId, cards: {} }, getDevice(deviceId)))
  }

  const changeCard = (slotId: string, cardId: string) => {
    setTarget(null)
    setSelected(null)
    set((p) => {
      const cards = { ...p.cards, [slotId]: cardId }
      return pruneTo({ ...p, cards }, getDevice(p.deviceId, cards))
    })
  }

  const annotated = useMemo(() => new Set(part.annotations.map((a) => a.portId)), [part.annotations])
  const activeScenario =
    target?.kind === 'scenario' ? part.scenarios.find((s) => s.id === target.id) : undefined
  const highlighted = useMemo(() => new Set(activeScenario?.portIds ?? []), [activeScenario])

  const onPortClick = (portId: string) => {
    if (target?.kind === 'annotation') {
      set((p) => ({
        ...p,
        annotations: p.annotations.map((a) => (a.id === target.id ? { ...a, portId } : a)),
      }))
    } else if (target?.kind === 'scenario') {
      set((p) => ({
        ...p,
        scenarios: p.scenarios.map((s) =>
          s.id === target.id
            ? {
                ...s,
                portIds: s.portIds.includes(portId)
                  ? s.portIds.filter((x) => x !== portId)
                  : [...s.portIds, portId],
              }
            : s,
        ),
      }))
    }
    setSelected(portId)
  }

  const portOptions = device ? <PortOptions device={device} /> : null

  const pickBtn = (kind: 'annotation' | 'scenario', id: string) => {
    const on = target?.kind === kind && target.id === id
    return (
      <button
        type="button"
        onClick={() => setTarget(on ? null : { kind, id })}
        className={`${GHOST_BTN} ${on ? 'border-fuchsia-400/60 text-fuchsia-200' : ''}`}
      >
        {on ? 'Done picking' : 'Pick on diagram'}
      </button>
    )
  }

  return (
    <BlockFrame
      kind="panel"
      chip="Panel"
      index={index}
      count={count}
      nested={nested}
      onMove={onMove}
      onRemove={onRemove}
    >
      <div className="flex flex-wrap gap-2">
        <input
          value={part.title}
          onChange={(e) => set((p) => ({ ...p, title: e.target.value }))}
          placeholder="Panel title (optional)…"
          className={`${INPUT_HEADING} min-w-48 flex-1`}
        />
        <select value={part.deviceId} onChange={(e) => changeDevice(e.target.value)} className={SELECT}>
          {!device && <option value={part.deviceId}>Unknown ({part.deviceId})</option>}
          {TEMPLATES.map((dev) => (
            <option key={dev.id} value={dev.id}>
              {dev.name}
            </option>
          ))}
        </select>
      </div>

      {device && (
        <>
          <div className="mt-3">
            <DevicePanel
              device={device}
              annotated={annotated}
              highlighted={highlighted}
              links={activeScenario?.links}
              selected={selected}
              onPortClick={onPortClick}
            />
            <p className="text-ink-faint mt-1 text-[11px]">
              {target
                ? 'Click ports on the diagram to apply them to the row you are editing.'
                : 'Choose “Pick on diagram” on a note or check below, then click ports.'}
            </p>
          </div>

          {template && template.slots.length > 0 && (
            <details className="border-line bg-surface mt-4 rounded-lg border">
              <summary className="text-ink-muted px-3 py-2 text-xs font-medium">
                Cards installed in each slot (defaults match the reference photo)
              </summary>
              <div className="grid grid-cols-1 gap-x-4 gap-y-1.5 px-3 pb-3 sm:grid-cols-2">
                {template.slots.map((slot) => (
                  <label key={slot.id} className="flex items-center gap-2 text-xs">
                    <span className="text-ink-muted w-24 shrink-0">{slot.label}</span>
                    <select
                      value={cardIdFor(slot, part.cards)}
                      onChange={(ev) => changeCard(slot.id, ev.target.value)}
                      className={`${SELECT} min-w-0 flex-1`}
                    >
                      {cardsFor(slot.family).map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            </details>
          )}

          {/* ---- notes ------------------------------------------------ */}
          <div className="mt-4">
            <p className={`mb-1.5 ${SECTION_LABEL}`}>Port notes</p>
            <div className="space-y-2">
              {part.annotations.map((a) => (
                <div key={a.id} className="border-line bg-surface space-y-2 rounded-lg border p-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={a.portId}
                      onChange={(e) =>
                        set((p) => ({
                          ...p,
                          annotations: p.annotations.map((x) =>
                            x.id === a.id ? { ...x, portId: e.target.value } : x,
                          ),
                        }))
                      }
                      className={SELECT}
                    >
                      {portOptions}
                    </select>
                    <input
                      value={a.label}
                      onChange={(e) =>
                        set((p) => ({
                          ...p,
                          annotations: p.annotations.map((x) =>
                            x.id === a.id ? { ...x, label: e.target.value } : x,
                          ),
                        }))
                      }
                      placeholder="Short label (e.g. Boardroom display)…"
                      className={`${INPUT} min-w-40 flex-1`}
                    />
                    {pickBtn('annotation', a.id)}
                    <button
                      type="button"
                      aria-label="Delete note"
                      onClick={() => set((p) => ({ ...p, annotations: p.annotations.filter((x) => x.id !== a.id) }))}
                      className={`${DELETE_BTN} p-1`}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                  <textarea
                    value={a.note}
                    onChange={(e) =>
                      set((p) => ({
                        ...p,
                        annotations: p.annotations.map((x) =>
                          x.id === a.id ? { ...x, note: e.target.value } : x,
                        ),
                      }))
                    }
                    placeholder="What to know about this port: cable type, what's plugged in, common problems…"
                    rows={2}
                    className={TEXTAREA}
                  />
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() =>
                set((p) => ({
                  ...p,
                  annotations: [
                    ...p.annotations,
                    { id: uid(), portId: selected ?? device.ports[0].id, label: '', note: '' },
                  ],
                }))
              }
              className={`${GHOST_BTN} mt-2`}
            >
              <PlusIcon className="h-3.5 w-3.5" />
              Add port note
            </button>
          </div>

          {/* ---- troubleshooting checks ------------------------------- */}
          <div className="mt-4">
            <p className={`mb-1.5 ${SECTION_LABEL}`}>Troubleshooting checks</p>
            <div className="space-y-2">
              {part.scenarios.map((s) => {
                const patchScenario = (fn: (s: typeof part.scenarios[number]) => typeof part.scenarios[number]) =>
                  set((p) => ({ ...p, scenarios: p.scenarios.map((x) => (x.id === s.id ? fn(x) : x)) }))
                const active = target?.kind === 'scenario' && target.id === s.id
                return (
                  <div
                    key={s.id}
                    className={`bg-surface space-y-2 rounded-lg border p-2.5 ${active ? 'border-fuchsia-400/60' : 'border-line'}`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        value={s.title}
                        onChange={(e) => patchScenario((x) => ({ ...x, title: e.target.value }))}
                        placeholder="Question, e.g. No picture on one output?"
                        className={`${INPUT_HEADING} flex-1`}
                      />
                      {pickBtn('scenario', s.id)}
                      <button
                        type="button"
                        aria-label="Delete check"
                        onClick={() => {
                          if (active) setTarget(null)
                          set((p) => ({ ...p, scenarios: p.scenarios.filter((x) => x.id !== s.id) }))
                        }}
                        className={`${DELETE_BTN} p-1`}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                    <textarea
                      value={s.text}
                      onChange={(e) => patchScenario((x) => ({ ...x, text: e.target.value }))}
                      placeholder="What to test, e.g. “Move the cable from output 5 to output 6. If the picture follows the cable, the display or cable is at fault.”"
                      rows={2}
                      className={TEXTAREA}
                    />
                    <p className="text-ink-muted text-xs">
                      Highlighted:{' '}
                      {s.portIds.length === 0
                        ? 'none yet'
                        : s.portIds.map((id) => device.ports.find((p) => p.id === id)?.label ?? id).join(', ')}
                    </p>
                    {s.links.map((l) => (
                      <div key={l.id} className="flex items-center gap-2">
                        <select
                          value={l.from}
                          onChange={(e) =>
                            patchScenario((x) => ({
                              ...x,
                              links: x.links.map((y) => (y.id === l.id ? { ...y, from: e.target.value } : y)),
                            }))
                          }
                          className={SELECT}
                        >
                          {portOptions}
                        </select>
                        <span className="text-ink-faint text-xs">→</span>
                        <select
                          value={l.to}
                          onChange={(e) =>
                            patchScenario((x) => ({
                              ...x,
                              links: x.links.map((y) => (y.id === l.id ? { ...y, to: e.target.value } : y)),
                            }))
                          }
                          className={SELECT}
                        >
                          {portOptions}
                        </select>
                        <button
                          type="button"
                          aria-label="Delete line"
                          onClick={() => patchScenario((x) => ({ ...x, links: x.links.filter((y) => y.id !== l.id) }))}
                          className={`${DELETE_BTN} p-1`}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        patchScenario((x) => ({
                          ...x,
                          links: [
                            ...x.links,
                            {
                              id: uid(),
                              from: device.ports[0].id,
                              to: device.ports[Math.min(1, device.ports.length - 1)].id,
                            },
                          ],
                        }))
                      }
                      className={GHOST_BTN}
                    >
                      <PlusIcon className="h-3.5 w-3.5" />
                      Add line between ports
                    </button>
                  </div>
                )
              })}
            </div>
            <button
              type="button"
              onClick={() => {
                const id = uid()
                set((p) => ({
                  ...p,
                  scenarios: [...p.scenarios, { id, title: '', text: '', portIds: [], links: [] }],
                }))
                setTarget({ kind: 'scenario', id })
              }}
              className={`${GHOST_BTN} mt-2`}
            >
              <PlusIcon className="h-3.5 w-3.5" />
              Add troubleshooting check
            </button>
          </div>
        </>
      )}
    </BlockFrame>
  )
}
