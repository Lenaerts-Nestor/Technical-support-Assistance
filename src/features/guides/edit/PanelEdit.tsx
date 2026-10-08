import { useMemo, useRef, useState } from 'react'
import { PlusIcon } from '../components/icons'
import { PanelCanvas, type PanelCanvasHandle } from '../panel/PanelCanvas'
import { stateAfter, stepMoves } from '../panel/flow'
import { EP_W, epPointId, isEpPoint, layoutScene, parsePoint, pointName } from '../panel/scene'
import { cableToNewUnit, infoFor, kindAccepts, resolveDrop, type Ctx } from '../panel/connect'
import {
  TEMPLATES,
  cardIdFor,
  cardsFor,
  getDevice,
  getTemplate,
  type DeviceDef,
} from '../panel/devices'
import { getUnitKind, getUnitModel, unitPortSpecs } from '../panel/units'
import { GHOST_BTN } from '../../../shared/ui/styles'
import { BlockFrame } from './BlockFrame'
import { CableInspector, UnitInspector } from './EquipmentInspector'
import { Field, INPUT_HEADING, SELECT } from './fields'
import { useFresh } from './editorUi'
import { PanelNotesTab } from './PanelNotesTab'
import { PanelTroubleTab, type ActiveStep } from './PanelTroubleTab'
import { PanelUnitsTab } from './PanelUnitsTab'
import { UnitPicker } from './UnitPicker'
import type { BlockEditProps } from './blockEditProps'
import type { PanelEndpoint, PanelPart, PanelScenario, PanelStep } from '../types'

const uid = () => crypto.randomUUID()

type Tab = 'layout' | 'equipment' | 'notes' | 'trouble'

/** What each tab is for, shown under the tab bar so nobody has to guess. */
const TAB_HELP: Record<Tab, string> = {
  equipment:
    'Build the setup: add units, then drag from a port onto another port or a unit to cable them. A unit joined to a switch links to the switch itself, so there is no port to pick.',
  layout: 'Choose which card is installed in each slot of the chassis.',
  notes: 'Click a port on the diagram to attach a note to it. Readers see the note when they click that port.',
  trouble:
    'Each check is a short flowchart. Select a step to see the setup as it is at that step, change it (plug or unplug cables, swap units) and pick the ports to look at.',
}

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
      {endpoints.map((e) => {
        const specs = unitPortSpecs(e.kind, e.model)
        const name = pointName(epPointId(e.id), device, endpoints)
        return (
          <optgroup key={e.id} label={name}>
            {specs.length === 0 ? (
              <option value={epPointId(e.id)}>{name}</option>
            ) : (
              <>
                {e.kind === 'switch' && <option value={epPointId(e.id)}>{name} (any port)</option>}
                {specs.map((s) => (
                  <option key={s.key} value={epPointId(e.id, s.key)}>
                    {name}: {s.label}
                  </option>
                ))}
              </>
            )}
          </optgroup>
        )
      })}
    </>
  )
}

