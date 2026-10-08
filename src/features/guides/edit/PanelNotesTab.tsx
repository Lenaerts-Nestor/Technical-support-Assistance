import { TrashIcon } from '../components/icons'
import { DELETE_BTN } from '../../../shared/ui/styles'
import { AutoTextarea, Field, INPUT } from './fields'
import type { PanelAnnotation } from '../types'

type Props = {
  annotations: PanelAnnotation[]
  activeNote: string | null
  portName: (id: string) => string
  onPatch: (id: string, fields: Partial<PanelAnnotation>) => void
  onRemove: (id: string) => void
  /** Pan the diagram to the port's unit. */
  onLocate: (portId: string) => void
}

/** The note attached to each port: a short label and what to know about it. */
export function PanelNotesTab({ annotations, activeNote, portName, onPatch, onRemove, onLocate }: Props) {
  if (annotations.length === 0) {
    return (
      <p className="text-ink-faint text-sm">
        No notes yet. Click a port on the diagram to attach one — readers see it when they click that port.
      </p>
    )
  }
  return (
    <div className="space-y-3">
      {annotations.map((a) => (
        <div
          key={a.id}
          className={`bg-surface rounded-lg border p-3 ${activeNote === a.id ? 'border-fuchsia-400/60' : 'border-line'}`}
        >
          <div className="mb-2.5 flex items-center gap-2">
            <span className="text-ink-faint text-xs font-semibold">Port</span>
            <button
              type="button"
              onClick={() => onLocate(a.portId)}
              title="Show on the diagram"
              className="text-ink min-w-0 flex-1 truncate text-left text-sm font-semibold underline-offset-2 hover:underline"
            >
              {portName(a.portId)}
            </button>
            <button
              type="button"
              aria-label="Delete note"
              title="Delete note"
              onClick={() => onRemove(a.id)}
              className={`${DELETE_BTN} p-1`}
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-3">
            <Field label="Short label" hint="shown in bold before the note">
              <input
                value={a.label}
                onChange={(e) => onPatch(a.id, { label: e.target.value })}
                placeholder="e.g. Boardroom display"
                className={INPUT}
              />
            </Field>
            <Field label="Note">
              <AutoTextarea
                value={a.note}
                onChange={(e) => onPatch(a.id, { note: e.target.value })}
                placeholder="What to know about this port: cable type, what's plugged in, common problems…"
                rows={2}
              />
            </Field>
          </div>
        </div>
      ))}
    </div>
  )
}
