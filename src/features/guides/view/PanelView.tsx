import { useMemo, useState } from 'react'
import { PanelIcon } from '../components/icons'
import { DevicePanel } from '../panel/DevicePanel'
import { KIND_DOT, PORT_KIND_LABEL, getDevice } from '../panel/devices'
import { GHOST_BTN } from '../../../shared/ui/styles'
import { useOpenPanelWorkspace } from './panelWorkspaceContext'
import type { PanelPart } from '../types'

/**
 * Interactive rear-panel block. Collapsed it is a one-line card with a button;
 * opened it shows the diagram, a port-detail strip, and the troubleshooting
 * checks that highlight ports and draw lines between them.
 */
export function PanelView({ part }: { part: PanelPart }) {
  const device = useMemo(() => getDevice(part.deviceId, part.cards), [part.deviceId, part.cards])
  const [open, setOpen] = useState(false)
  const openWorkspace = useOpenPanelWorkspace()
  const [selected, setSelected] = useState<string | null>(null)
  const [scenarioId, setScenarioId] = useState<string | null>(null)

  const annotations = useMemo(
    () => new Map(part.annotations.map((a) => [a.portId, a])),
    [part.annotations],
  )
  const annotated = useMemo(() => new Set(annotations.keys()), [annotations])
  const scenario = part.scenarios.find((s) => s.id === scenarioId) ?? null
  const highlighted = useMemo(() => new Set(scenario?.portIds ?? []), [scenario])

  const title = part.title || device?.name || 'Panel diagram'
  const checks = part.scenarios.length
  const port = device?.ports.find((p) => p.id === selected)
  const note = selected ? annotations.get(selected) : undefined

  return (
    <div className="rounded-xl border border-fuchsia-400/30 border-l-[3px] border-l-fuchsia-400 bg-fuchsia-400/8">
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="rounded-md bg-fuchsia-400/20 px-1.5 py-0.5 text-[10px] font-bold tracking-[0.06em] text-fuchsia-200 uppercase">
          Panel
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-ink truncate text-sm font-semibold">{title}</h3>
          <p className="text-ink-faint text-xs">
            {[
              part.title || !device ? (device?.name ?? 'Unknown device') : 'Rear panel',
              checks > 0 && `${checks} troubleshooting check${checks === 1 ? '' : 's'}`,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
        {openWorkspace && (
          <button type="button" onClick={() => openWorkspace(part.id)} className={GHOST_BTN}>
            Open full view
          </button>
        )}
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className={GHOST_BTN}>
          <PanelIcon className="h-3.5 w-3.5" />
          {open ? 'Hide diagram' : 'Show diagram'}
        </button>
      </div>

      {open && (
        <div className="border-t border-fuchsia-400/20 px-4 pt-3 pb-4">
          {!device ? (
            <p className="text-ink-muted text-sm">
              This panel uses a device template (“{part.deviceId}”) that isn't available.
            </p>
          ) : (
            <>
              <DevicePanel
                device={device}
                annotated={annotated}
                highlighted={highlighted}
                links={scenario?.links}
                selected={selected}
                onPortClick={(id) => setSelected((s) => (s === id ? null : id))}
              />

              <div className="text-ink-muted mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                {(['input', 'output', 'audio', 'network', 'control', 'power'] as const)
                  .filter((k) => device.ports.some((p) => p.kind === k))
                  .map((k) => (
                    <span key={k} className="inline-flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${KIND_DOT[k]}`} />
                      {PORT_KIND_LABEL[k]}
                    </span>
                  ))}
                {annotated.size > 0 && (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="bg-brand h-2 w-2 rounded-full" />
                    Has a note
                  </span>
                )}
              </div>

              <div className="border-line bg-canvas mt-3 min-h-[3.25rem] rounded-lg border px-3 py-2.5 text-sm">
                {port ? (
                  <>
                    <p className="text-ink font-semibold">
                      {port.label}
                      <span className="text-ink-faint ml-2 text-xs font-normal">
                        {PORT_KIND_LABEL[port.kind]}
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
                  </>
                ) : (
                  <p className="text-ink-faint text-xs">Click a port to see what it's for.</p>
                )}
              </div>

              {checks > 0 && (
                <div className="mt-3">
                  <p className="text-ink-muted mb-1.5 text-[11px] font-semibold tracking-[0.08em] uppercase">
                    Troubleshooting
                  </p>
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
                    <p className="text-ink mt-2 text-sm leading-relaxed whitespace-pre-line">
                      {scenario.text}
                    </p>
                  )}
                </div>
              )}

              <p className="text-ink-faint mt-3 text-[11px]">{device.note}</p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
