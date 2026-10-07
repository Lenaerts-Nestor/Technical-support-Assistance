import { XIcon } from '../components/icons'
import { epPointId, pointName } from '../panel/scene'
import type { DeviceDef, SlotDef } from '../panel/devices'
import { DELETE_BTN, GHOST_BTN, INPUT, SELECT } from '../../../shared/ui/styles'
import type { PanelAction, PanelCable, PanelEndpoint } from '../types'

const uid = () => crypto.randomUUID()

type Props = {
  actions: PanelAction[]
  onChange: (actions: PanelAction[]) => void
  device: DeviceDef
  endpoints: PanelEndpoint[]
  inputSlots: SlotDef[]
  /** Cables as they are going into this step: what can be pulled out. */
  cablesBefore: PanelCable[]
  portOptions: React.ReactNode
}

const LABEL: Record<PanelAction['type'], string> = {
  'swap-cards': 'Swap cards',
  'swap-units': 'Swap units',
  unplug: 'Unplug cable',
  plug: 'Plug in cable',
}

/** What happens to the setup in one troubleshooting step. */
export function StepActionsEdit({ actions, onChange, device, endpoints, inputSlots, cablesBefore, portOptions }: Props) {
  const patch = (id: string, fields: Partial<PanelAction>) =>
    onChange(actions.map((a) => (a.id === id ? ({ ...a, ...fields } as PanelAction) : a)))
  const unitOptions = endpoints.map((e) => (
    <option key={e.id} value={e.id}>
      {pointName(epPointId(e.id), device, endpoints)}
    </option>
  ))
  const slotOptions = inputSlots.map((s) => (
    <option key={s.id} value={s.id}>
      {s.label}
    </option>
  ))

  const add = (type: PanelAction['type']) => {
    const id = uid()
    const first = device.ports[0]?.id ?? ''
    const next: PanelAction =
      type === 'swap-cards'
        ? { id, type, from: inputSlots[0]?.id ?? '', to: inputSlots[1]?.id ?? '' }
        : type === 'swap-units'
          ? { id, type, a: endpoints[0]?.id ?? '', b: endpoints[1]?.id ?? '' }
          : type === 'unplug'
            ? { id, type, cableId: cablesBefore[0]?.id ?? '' }
            : { id, type, cableId: uid(), from: first, to: endpoints[0] ? epPointId(endpoints[0].id) : first, label: '' }
    onChange([...actions, next])
  }

  const cableName = (c: PanelCable) =>
    `${pointName(c.from, device, endpoints)} → ${pointName(c.to, device, endpoints)}${c.label ? ` (${c.label})` : ''}`

  return (
    <div className="mt-2 space-y-1.5">
      {actions.map((a) => (
        <div key={a.id} className="flex flex-wrap items-center gap-1.5 rounded-md border border-amber-400/30 bg-amber-400/5 px-2 py-1.5 text-xs">
          <span className="font-semibold text-amber-200">{LABEL[a.type]}</span>
          {a.type === 'swap-cards' && (
            <>
              <select value={a.from} onChange={(e) => patch(a.id, { from: e.target.value })} className={SELECT}>
                {slotOptions}
              </select>
              <span className="text-ink-faint">⇄</span>
              <select value={a.to} onChange={(e) => patch(a.id, { to: e.target.value })} className={SELECT}>
                {slotOptions}
              </select>
              <span className="text-ink-faint">cables follow the cards</span>
            </>
          )}
          {a.type === 'swap-units' && (
            <>
              <select value={a.a} onChange={(e) => patch(a.id, { a: e.target.value })} className={SELECT}>
                {unitOptions}
              </select>
              <span className="text-ink-faint">⇄</span>
              <select value={a.b} onChange={(e) => patch(a.id, { b: e.target.value })} className={SELECT}>
                {unitOptions}
              </select>
              <span className="text-ink-faint">cables stay in place</span>
            </>
          )}
          {a.type === 'unplug' && (
            <select value={a.cableId} onChange={(e) => patch(a.id, { cableId: e.target.value })} className={`${SELECT} max-w-72`}>
              {!cablesBefore.some((c) => c.id === a.cableId) && <option value={a.cableId}>(cable no longer exists)</option>}
              {cablesBefore.map((c) => (
                <option key={c.id} value={c.id}>
                  {cableName(c)}
                </option>
              ))}
            </select>
          )}
          {a.type === 'plug' && (
            <>
              <select value={a.from} onChange={(e) => patch(a.id, { from: e.target.value })} className={`${SELECT} max-w-44`}>
                {portOptions}
              </select>
              <span className="text-ink-faint">→</span>
              <select value={a.to} onChange={(e) => patch(a.id, { to: e.target.value })} className={`${SELECT} max-w-44`}>
                {portOptions}
              </select>
              <div className="w-32">
                <input value={a.label} onChange={(e) => patch(a.id, { label: e.target.value })} placeholder="Label" className={INPUT} />
              </div>
            </>
          )}
          <span className="flex-1" />
          <button type="button" aria-label="Remove action" onClick={() => onChange(actions.filter((x) => x.id !== a.id))} className={`${DELETE_BTN} p-1`}>
            <XIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-ink-faint text-[11px]">This step:</span>
        {(Object.keys(LABEL) as PanelAction['type'][]).map((t) => (
          <button key={t} type="button" onClick={() => add(t)} className={GHOST_BTN}>
            + {LABEL[t]}
          </button>
        ))}
      </div>
    </div>
  )
}
