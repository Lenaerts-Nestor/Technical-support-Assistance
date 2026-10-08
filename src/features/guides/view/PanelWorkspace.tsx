import { useMemo, useState } from 'react'
import { usePanelFlow } from '../panel/usePanelFlow'
import { PanelFlowBox } from './PanelFlowBox'
import { PanelCanvas } from '../panel/PanelCanvas'
import { PORT_KIND_LABEL } from '../panel/devices'
import { SIGNAL_COLOR, SIGNAL_LABEL, getUnitKind, getUnitModel, unitPortSpecs } from '../panel/units'
import { cableColor, isEpPoint, isHubLink, parsePoint, pointName } from '../panel/scene'
import { SECTION_LABEL } from '../../../shared/ui/styles'
import type { PanelPart } from '../types'

/**
 * Full-size view of one panel block: the unit with its sources and displays
 * on a pannable canvas, and a side panel for what is selected, the cables, and
 * the troubleshooting checks. Read-only: wiring is edited in the guide editor.
 */
export function PanelWorkspace({ part }: { part: PanelPart }) {
  const flow = usePanelFlow(part)
  const { device, cables, endpoints } = flow
  const [selected, setSelected] = useState<string | null>(null)
  const [selectedCable, setSelectedCable] = useState<string | null>(null)

  const annotations = useMemo(
    () => new Map(part.annotations.map((a) => [a.portId, a])),
    [part.annotations],
  )
  const annotated = useMemo(() => new Set(annotations.keys()), [annotations])

  if (!device) {
    return <p className="text-ink-muted p-6 text-sm">This panel's device template isn't available.</p>
  }

  const name = (id: string) => pointName(id, device, endpoints)
  const cableIndex = new Map(cables.map((c, i) => [c.id, i]))
  const cableSummary = (id: string) => {
    const c = cables.find((x) => x.id === id)
    return c ? `${name(c.from)} → ${name(c.to)}` : ''
  }

  const port = selected && !isEpPoint(selected) ? device.ports.find((p) => p.id === selected) : undefined
  const sel = selected ? parsePoint(selected) : null
  const endpoint = sel ? endpoints.find((e) => e.id === sel.unitId) : undefined
  const unitSpec = endpoint && sel?.portKey ? unitPortSpecs(endpoint.kind, endpoint.model).find((s) => s.key === sel.portKey) : undefined
  // A box counts all of its ports' cables; a port only its own.
  const connected = selected
    ? cables.filter(
        (c) =>
          c.from === selected ||
          c.to === selected ||
          (!!sel && !sel.portKey && (parsePoint(c.from)?.unitId === sel.unitId || parsePoint(c.to)?.unitId === sel.unitId)),
      )
    : []
  const cable = cables.find((c) => c.id === selectedCable)
  const note = selected ? annotations.get(selected) : undefined

  const selectPoint = (id: string) => {
    setSelectedCable(null)
    setSelected((s) => (s === id ? null : id))
  }
  const selectCable = (id: string) => {
    setSelected(null)
    setSelectedCable((c) => (c === id ? null : id))
  }

  return (
    <div className="flex h-full gap-3 p-3">
      <div className="min-w-0 flex-1">
        <PanelCanvas
          device={device}
          endpoints={endpoints}
          cables={cables}
          annotated={annotated}
          highlighted={flow.highlighted}
          links={flow.links}
          moves={flow.moves}
          ghostCables={flow.ghosts}
          freshCables={flow.fresh}
          selected={selected}
          selectedCable={selectedCable}
          onPortClick={selectPoint}
          onCableClick={selectCable}
        />
      </div>

      <aside className="border-line-strong bg-surface w-80 shrink-0 space-y-5 overflow-y-auto rounded-lg border p-4">
        <section>
          <p className={`mb-1.5 ${SECTION_LABEL}`}>Selected</p>
          {cable ? (
            <div className="text-sm">
              <p className="text-ink font-semibold">{cable.label || 'Cable'}</p>
              <p className="text-ink-muted mt-0.5">{cableSummary(cable.id)}</p>
            </div>
          ) : port ? (
            <div className="text-sm">
              <p className="text-ink font-semibold">
                {port.label}
                <span className="text-ink-faint ml-2 text-xs font-normal">{PORT_KIND_LABEL[port.kind]}</span>
              </p>
              {note ? (
                <p className="text-ink-muted mt-1 whitespace-pre-line">
                  {note.label && <strong className="text-ink">{note.label}. </strong>}
                  {note.note}
                </p>
              ) : (
                <p className="text-ink-faint mt-1 text-xs">No note for this port in this guide.</p>
              )}
            </div>
          ) : endpoint ? (
            <div className="text-sm">
              {unitSpec && (
                <div className="border-line mb-2 border-b pb-2">
                  <p className="text-ink font-semibold">
                    {unitSpec.label}
                    <span className="text-ink-faint ml-2 text-xs font-normal">
                      {SIGNAL_LABEL[unitSpec.signal]} {unitSpec.dir === 'in' ? 'input' : unitSpec.dir === 'out' ? 'output' : 'two-way'}
                    </span>
                  </p>
                  {note ? (
                    <p className="text-ink-muted mt-1 whitespace-pre-line">
                      {note.label && <strong className="text-ink">{note.label}. </strong>}
                      {note.note}
                    </p>
                  ) : (
                    <p className="text-ink-faint mt-1 text-xs">No note for this port in this guide.</p>
                  )}
                </div>
              )}
              <p className="text-ink font-semibold">{endpoint.name || 'Unnamed'}</p>
              <p className="text-ink-muted">
                {getUnitKind(endpoint.kind).label}
                {getUnitModel(endpoint.kind, endpoint.model) && getUnitKind(endpoint.kind).models.length > 0
                  ? ` · ${getUnitModel(endpoint.kind, endpoint.model)?.name}`
                  : ''}
                {endpoint.detail ? ` · ${endpoint.detail}` : ''}
              </p>
              {endpoint.info.length > 0 && (
                <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
                  {endpoint.info.map((i) => (
                    <div key={i.id} className="contents">
                      <dt className="text-ink-faint">{i.key}</dt>
                      <dd className="text-ink">{i.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          ) : (
            <p className="text-ink-faint text-xs">Click a port, a piece of equipment or a cable.</p>
          )}
          {connected.length > 0 && (
            <ul className="mt-2 space-y-1">
              {connected.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => selectCable(c.id)}
                    className="text-ink-muted hover:text-ink text-left text-xs underline underline-offset-2"
                  >
                    {cableSummary(c.id)}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <p className={`mb-1.5 ${SECTION_LABEL}`}>Cables ({cables.length})</p>
          {cables.length === 0 ? (
            <p className="text-ink-faint text-xs">
              No cables yet. Add equipment and cables when editing the guide.
            </p>
          ) : (
            <ul className="space-y-1">
              {cables.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => selectCable(c.id)}
                    aria-pressed={c.id === selectedCable}
                    className={`flex w-full items-start gap-2 rounded-md border px-2 py-1.5 text-left text-xs transition-colors ${
                      c.id === selectedCable
                        ? 'border-line-strong bg-subtle text-ink'
                        : 'text-ink-muted hover:bg-subtle border-transparent'
                    }`}
                  >
                    <span
                      className="mt-1 h-2 w-2 shrink-0 rounded-full"
                      style={{ background: isHubLink(c, endpoints) ? SIGNAL_COLOR.lan : cableColor(cableIndex.get(c.id) ?? 0) }}
                    />
                    <span className="min-w-0">
                      {c.label && <strong className="text-ink block">{c.label}</strong>}
                      {cableSummary(c.id)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <PanelFlowBox part={part} flow={flow} />

        <p className="text-ink-faint text-[11px]">{device.note}</p>
      </aside>
    </div>
  )
}
