import { useMemo, useState } from 'react'
import { PanelIcon } from '../components/icons'
import { DevicePanel } from '../panel/DevicePanel'
import { KIND_DOT, PORT_KIND_LABEL } from '../panel/devices'
import { usePanelFlow } from '../panel/usePanelFlow'
import { GHOST_BTN } from '../../../shared/ui/styles'
import { PanelFlowBox } from './PanelFlowBox'
import { useOpenPanelWorkspace } from './panelWorkspaceContext'
import type { PanelPart } from '../types'

/**
 * Interactive rear-panel block. Collapsed it is a one-line card with a button;
 * opened it shows the diagram, a port-detail strip, and the troubleshooting
 * flow. The full-size view with equipment and cables is a separate tab.
 */
export function PanelView({ part }: { part: PanelPart }) {
  const flow = usePanelFlow(part)
  const { device } = flow
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const openWorkspace = useOpenPanelWorkspace()

  const annotations = useMemo(
    () => new Map(part.annotations.map((a) => [a.portId, a])),
    [part.annotations],
  )
  const annotated = useMemo(() => new Set(annotations.keys()), [annotations])

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
                highlighted={flow.highlighted}
                links={flow.links}
                moves={flow.moves}
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

              <div className="mt-3">
                <PanelFlowBox part={part} flow={flow} />
              </div>

              <p className="text-ink-faint mt-3 text-[11px]">{device.note}</p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
