import { useMemo, useState } from 'react'
import { PlusIcon, TrashIcon } from '../components/icons'
import { PanelCanvas } from '../panel/PanelCanvas'
import { stateAfter, stepMoves } from '../panel/flow'
import { epPointId, isEpPoint, pointName } from '../panel/scene'
import {
  TEMPLATES,
  cardIdFor,
  cardsFor,
  getDevice,
  getTemplate,
  type DeviceDef,
} from '../panel/devices'
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
import type { PanelEndpoint, PanelPart, PanelScenario, PanelStep } from '../types'

const uid = () => crypto.randomUUID()

type Tab = 'layout' | 'equipment' | 'notes' | 'trouble'
const TABS: { id: Tab; label: string }[] = [
  { id: 'layout', label: 'Cards' },
  { id: 'equipment', label: 'Equipment & cables' },
  { id: 'notes', label: 'Port notes' },
  { id: 'trouble', label: 'Troubleshooting' },
]

/** Suggested detail lines for a piece of equipment, one click each. */
const INFO_SUGGESTIONS = ['Resolution', 'IP mode', 'IP address', 'Cable', 'Signal']

/** Port `<option>`s grouped by the slot or zone they belong to. */
function PortOptions({ device, endpoints }: { device: DeviceDef; endpoints: PanelEndpoint[] }) {
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
      {endpoints.length > 0 && (
        <optgroup label="Equipment">
          {endpoints.map((e) => (
            <option key={e.id} value={epPointId(e.id)}>
              {pointName(epPointId(e.id), device, endpoints)}
            </option>
          ))}
        </optgroup>
      )}
    </>
  )
}