/** Drop everything that points at a port, slot, cable or box that no longer exists. */
function pruneTo(p: PanelPart, device: DeviceDef | undefined): PanelPart {
  const has = (id: string) => {
    const pt = parsePoint(id)
    if (!pt) return !!device?.ports.some((x) => x.id === id)
    const unit = p.endpoints.find((e) => e.id === pt.unitId)
    if (!unit) return false
    return !pt.portKey || unitPortSpecs(unit.kind, unit.model).some((s) => s.key === pt.portKey)
  }
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
        actions: st.actions.filter((a) =>
          a.type === 'swap-units'
            ? p.endpoints.some((e) => e.id === a.a) && p.endpoints.some((e) => e.id === a.b)
            : a.type === 'plug'
              ? has(a.from) && has(a.to)
              : true,
        ),
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
  reorder,
  onMove,
  onRemove,
  d,
}: BlockEditProps<PanelPart>) {
  const template = getTemplate(part.deviceId)
  const fresh = useFresh(part.id)
  const canvas = useRef<PanelCanvasHandle>(null)
  const canvasWrap = useRef<HTMLDivElement>(null)
  const [tab, setTab] = useState<Tab>('equipment')
  const [selected, setSelected] = useState<string | null>(null)
  const [selectedCable, setSelectedCable] = useState<string | null>(null)
  const [activeNote, setActiveNote] = useState<string | null>(null)
  /** The step being edited: the diagram shows the setup as it is at that step. */
  const [active, setActive] = useState<ActiveStep | null>(null)
  const [picking, setPicking] = useState(false)
  const [addOpen, setAddOpen] = useState(false)

  const set = (fn: (p: PanelPart) => PanelPart) => d.patchPanel(addr, fn)

  const activeScenario = part.scenarios.find((s) => s.id === active?.scenarioId)
  const activeIndex = activeScenario?.steps.findIndex((s) => s.id === active?.stepId) ?? -1
  const activeStep = activeIndex >= 0 ? activeScenario?.steps[activeIndex] : undefined
  const showStep = tab === 'trouble' && !!activeStep

  const state = useMemo(
    () => stateAfter(part, showStep && activeScenario ? activeScenario.steps.slice(0, activeIndex + 1) : []),
    [part, showStep, activeScenario, activeIndex],
  )
  const device = state.device
  const endpoints = state.endpoints
  const annotated = useMemo(() => new Set(part.annotations.map((a) => a.portId)), [part.annotations])
  const highlighted = useMemo(() => new Set(showStep ? activeStep?.portIds : []), [showStep, activeStep])

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

  /* ---- units & cables -------------------------------------------------- */

  const patchUnit = (id: string, fields: Partial<PanelEndpoint>) =>
    set((p) => {
      const next = { ...p, endpoints: p.endpoints.map((e) => (e.id === id ? { ...e, ...fields } : e)) }
      // A different type or model has different ports: cables to ports it lost go away.
      return 'kind' in fields || 'model' in fields ? pruneTo(next, device) : next
    })

  // Checks run against the setup as currently shown (after the step being edited, on that tab).
  const ctx: Ctx | null = device ? { device, endpoints, cables: state.cables } : null

  /** What dropping a cable dragged from `from` onto `drop` would do (checked live while dragging). */
  const resolveConnection = (from: string, drop: string) =>
    ctx ? resolveDrop(from, drop, ctx) : ({ ok: false, to: null, reason: '' } as const)

  const removeCable = (id: string) => {
    if (selectedCable === id) setSelectedCable(null)
    set((p) => ({ ...p, cables: p.cables.filter((c) => c.id !== id) }))
  }

  const removeUnit = (id: string) => {
    setSelected(null)
    set((p) => pruneTo({ ...p, endpoints: p.endpoints.filter((e) => e.id !== id) }, device))
  }

  /**
   * Add a unit, optionally cabled from `from` (a port or another unit): the new
   * unit's matching port is picked for you. Returns its id.
   */
  const addUnit = (kindId: string, from?: string): string => {
    const kind = getUnitKind(kindId)
    const id = uid()
    const parentUnit = from ? parsePoint(from)?.unitId : undefined
    const parent = parentUnit ? part.endpoints.find((e) => e.id === parentUnit) : undefined
    const chassisPort = from && !isEpPoint(from) ? device?.ports.find((p) => p.id === from) : undefined
    const fromInfo = from && ctx ? infoFor(from, ctx) : null
    const model = getUnitModel(kindId)?.id

    // Chains grow outward from what they hang off; from a chassis port, by the port's direction.
    const side: PanelEndpoint['side'] = parent
      ? parent.side
      : chassisPort
        ? (kind.side ?? (chassisPort.kind === 'input' ? 'source' : 'display'))
        : (kind.side ?? 'source')

    let pos: PanelEndpoint['pos']
    if (device?.freestyle) {
      // Put it beside what it hangs off (towards the free port's side), or after the last unit.
      const parentItem = parent ? layoutScene(device, part.endpoints, part.cables).items.find((i) => i.endpoint.id === parent.id) : undefined
      const toRight = fromInfo?.dir === 'in' ? false : true
      if (parentItem) {
        pos = { x: parentItem.x + (toRight ? EP_W + 70 : -(EP_W + 70)), y: parentItem.y }
      } else {
        const items = device ? layoutScene(device, part.endpoints, part.cables).items : []
        pos = items.length
          ? { x: Math.max(...items.map((i) => i.x + i.w)) + 70, y: Math.min(...items.map((i) => i.y)) }
          : { x: 0, y: 0 }
      }
    } else if (parent?.pos) {
      pos = { x: parent.pos.x + (side === 'source' ? -(EP_W + 90) : EP_W + 90), y: parent.pos.y }
    }

    const unit: PanelEndpoint = { id, side, kind: kindId, model, name: '', detail: '', info: [], ...(pos ? { pos } : {}) }
    const link = from && ctx ? cableToNewUnit(unit, from, ctx) : null
    set((p) => ({
      ...p,
      endpoints: [...p.endpoints, unit],
      cables: link ? [...p.cables, { id: uid(), from: link.from, to: link.to, label: '' }] : p.cables,
    }))
    return id
  }

  /** Select a unit from a list: open its details and bring it into view on the diagram. */
  const locateUnit = (unitId: string) => {
    setSelectedCable(null)
    setSelected(epPointId(unitId))
    canvas.current?.focusUnit(unitId)
    canvasWrap.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }

  /** A cable the editor has already checked (see `resolveConnection`). */
  const connect = (from: string, to: string) => {
    if (tab === 'trouble' && active) {
      // Plugging in during a step: becomes an action of that step.
      patchStep(active.scenarioId, active.stepId, (st) => ({
        ...st,
        actions: [...st.actions, { id: uid(), type: 'plug', cableId: uid(), from, to, label: '' }],
      }))
      return
    }
    set((p) =>
      p.cables.some((c) => (c.from === from && c.to === to) || (c.from === to && c.to === from))
        ? p
        : { ...p, cables: [...p.cables, { id: uid(), from, to, label: '' }] },
    )
  }

  /* ---- troubleshooting ------------------------------------------------ */

  const patchScenario = (id: string, fn: (s: PanelScenario) => PanelScenario) =>
    set((p) => ({ ...p, scenarios: p.scenarios.map((s) => (s.id === id ? fn(s) : s)) }))
  const patchStep = (sid: string, stepId: string, fn: (s: PanelStep) => PanelStep) =>
    patchScenario(sid, (s) => ({ ...s, steps: s.steps.map((st) => (st.id === stepId ? fn(st) : st)) }))

  const onPortClick = (id: string) => {
    setSelectedCable(null)
    setSelected(id)
    const pt = parsePoint(id)
    if (pt && !pt.portKey) return // a box: selecting it is all a click does
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

  const portOptions = device ? <PortOptions device={device} endpoints={endpoints} /> : null
  const portName = (id: string) => (device ? pointName(id, device, endpoints) : id)
  const inputSlots = template?.slots.filter((s) => s.family === 'input') ?? []

  // Clicking a unit's box or any of its ports shows that unit in the side panel.
  const selectedUnitId = selected ? parsePoint(selected)?.unitId : undefined
  const selectedUnit = selectedUnitId ? part.endpoints.find((e) => e.id === selectedUnitId) : undefined
  const cable = state.cables.find((c) => c.id === selectedCable)

  const hint =
    tab === 'equipment'
      ? 'Drag a box to move it · drag from a port onto another port or box to cable it · click a port to add a unit or remove its cable.'
      : tab === 'notes'
        ? 'Click a port to add or edit its note.'
        : tab === 'trouble'
          ? picking
            ? 'Click ports to light them up in this step, then press “Done picking”.'
            : activeStep
              ? 'Drag a + to plug a cable in this step · click a cable to unplug it.'
              : 'Select a step below to see the setup as it is at that step.'
          : 'Choose the card installed in each slot.'

  /** Menu opened by clicking a "+" or a port on the Units tab. */
  const renderMenu = (id: string, close: () => void) => {
    const mine = part.cables.filter((c) => c.from === id || c.to === id)
    const here = ctx ? infoFor(id, ctx) : null
    const pt = parsePoint(id)
    return (
      <div>
        <p className="text-ink text-sm font-semibold">{portName(id)}</p>
        {here?.signal && (
          <p className="text-ink-faint text-[11px]">
            {here.signal.toUpperCase()} · {here.dir === 'in' ? 'input' : here.dir === 'out' ? 'output' : 'two-way'}
          </p>
        )}
        <p className="text-ink-muted mt-2 mb-1.5 text-[11px] font-semibold tracking-wide uppercase">
          Add a unit and cable it here
        </p>
        <UnitPicker
          canPick={(kind) => !here || kindAccepts(kind, undefined, here)}
          onPick={(kind) => {
            const nid = addUnit(kind, id)
            setSelected(epPointId(nid))
            setSelectedCable(null)
            close()
          }}
        />
        {mine.length > 0 && (
          <>
            <p className="text-ink-muted mt-3 mb-1 text-[11px] font-semibold tracking-wide uppercase">Cables</p>
            <ul className="space-y-1">
              {mine.map((c) => (
                <li key={c.id} className="flex items-center gap-1.5 text-xs">
                  <span className="text-ink-muted min-w-0 flex-1 truncate">
                    {portName(c.from === id ? c.to : c.from)}
                  </span>
                  <button type="button" onClick={() => removeCable(c.id)} className={GHOST_BTN}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
        {pt && !pt.portKey && (
          <button
            type="button"
            onClick={() => {
              removeUnit(pt.unitId)
              close()
            }}
            className="mt-3 text-xs font-medium text-rose-300 underline underline-offset-2"
          >
            Delete this unit
          </button>
        )}
      </div>
    )
  }

  /**
   * Chassis layout: forget dragged positions. Freestyle: lay units out left to
   * right following the cables (an output feeds the next column), top to bottom
   * within a column.
   */
  const autoArrange = () => {
    if (!device?.freestyle) {
      set((p) => ({
        ...p,
        endpoints: p.endpoints.map((e) => {
          const rest = { ...e }
          delete rest.pos
          return rest
        }),
      }))
      return
    }
    const level = new Map(part.endpoints.map((e) => [e.id, 0]))
    const order = new Map(part.endpoints.map((e, i) => [e.id, i]))
    const unitById = new Map(part.endpoints.map((e) => [e.id, e]))
    // Edges point from what sends to what receives; two-way links go from the older unit to the newer.
    const edges = part.cables.flatMap((c) => {
      const a = ctx ? infoFor(c.from, ctx) : null
      const b = ctx ? infoFor(c.to, ctx) : null
      if (!a?.unitId || !b?.unitId || a.unitId === b.unitId) return []
      // A link to a switch as a whole has no port direction: the unit's own side decides
      // (a source feeds the switch, the switch feeds a display), so a chain reads left to right.
      const aHub = unitById.get(a.unitId)?.kind === 'switch' && !parsePoint(c.from)?.portKey
      const bHub = unitById.get(b.unitId)?.kind === 'switch' && !parsePoint(c.to)?.portKey
      if (aHub !== bHub) {
        const unit = unitById.get(aHub ? b.unitId : a.unitId)
        const unitSends = unit ? getUnitKind(unit.kind).side !== 'display' : true
        const [unitId, hubId] = aHub ? [b.unitId, a.unitId] : [a.unitId, b.unitId]
        return [unitSends ? ([unitId, hubId] as const) : ([hubId, unitId] as const)]
      }
      const aSends = a.dir === 'out' || b.dir === 'in' || (a.dir === 'io' && b.dir === 'io' && (order.get(a.unitId) ?? 0) <= (order.get(b.unitId) ?? 0))
      return [aSends ? ([a.unitId, b.unitId] as const) : ([b.unitId, a.unitId] as const)]
    })
    for (let i = 0; i < part.endpoints.length; i++) {
      for (const [from, to] of edges) level.set(to, Math.max(level.get(to) ?? 0, (level.get(from) ?? 0) + 1))
    }
    const items = layoutScene(device, part.endpoints, part.cables).items
    const colY = new Map<number, number>()
    const pos = new Map<string, { x: number; y: number }>()
    for (const e of part.endpoints) {
      const lv = Math.min(level.get(e.id) ?? 0, part.endpoints.length)
      const y = colY.get(lv) ?? 0
      pos.set(e.id, { x: lv * (EP_W + 150), y })
      colY.set(lv, y + (items.find((i) => i.endpoint.id === e.id)?.h ?? 120) + 40)
    }
    set((p) => ({ ...p, endpoints: p.endpoints.map((e) => ({ ...e, pos: pos.get(e.id) })) }))
  }

  const toolbar =
    tab === 'equipment' ? (
      <>
        <div className="relative">
          <button type="button" onClick={() => setAddOpen((o) => !o)} aria-expanded={addOpen} className={GHOST_BTN}>
            <PlusIcon className="h-3.5 w-3.5" />
            Add unit
          </button>
          {addOpen && (
            <div className="border-line-strong bg-surface shadow-card absolute top-full left-0 z-20 mt-1 w-72 rounded-lg border p-2.5">
              <UnitPicker
                onPick={(kind) => {
                  const nid = addUnit(kind)
                  setSelected(epPointId(nid))
                  setSelectedCable(null)
                  setAddOpen(false)
                }}
              />
            </div>
          )}
        </div>
        {(device?.freestyle ? part.endpoints.length > 1 : part.endpoints.some((e) => e.pos)) && (
          <button type="button" onClick={autoArrange} className={GHOST_BTN}>
            Auto-arrange
          </button>
        )}
      </>
    ) : undefined

  const overlay =
    tab === 'equipment' && cable && device ? (
      <CableInspector
        cable={part.cables.find((c) => c.id === cable.id) ?? cable}
        device={device}
        endpoints={endpoints}
        onLabel={(label) => set((p) => ({ ...p, cables: p.cables.map((c) => (c.id === cable.id ? { ...c, label } : c)) }))}
        onRemove={() => removeCable(cable.id)}
        onClose={() => setSelectedCable(null)}
      />
    ) : tab === 'equipment' && selectedUnit && device ? (
      <UnitInspector
        unit={selectedUnit}
        device={device}
        endpoints={endpoints}
        cables={part.cables}
        onChange={(fields) => patchUnit(selectedUnit.id, fields)}
        onDelete={() => removeUnit(selectedUnit.id)}
        onRemoveCable={removeCable}
        onClose={() => setSelected(null)}
      />
    ) : tab === 'trouble' && cable && activeStep && active && device ? (
      <CableInspector
        cable={cable}
        device={device}
        endpoints={endpoints}
        removeLabel="Unplug in this step"
        onRemove={() => {
          patchStep(active.scenarioId, active.stepId, (st) => ({
            ...st,
            actions: [...st.actions, { id: uid(), type: 'unplug', cableId: cable.id }],
          }))
          setSelectedCable(null)
        }}
        onClose={() => setSelectedCable(null)}
      />
    ) : undefined

  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: 'equipment', label: 'Units & cables', badge: part.endpoints.length },
    ...((template?.slots.length ?? 0) > 0 ? [{ id: 'layout' as const, label: 'Cards' }] : []),
    { id: 'notes', label: 'Port notes', badge: part.annotations.length },
    { id: 'trouble', label: 'Troubleshooting', badge: part.scenarios.length },
  ]

  return (
    <BlockFrame
      id={part.id}
      kind="panel"
      chip="Panel"
      summary={part.title || 'Interactive panel'}
      index={index}
      count={count}
      nested={nested}
      reorder={reorder}
      onMove={onMove}
      onRemove={onRemove}
    >
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Panel title" hint="optional" className="min-w-48 flex-1">
          <input
            value={part.title}
            onChange={(e) => set((p) => ({ ...p, title: e.target.value }))}
            autoFocus={fresh}
            placeholder="e.g. Boardroom signal path"
            className={INPUT_HEADING}
          />
        </Field>
        <Field label="Device">
          <select value={part.deviceId} onChange={(e) => changeDevice(e.target.value)} className={SELECT}>
            {!template && <option value={part.deviceId}>Unknown ({part.deviceId})</option>}
            {TEMPLATES.map((dev) => (
              <option key={dev.id} value={dev.id}>
                {dev.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {device && (
        <>
          {/* The tabs sit above the diagram: they decide what the diagram does, so they stay in view with it. */}
          <div role="tablist" className="border-line mt-4 flex flex-wrap gap-1 border-b">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => {
                  setTab(t.id)
                  setPicking(false)
                  setAddOpen(false)
                  setSelectedCable(null)
                }}
                className={`-mb-px flex items-center gap-2 rounded-t-md border border-b-0 px-3.5 py-2 text-sm font-medium transition-colors ${
                  tab === t.id
                    ? 'border-line-strong bg-surface text-ink'
                    : 'text-ink-muted hover:text-ink border-transparent'
                }`}
              >
                {t.label}
                {t.badge !== undefined && t.badge > 0 && (
                  <span className="bg-subtle text-ink-muted rounded px-1.5 text-[11px] font-semibold">{t.badge}</span>
                )}
              </button>
            ))}
          </div>
          <p className="text-ink-muted bg-subtle mt-2.5 rounded-lg px-3 py-2 text-xs leading-relaxed">{TAB_HELP[tab]}</p>

          <div ref={canvasWrap} className="mt-3 flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <PanelCanvas
                ref={canvas}
                height={620}
                device={device}
                endpoints={endpoints}
                cables={state.cables}
                annotated={annotated}
                highlighted={highlighted}
                links={showStep ? activeStep?.links : undefined}
                moves={showStep ? stepMoves(activeStep) : undefined}
                ghostCables={showStep ? state.ghosts : undefined}
                freshCables={showStep ? state.fresh : undefined}
                selected={selected}
                selectedCable={selectedCable}
                onPortClick={onPortClick}
                onCableClick={(id) => {
                  setSelected(null)
                  setSelectedCable((c) => (c === id ? null : id))
                }}
                onConnect={tab === 'equipment' || (tab === 'trouble' && !!active) ? connect : undefined}
                resolveConnection={resolveConnection}
                onMoveUnit={tab === 'equipment' ? (id, pos) => patchUnit(id, { pos }) : undefined}
                renderMenu={tab === 'equipment' ? renderMenu : undefined}
                toolbar={toolbar}
              />
              <p className="text-ink-muted mt-1.5 text-xs">{hint}</p>
            </div>
            {overlay && <div className="max-h-[620px] w-72 shrink-0">{overlay}</div>}
          </div>

          <div className="pt-4">
            {tab === 'equipment' && (
              <PanelUnitsTab
                device={device}
                endpoints={part.endpoints}
                cables={part.cables}
                selectedUnitId={selectedUnitId}
                selectedCableId={selectedCable}
                onSelectUnit={locateUnit}
                onSelectCable={(id) => {
                  setSelected(null)
                  setSelectedCable(id)
                  canvasWrap.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
                }}
                onRemoveCable={removeCable}
                onAddUnit={(kind) => {
                  const nid = addUnit(kind)
                  locateUnit(nid)
                }}
              />
            )}

            {tab === 'layout' &&
              (template && template.slots.length > 0 ? (
                <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
                  {template.slots.map((slot) => (
                    <Field key={slot.id} label={slot.label}>
                      <select
                        value={cardIdFor(slot, part.cards)}
                        onChange={(ev) => changeCard(slot.id, ev.target.value)}
                        className={`${SELECT} w-full`}
                      >
                        {cardsFor(slot.family).map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                  ))}
                </div>
              ) : (
                <p className="text-ink-faint text-sm">This unit has no swappable cards.</p>
              ))}

            {tab === 'notes' && (
              <PanelNotesTab
                annotations={part.annotations}
                activeNote={activeNote}
                portName={portName}
                onPatch={(id, fields) =>
                  set((p) => ({ ...p, annotations: p.annotations.map((x) => (x.id === id ? { ...x, ...fields } : x)) }))
                }
                onRemove={(id) => set((p) => ({ ...p, annotations: p.annotations.filter((x) => x.id !== id) }))}
                onLocate={(portId) => {
                  const unit = parsePoint(portId)?.unitId
                  setSelected(portId)
                  if (unit) canvas.current?.focusUnit(unit)
                  canvasWrap.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
                }}
              />
            )}

            {tab === 'trouble' && (
              <PanelTroubleTab
                part={part}
                device={device}
                active={active}
                picking={picking}
                inputSlots={inputSlots}
                portOptions={portOptions}
                portName={portName}
                setActive={setActive}
                setPicking={setPicking}
                patchScenario={patchScenario}
                patchStep={patchStep}
                onAddScenario={(sc) => set((p) => ({ ...p, scenarios: [...p.scenarios, sc] }))}
                onRemoveScenario={(id) => set((p) => ({ ...p, scenarios: p.scenarios.filter((x) => x.id !== id) }))}
              />
            )}
          </div>
        </>
      )}
    </BlockFrame>
  )
}
