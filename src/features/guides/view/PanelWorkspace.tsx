import { useMemo, useState } from 'react'
import { PanelCanvas } from '../panel/PanelCanvas'
import { PORT_KIND_LABEL, getDevice } from '../panel/devices'
import { cableColor, epPointId, isEpPoint, pointName } from '../panel/scene'
import { SECTION_LABEL } from '../../../shared/ui/styles'
import type { PanelPart } from '../types'

/**
 * Full-size view of one panel block: the unit with its sources and displays
 * on a pannable canvas, and a side panel for what is selected, the cables, and
 * the troubleshooting checks. Read-only: wiring is edited in the guide editor.
 */
export function PanelWorkspace({ part }: { part: PanelPart }) {
  const device = useMemo(() => getDevice(part.deviceId, part.cards), [part.deviceId, part.cards])
  const [selected, setSelected] = useState<string | null>(null)
  const [selectedCable, setSelectedCable] = useState<string | null>(null)
  const [scenarioId, setScenarioId] = useState<string | null>(null)

  const annotations = useMemo(
    () => new Map(part.annotations.map((a) => [a.portId, a])),
    [part.annotations],
  )
  const annotated = useMemo(() => new Set(annotations.keys()), [annotations])
  const scenario = part.scenarios.find((s) => s.id === scenarioId) ?? null
  const highlighted = useMemo(() => new Set(scenario?.portIds ?? []), [scenario])

  if (!device) {
    return <p className="text-ink-muted p-6 text-sm">This panel's device template isn't available.</p>
  }

  const name = (id: string) => pointName(id, device, part.endpoints)
  const cableIndex = new Map(part.cables.map((c, i) => [c.id, i]))
  const cableSummary = (id: string) => {
    const c = part.cables.find((x) => x.id === id)
    return c ? `${name(c.from)} → ${name(c.to)}` : ''
  }

  const port = selected && !isEpPoint(selected) ? device.ports.find((p) => p.id === selected) : undefined
  const endpoint = selected && isEpPoint(selected)
    ? part.endpoints.find((e) => epPointId(e.id) === selected)
    : undefined
  const connected = selected ? part.cables.filter((c) => c.from === selected || c.to === selected) : []
  const cable = part.cables.find((c) => c.id === selectedCable)
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
          endpoints={part.endpoints}
          cables={part.cables}
          annotated={annotated}
          highlighted={highlighted}
          links={scenario?.links}
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
              <p className="text-ink font-semibold">{endpoint.name || 'Unnamed'}</p>
              <p className="text-ink-muted">{endpoint.detail || (endpoint.side === 'source' ? 'Source' : 'Display')}</p>
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
          <p className={`mb-1.5 ${SECTION_LABEL}`}>Cables ({part.cables.length})</p>
          {part.cables.length === 0 ? (
            <p className="text-ink-faint text-xs">
              No cables yet. Add equipment and cables when editing the guide.
            </p>
          ) : (
            <ul className="space-y-1">
              {part.cables.map((c) => (
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
                      style={{ background: cableColor(cableIndex.get(c.id) ?? 0) }}
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

        {part.scenarios.length > 0 && (
          <section>
            <p className={`mb-1.5 ${SECTION_LABEL}`}>Troubleshooting</p>
            <div className="flex flex-wrap gap-1.5">
              {part.scenarios.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={s.id === scenarioId}
                  onClick={() => setScenarioId((cur) => (cur === s.id ? null : s.id))}
                  className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                    s.id === scenarioId
                      ? 'border-rose-400/60 bg-rose-400/15 text-rose-200'
                      : 'border-line bg-surface text-ink-muted hover:border-line-strong hover:text-ink'
                  }`}
                >
                  {s.title || 'Untitled check'}
                </button>
              ))}
            </div>
            {scenario && (
              <p className="text-ink mt-2 text-sm leading-relaxed whitespace-pre-line">{scenario.text}</p>
            )}
          </section>
        )}

        <p className="text-ink-faint text-[11px]">{device.note}</p>
      </aside>
    </div>
  )
}