/** Drop everything that points at a port, slot or box that no longer exists. */
function pruneTo(p: PanelPart, device: DeviceDef | undefined): PanelPart {
  const has = (id: string) =>
    isEpPoint(id) ? p.endpoints.some((e) => epPointId(e.id) === id) : !!device?.ports.some((x) => x.id === id)
  return {
    ...p,
    cables: p.cables.filter((c) => has(c.from) && has(c.to)),
    annotations: p.annotations.filter((a) => has(a.portId)),
    scenarios: p.scenarios.map((s) => ({
      ...s,
      steps: s.steps.map((st) => ({
        ...st,
        portIds: st.portIds.filter(has),
        links: st.links.filter((l) => has(l.from) && has(l.to)),
      })),
    })),
  }
}

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
  const template = getTemplate(part.deviceId)
  const [tab, setTab] = useState<Tab>('equipment')
  const [selected, setSelected] = useState<string | null>(null)
  const [activeNote, setActiveNote] = useState<string | null>(null)
  /** The step being edited: the diagram shows the unit as it is at that step. */
  const [active, setActive] = useState<{ scenarioId: string; stepId: string } | null>(null)
  const [picking, setPicking] = useState(false)

  const set = (fn: (p: PanelPart) => PanelPart) => d.patchPanel(addr, fn)

  const activeScenario = part.scenarios.find((s) => s.id === active?.scenarioId)
  const activeIndex = activeScenario?.steps.findIndex((s) => s.id === active?.stepId) ?? -1
  const activeStep = activeIndex >= 0 ? activeScenario?.steps[activeIndex] : undefined
  const showStep = tab === 'trouble' && !!activeStep

  const state = useMemo(
    () => stateAfter(part, showStep && activeScenario ? stepMoves(activeScenario.steps.slice(0, activeIndex + 1)) : []),
    [part, showStep, activeScenario, activeIndex],
  )
  const device = state.device
  const annotated = useMemo(() => new Set(part.annotations.map((a) => a.portId)), [part.annotations])
  const highlighted = useMemo(
    () => new Set(showStep ? activeStep?.portIds : []),
    [showStep, activeStep],
  )

  const changeDevice = (deviceId: string) => {
    setSelected(null)
    setActive(null)
    set((p) => pruneTo({ ...p, deviceId, cards: {} }, getDevice(deviceId)))
  }
  const changeCard = (slotId: string, cardId: string) =>
    set((p) => {
      const cards = { ...p.cards, [slotId]: cardId }
      return pruneTo({ ...p, cards }, getDevice(p.deviceId, cards))
    })

  const connect = (from: string, to: string) =>
    set((p) =>
      p.cables.some((c) => (c.from === from && c.to === to) || (c.from === to && c.to === from))
        ? p
        : { ...p, cables: [...p.cables, { id: uid(), from, to, label: '' }] },
    )

  const removeEndpoint = (id: string) => {
    setSelected(null)
    set((p) => pruneTo({ ...p, endpoints: p.endpoints.filter((e) => e.id !== id) }, device))
  }

  const patchScenario = (id: string, fn: (s: PanelScenario) => PanelScenario) =>
    set((p) => ({ ...p, scenarios: p.scenarios.map((s) => (s.id === id ? fn(s) : s)) }))
  const patchStep = (sid: string, stepId: string, fn: (s: PanelStep) => PanelStep) =>
    patchScenario(sid, (s) => ({ ...s, steps: s.steps.map((st) => (st.id === stepId ? fn(st) : st)) }))

  const onPortClick = (id: string) => {
    setSelected(id)
    if (isEpPoint(id)) return
    if (tab === 'notes') {
      const existing = part.annotations.find((a) => a.portId === id)
      if (existing) setActiveNote(existing.id)
      else {
        const note = { id: uid(), portId: id, label: '', note: '' }
        set((p) => ({ ...p, annotations: [...p.annotations, note] }))
        setActiveNote(note.id)
      }
    } else if (tab === 'trouble' && picking && active) {
      patchStep(active.scenarioId, active.stepId, (st) => ({
        ...st,
        portIds: st.portIds.includes(id) ? st.portIds.filter((x) => x !== id) : [...st.portIds, id],
      }))
    }
  }

  const portOptions = device ? <PortOptions device={device} endpoints={part.endpoints} /> : null
  const portName = (id: string) => (device ? pointName(id, device, part.endpoints) : id)
  const inputSlots = template?.slots.filter((s) => s.family === 'input') ?? []

  const hint =
    tab === 'equipment'
      ? 'Drag the + on a box onto a port or another box to connect a cable.'
      : tab === 'notes'
        ? 'Click a port to add or edit its note.'
        : tab === 'trouble'
          ? picking
            ? 'Click ports to light them up in this step. Click “Done” when finished.'
            : 'Select a step below to see the unit as it is at that step.'
          : 'Choose the card installed in each slot.'

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
          {!template && <option value={part.deviceId}>Unknown ({part.deviceId})</option>}
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
            <PanelCanvas
              height={540}
              device={device}
              endpoints={part.endpoints}
              cables={state.cables}
              annotated={annotated}
              highlighted={highlighted}
              links={showStep ? activeStep?.links : undefined}
              moves={showStep && activeStep?.move ? [activeStep.move] : undefined}
              selected={selected}
              onPortClick={onPortClick}
              onConnect={tab === 'equipment' ? connect : undefined}
            />
            <p className="text-ink-faint mt-1 text-[11px]">{hint}</p>
          </div>

          <div role="tablist" className="border-line mt-3 flex gap-1 border-b">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => {
                  setTab(t.id)
                  setPicking(false)
                }}
                className={`-mb-px rounded-t-md border border-b-0 px-3 py-1.5 text-sm font-medium transition-colors ${
                  tab === t.id
                    ? 'border-line-strong bg-surface text-ink'
                    : 'text-ink-muted hover:text-ink border-transparent'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="pt-3">
            {/* ---- cards ------------------------------------------------ */}
            {tab === 'layout' &&
              (template && template.slots.length > 0 ? (
                <div className="grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
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
              ) : (
                <p className="text-ink-faint text-sm">This unit has no swappable cards.</p>
              ))}

            {/* ---- equipment & cables ----------------------------------- */}
            {tab === 'equipment' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-1.5">
                  {(['source', 'display'] as const).map((side) => (
                    <button
                      key={side}
                      type="button"
                      onClick={() =>
                        set((p) => ({
                          ...p,
                          endpoints: [...p.endpoints, { id: uid(), side, name: '', detail: '', info: [] }],
                        }))
                      }
                      className={GHOST_BTN}
                    >
                      <PlusIcon className="h-3.5 w-3.5" />
                      Add {side}
                    </button>
                  ))}
                  <span className="text-ink-faint text-[11px]">
                    Add a hop (wall plate, extender…) as another source or display, then cable it between.
                  </span>
                </div>

                {part.endpoints.map((e) => {
                  const patchEp = (fields: Partial<PanelEndpoint>) =>
                    set((p) => ({ ...p, endpoints: p.endpoints.map((x) => (x.id === e.id ? { ...x, ...fields } : x)) }))
                  const addInfo = (key: string) => patchEp({ info: [...e.info, { id: uid(), key, value: '' }] })
                  const mine = part.cables.filter((c) => c.from === epPointId(e.id) || c.to === epPointId(e.id))
                  return (
                    <div key={e.id} className="border-line bg-surface rounded-lg border p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="border-line inline-flex overflow-hidden rounded-md border text-xs font-medium">
                          {(['source', 'display'] as const).map((side) => (
                            <button
                              key={side}
                              type="button"
                              onClick={() => patchEp({ side })}
                              className={`px-2.5 py-1 ${e.side === side ? 'bg-brand-soft text-brand-strong' : 'text-ink-muted hover:bg-subtle'}`}
                            >
                              {side === 'source' ? 'Source' : 'Display'}
                            </button>
                          ))}
                        </div>
                        <input
                          value={e.name}
                          onChange={(ev) => patchEp({ name: ev.target.value })}
                          placeholder="Name (e.g. Laptop, Display 1)…"
                          className={`${INPUT_HEADING} min-w-40 flex-1`}
                        />
                        <button
                          type="button"
                          aria-label="Delete equipment"
                          onClick={() => removeEndpoint(e.id)}
                          className={`${DELETE_BTN} p-1`}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                      <input
                        value={e.detail}
                        onChange={(ev) => patchEp({ detail: ev.target.value })}
                        placeholder="Room or model (optional)…"
                        className={`${INPUT} mt-2`}
                      />
                      {e.info.length > 0 && (
                        <div className="mt-2 space-y-1.5">
                          {e.info.map((i) => (
                            <div key={i.id} className="flex items-center gap-2">
                              <div className="w-36 shrink-0">
                                <input
                                  value={i.key}
                                  onChange={(ev) =>
                                    patchEp({ info: e.info.map((x) => (x.id === i.id ? { ...x, key: ev.target.value } : x)) })
                                  }
                                  placeholder="Label"
                                  className={INPUT}
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <input
                                  value={i.value}
                                  onChange={(ev) =>
                                    patchEp({ info: e.info.map((x) => (x.id === i.id ? { ...x, value: ev.target.value } : x)) })
                                  }
                                  placeholder="Value (e.g. 1080p60, DHCP)"
                                  className={INPUT}
                                />
                              </div>
                              <button
                                type="button"
                                aria-label="Delete detail"
                                onClick={() => patchEp({ info: e.info.filter((x) => x.id !== i.id) })}
                                className={`${DELETE_BTN} p-1`}
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span className="text-ink-faint text-[11px]">Add detail:</span>
                        {INFO_SUGGESTIONS.filter((k) => !e.info.some((i) => i.key === k)).map((k) => (
                          <button key={k} type="button" onClick={() => addInfo(k)} className={GHOST_BTN}>
                            {k}
                          </button>
                        ))}
                        <button type="button" onClick={() => addInfo('')} className={GHOST_BTN}>
                          Other…
                        </button>
                      </div>
                      {mine.length > 0 && (
                        <p className="text-ink-faint mt-2 text-[11px]">
                          Cables: {mine.map((c) => portName(c.from === epPointId(e.id) ? c.to : c.from)).join(', ')}
                        </p>
                      )}
                    </div>
                  )
                })}

                {part.cables.length > 0 && (
                  <div>
                    <p className={`mb-1.5 ${SECTION_LABEL}`}>Cables</p>
                    <div className="space-y-2">
                      {part.cables.map((c) => {
                        const patchCable = (fields: Partial<typeof c>) =>
                          set((p) => ({ ...p, cables: p.cables.map((x) => (x.id === c.id ? { ...x, ...fields } : x)) }))
                        return (
                          <div key={c.id} className="flex flex-wrap items-center gap-2">
                            <select value={c.from} onChange={(ev) => patchCable({ from: ev.target.value })} className={`${SELECT} max-w-52`}>
                              {portOptions}
                            </select>
                            <span className="text-ink-faint text-xs">→</span>
                            <select value={c.to} onChange={(ev) => patchCable({ to: ev.target.value })} className={`${SELECT} max-w-52`}>
                              {portOptions}
                            </select>
                            <input
                              value={c.label}
                              onChange={(ev) => patchCable({ label: ev.target.value })}
                              placeholder="Cable label (optional)…"
                              className={`${INPUT} min-w-36 flex-1`}
                            />
                            <button
                              type="button"
                              aria-label="Delete cable"
                              onClick={() => set((p) => ({ ...p, cables: p.cables.filter((x) => x.id !== c.id) }))}
                              className={`${DELETE_BTN} p-1`}
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ---- port notes ------------------------------------------- */}
            {tab === 'notes' && (
              <div className="space-y-2">
                {part.annotations.length === 0 && (
                  <p className="text-ink-faint text-sm">No notes yet. Click a port on the diagram to add one.</p>
                )}
                {part.annotations.map((a) => {
                  const patchNote = (fields: Partial<typeof a>) =>
                    set((p) => ({ ...p, annotations: p.annotations.map((x) => (x.id === a.id ? { ...x, ...fields } : x)) }))
                  return (
                    <div
                      key={a.id}
                      className={`bg-surface space-y-2 rounded-lg border p-2.5 ${activeNote === a.id ? 'border-fuchsia-400/60' : 'border-line'}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-ink w-48 shrink-0 text-xs font-semibold">{portName(a.portId)}</span>
                        <input
                          value={a.label}
                          onChange={(ev) => patchNote({ label: ev.target.value })}
                          placeholder="Short label (e.g. Boardroom display)…"
                          className={`${INPUT} flex-1`}
                        />
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
                        onChange={(ev) => patchNote({ note: ev.target.value })}
                        placeholder="What to know about this port: cable type, what's plugged in, common problems…"
                        rows={2}
                        className={TEXTAREA}
                      />
                    </div>
                  )
                })}
              </div>
            )}

            {/* ---- troubleshooting -------------------------------------- */}
            {tab === 'trouble' && (
              <div className="space-y-3">
                {part.scenarios.map((sc) => (
                  <div key={sc.id} className="border-line bg-surface rounded-lg border p-3">
                    <div className="flex items-center gap-2">
                      <input
                        value={sc.title}
                        onChange={(ev) => patchScenario(sc.id, (s) => ({ ...s, title: ev.target.value }))}
                        placeholder="Check title, e.g. No picture on one input"
                        className={`${INPUT_HEADING} flex-1`}
                      />
                      <button
                        type="button"
                        aria-label="Delete check"
                        onClick={() => {
                          if (active?.scenarioId === sc.id) setActive(null)
                          set((p) => ({ ...p, scenarios: p.scenarios.filter((x) => x.id !== sc.id) }))
                        }}
                        className={`${DELETE_BTN} p-1`}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>

                    <ol className="mt-3 space-y-2.5">
                      {sc.steps.map((st, si) => {
                        const isActive = active?.stepId === st.id
                        const patch = (fn: (s: PanelStep) => PanelStep) => patchStep(sc.id, st.id, fn)
                        const others = sc.steps.filter((x) => x.id !== st.id)
                        return (
                          <li
                            key={st.id}
                            className={`bg-canvas rounded-lg border p-2.5 ${isActive ? 'border-fuchsia-400/60' : 'border-line'}`}
                          >
                            <div className="mb-1.5 flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setActive({ scenarioId: sc.id, stepId: st.id })
                                  setPicking(false)
                                }}
                                className={`rounded-md px-2 py-0.5 text-[11px] font-bold tracking-wide uppercase ${
                                  isActive ? 'bg-fuchsia-400/20 text-fuchsia-200' : 'bg-subtle text-ink-muted hover:text-ink'
                                }`}
                              >
                                Step {si + 1}
                              </button>
                              <span className="flex-1" />
                              <button
                                type="button"
                                aria-label="Delete step"
                                onClick={() => {
                                  if (isActive) setActive(null)
                                  patchScenario(sc.id, (s) => ({
                                    ...s,
                                    steps: s.steps
                                      .filter((x) => x.id !== st.id)
                                      .map((x) => ({
                                        ...x,
                                        answers: x.answers.map((a) => (a.next === st.id ? { ...a, next: '' } : a)),
                                      })),
                                  }))
                                }}
                                className={`${DELETE_BTN} p-1`}
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </div>
                            <textarea
                              value={st.text}
                              onFocus={() => setActive({ scenarioId: sc.id, stepId: st.id })}
                              onChange={(ev) => patch((s) => ({ ...s, text: ev.target.value }))}
                              placeholder="What to do or ask, e.g. “Move the card from Input 12 to Input 9. Does the problem follow the card?”"
                              rows={2}
                              className={TEXTAREA}
                            />

                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                              <label className="text-ink-muted inline-flex items-center gap-1.5">
                                <input
                                  type="checkbox"
                                  checked={!!st.move}
                                  onChange={(ev) =>
                                    patch((s) => ({
                                      ...s,
                                      move: ev.target.checked
                                        ? { from: inputSlots[0]?.id ?? '', to: inputSlots[1]?.id ?? '' }
                                        : undefined,
                                    }))
                                  }
                                />
                                Swap two cards
                              </label>
                              {st.move && (
                                <>
                                  <select
                                    value={st.move.from}
                                    onChange={(ev) => patch((s) => ({ ...s, move: { from: ev.target.value, to: s.move?.to ?? '' } }))}
                                    className={SELECT}
                                  >
                                    {inputSlots.map((sl) => (
                                      <option key={sl.id} value={sl.id}>{sl.label}</option>
                                    ))}
                                  </select>
                                  <span className="text-ink-faint">⇄</span>
                                  <select
                                    value={st.move.to}
                                    onChange={(ev) => patch((s) => ({ ...s, move: { from: s.move?.from ?? '', to: ev.target.value } }))}
                                    className={SELECT}
                                  >
                                    {inputSlots.map((sl) => (
                                      <option key={sl.id} value={sl.id}>{sl.label}</option>
                                    ))}
                                  </select>
                                  <span className="text-ink-faint">cables follow the cards</span>
                                </>
                              )}
                            </div>

                            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                              <button
                                type="button"
                                onClick={() => {
                                  setActive({ scenarioId: sc.id, stepId: st.id })
                                  setPicking((p) => !(p && isActive))
                                }}
                                className={`${GHOST_BTN} ${picking && isActive ? 'border-fuchsia-400/60 text-fuchsia-200' : ''}`}
                              >
                                {picking && isActive ? 'Done' : 'Light up ports'}
                              </button>
                              {st.portIds.map((id) => (
                                <button
                                  key={id}
                                  type="button"
                                  title="Remove"
                                  onClick={() => patch((s) => ({ ...s, portIds: s.portIds.filter((x) => x !== id) }))}
                                  className="border-line bg-subtle text-ink-muted hover:text-ink rounded-md border px-1.5 py-0.5"
                                >
                                  {portName(id)} ×
                                </button>
                              ))}
                            </div>

                            <div className="mt-2.5 space-y-1.5">
                              {st.answers.map((a) => (
                                <div key={a.id} className="flex flex-wrap items-start gap-2">
                                  <div className="w-32 shrink-0">
                                    <input
                                      value={a.label}
                                      onChange={(ev) =>
                                        patch((s) => ({ ...s, answers: s.answers.map((x) => (x.id === a.id ? { ...x, label: ev.target.value } : x)) }))
                                      }
                                      placeholder="Answer (e.g. Yes)"
                                      className={INPUT}
                                    />
                                  </div>
                                  <select
                                    value={a.next}
                                    onChange={(ev) =>
                                      patch((s) => ({ ...s, answers: s.answers.map((x) => (x.id === a.id ? { ...x, next: ev.target.value } : x)) }))
                                    }
                                    className={SELECT}
                                  >
                                    <option value="">Finish with a conclusion</option>
                                    {others.map((o) => (
                                      <option key={o.id} value={o.id}>
                                        Go to step {sc.steps.indexOf(o) + 1}
                                      </option>
                                    ))}
                                  </select>
                                  {!a.next && (
                                    <div className="min-w-48 flex-1">
                                      <input
                                        value={a.result}
                                        onChange={(ev) =>
                                          patch((s) => ({ ...s, answers: s.answers.map((x) => (x.id === a.id ? { ...x, result: ev.target.value } : x)) }))
                                        }
                                        placeholder="Conclusion, e.g. Slot issue: replace the chassis"
                                        className={INPUT}
                                      />
                                    </div>
                                  )}
                                  <button
                                    type="button"
                                    aria-label="Delete answer"
                                    onClick={() => patch((s) => ({ ...s, answers: s.answers.filter((x) => x.id !== a.id) }))}
                                    className={`${DELETE_BTN} p-1`}
                                  >
                                    <TrashIcon className="h-4 w-4" />
                                  </button>
                                </div>
                              ))}
                              <div className="flex flex-wrap items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    patch((s) => ({
                                      ...s,
                                      answers: [
                                        ...s.answers,
                                        { id: uid(), label: s.answers.length === 0 ? 'Yes' : s.answers.length === 1 ? 'No' : '', next: '', result: '' },
                                      ],
                                    }))
                                  }
                                  className={GHOST_BTN}
                                >
                                  <PlusIcon className="h-3.5 w-3.5" />
                                  Add answer
                                </button>
                                {st.answers.length === 0 && (
                                  <span className="text-ink-faint text-[11px]">No answers: this step ends the check.</span>
                                )}
                              </div>
                            </div>
                          </li>
                        )
                      })}
                    </ol>

                    <button
                      type="button"
                      onClick={() => {
                        const step: PanelStep = { id: uid(), text: '', portIds: [], links: [], answers: [] }
                        patchScenario(sc.id, (s) => ({ ...s, steps: [...s.steps, step] }))
                        setActive({ scenarioId: sc.id, stepId: step.id })
                      }}
                      className={`${GHOST_BTN} mt-2.5`}
                    >
                      <PlusIcon className="h-3.5 w-3.5" />
                      Add step
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => {
                    const step: PanelStep = { id: uid(), text: '', portIds: [], links: [], answers: [] }
                    const sc: PanelScenario = { id: uid(), title: '', steps: [step] }
                    set((p) => ({ ...p, scenarios: [...p.scenarios, sc] }))
                    setActive({ scenarioId: sc.id, stepId: step.id })
                  }}
                  className={GHOST_BTN}
                >
                  <PlusIcon className="h-3.5 w-3.5" />
                  Add troubleshooting check
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </BlockFrame>
  )
}
