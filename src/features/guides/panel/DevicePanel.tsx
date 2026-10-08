import { portCenter, type DeviceDef, type PortDef, type PortKind } from './devices'
import {
  EP_W,
  cableColor,
  deviceBounds,
  epPointId,
  isHubLink,
  layoutScene,
  pointSignal,
  routeCable,
  type Pt,
  type Rect,
} from './scene'
import { SIGNAL_COLOR, getUnitKind, getUnitModel } from './units'
import type { PanelCable, PanelEndpoint } from '../types'

const KIND_CLASS: Record<PortKind, string> = {
  input: 'fill-sky-400/15 stroke-sky-400/60',
  output: 'fill-emerald-400/15 stroke-emerald-400/60',
  network: 'fill-violet-400/15 stroke-violet-400/60',
  control: 'fill-amber-400/15 stroke-amber-400/60',
  power: 'fill-rose-400/15 stroke-rose-400/60',
  audio: 'fill-lime-400/15 stroke-lime-400/60',
}

export type Pending = {
  from: Pt
  to: Pt
  /** The point the pointer is over, if any. */
  target: string | null
  /** Whether dropping here would make a valid cable; null while over nothing. */
  ok: boolean | null
  reason?: string
}

type DevicePanelProps = {
  device: DeviceDef
  /** Ports that carry a note in this guide: drawn with a small dot. */
  annotated?: ReadonlySet<string>
  /** Ports a troubleshooting check points at: pulsing ring. */
  highlighted?: ReadonlySet<string>
  /** Arcs drawn between ports for the active troubleshooting check. */
  links?: { from: string; to: string }[]
  /** Units on the panel and the cables to them. Omit to draw the chassis alone. */
  endpoints?: PanelEndpoint[]
  cables?: PanelCable[]
  /** Card swaps to show for the current step: an arrow between the two slots. */
  moves?: { from: string; to: string }[]
  /** Show a "+" on plain boxes (without ports) to drag a cable from. */
  connectable?: boolean
  /** A cable being dragged, and what it is hovering over. */
  pending?: Pending | null
  /** A point id: chassis port, `ep:<unit>:<port>`, or `ep:<unit>` for a box. */
  selected?: string | null
  selectedCable?: string | null
  onPortClick?: (id: string, e: React.MouseEvent | React.KeyboardEvent) => void
  onCableClick?: (cableId: string) => void
  /** Cables the current step pulled out (drawn as ghosts) or plugged in (pulsing). */
  ghostCables?: PanelCable[]
  freshCables?: ReadonlySet<string>
  /** Visible region. Defaults to the whole scene; the canvas drives it for pan / zoom. */
  viewBox?: Rect
  className?: string
}

const EMPTY_SET: ReadonlySet<string> = new Set()
const NO_ENDPOINTS: PanelEndpoint[] = []
const NO_CABLES: PanelCable[] = []
const NO_MOVES: { from: string; to: string }[] = []

/** A troubleshooting link as a curve that arcs above both ports. */
function linkPath(a: PortDef, b: PortDef): string {
  const p = portCenter(a)
  const q = portCenter(b)
  const lift = Math.min(p.y, q.y) - 36 - Math.abs(p.x - q.x) * 0.08
  return `M ${p.x} ${p.y} Q ${(p.x + q.x) / 2} ${lift} ${q.x} ${q.y}`
}

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)

/** The panel itself: the chassis (if any), the units with their ports, and every cable. Purely presentational. */
export function DevicePanel({
  device,
  annotated = EMPTY_SET,
  highlighted = EMPTY_SET,
  links = [],
  endpoints,
  cables = NO_CABLES,
  moves = NO_MOVES,
  ghostCables = NO_CABLES,
  freshCables = EMPTY_SET,
  connectable = false,
  pending = null,
  selected = null,
  selectedCable = null,
  onPortClick,
  onCableClick,
  viewBox,
  className = 'h-auto w-full select-none',
}: DevicePanelProps) {
  const byId = new Map(device.ports.map((p) => [p.id, p]))
  const withUnits = endpoints !== undefined
  const scene = layoutScene(device, endpoints ?? NO_ENDPOINTS, cables)
  const items = scene.items
  const vb = viewBox ?? (withUnits ? scene.bounds : deviceBounds(device))
  const movedSlots = new Set(moves.flatMap((m) => [m.from, m.to]))
  const frameBySlot = new Map(device.frames.filter((f) => f.slotId).map((f) => [f.slotId!, f]))
  const usedPoints = new Set(cables.flatMap((c) => [c.from, c.to]))

  // With a selection, cables that don't touch it step back so the one in focus reads.
  const touches = (c: PanelCable) =>
    c.id === selectedCable || (selected !== null && (c.from === selected || c.to === selected))
  const hasFocus = selectedCable !== null || selected !== null
  const anyTouched = cables.some(touches)

  const press = (id: string) =>
    onPortClick
      ? {
          role: 'button' as const,
          tabIndex: 0,
          'aria-pressed': selected === id,
          'data-point-id': id,
          onClick: (e: React.MouseEvent) => onPortClick(id, e),
          onKeyDown: (e: React.KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onPortClick(id, e)
            }
          },
        }
      : { 'data-point-id': id }

  const dropStroke = (id: string) =>
    pending?.target === id && pending.ok !== null ? (pending.ok ? '#34d399' : '#fb7185') : null

  return (
    <svg
      viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
      role="group"
      aria-label={`${device.name} rear panel`}
      className={className}
    >
      <defs>
        <marker
          id="panel-arrow"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M0 0 10 5 0 10z" fill="#f0a542" />
        </marker>
      </defs>

      {!device.freestyle && (
        <>
          <rect
            x={1}
            y={1}
            width={device.width - 2}
            height={device.height - 2}
            rx={10}
            className="fill-canvas stroke-line-strong"
            strokeWidth={2}
          />
          <text x={24} y={26} className="fill-ink-muted text-[13px] font-semibold">
            {device.name} · rear
          </text>
        </>
      )}

      {device.zones.map((z) => (
        <g key={z.label}>
          <rect
            x={z.x}
            y={z.y}
            width={z.w}
            height={z.h}
            rx={6}
            className="fill-none stroke-line"
            strokeDasharray="4 4"
          />
          <text
            x={z.x + 10}
            y={z.y + 16}
            className="fill-ink-faint text-[10px] font-bold tracking-widest uppercase"
          >
            {z.label}
          </text>
        </g>
      ))}

      {device.frames.map((f, i) => (
        <g key={i}>
          <rect
            x={f.x}
            y={f.y}
            width={f.w}
            height={f.h}
            rx={5}
            className={
              f.slotId && movedSlots.has(f.slotId) ? 'fill-amber-400/10 stroke-amber-400' : 'fill-surface stroke-line'
            }
            strokeWidth={f.slotId && movedSlots.has(f.slotId) ? 2 : 1}
          />
          {f.title && (
            <text
              x={f.titleAnchor === 'middle' ? f.x + f.w / 2 : f.x + f.w - 8}
              y={f.titleY ?? f.y + f.h - 8}
              textAnchor={f.titleAnchor ?? 'end'}
              className="fill-ink-faint text-[9px] font-semibold"
            >
              {f.title}
            </text>
          )}
        </g>
      ))}

      {device.texts.map((t, i) => (
        <text
          key={i}
          x={t.x}
          y={t.y}
          textAnchor={t.anchor ?? 'start'}
          fontSize={t.size ?? 10}
          className="fill-ink-faint font-bold tracking-wider"
        >
          {t.text}
        </text>
      ))}

      {device.ports.map((port) => {
        const isHot = highlighted.has(port.id)
        const isSel = selected === port.id
        const drop = dropStroke(port.id)
        return (
          <g
            key={port.id}
            aria-label={port.label}
            {...press(port.id)}
            className={onPortClick ? 'cursor-pointer outline-none [&:focus-visible>rect:first-child]:stroke-ink' : undefined}
          >
            {isHot && (
              <rect
                x={port.x - 4}
                y={port.y - 4}
                width={port.w + 8}
                height={port.h + 8}
                rx={7}
                className="animate-pulse fill-rose-400/25 stroke-rose-400"
                strokeWidth={2.5}
              />
            )}
            <rect
              x={port.x}
              y={port.y}
              width={port.w}
              height={port.h}
              rx={4}
              className={isSel ? 'fill-ink/20 stroke-ink' : drop ? 'fill-ink/10' : KIND_CLASS[port.kind]}
              stroke={drop ?? undefined}
              strokeWidth={isSel || drop ? 2.5 : 1.5}
            />
            <text
              x={port.x + port.w / 2}
              y={port.y + port.h / 2 + 3.5}
              textAnchor="middle"
              className="fill-ink text-[10px] font-semibold"
            >
              {port.short}
            </text>
            {annotated.has(port.id) && (
              <circle cx={port.x + port.w - 4} cy={port.y + 4} r={5} className="fill-brand stroke-canvas" strokeWidth={1.5} />
            )}
          </g>
        )
      })}

      {withUnits && !device.freestyle && (
        <>
          {items.some((i) => i.endpoint.side === 'source') && (
            <text x={-(EP_W + 80)} y={24} className="fill-ink-faint text-[11px] font-bold tracking-widest uppercase">
              Sources
            </text>
          )}
          {items.some((i) => i.endpoint.side === 'display') && (
            <text x={device.width + 80} y={24} className="fill-ink-faint text-[11px] font-bold tracking-widest uppercase">
              Displays
            </text>
          )}
        </>
      )}

      {items.map(({ endpoint: e, x, y, w, h, lines, ports, sections }) => {
        const id = epPointId(e.id)
        const isSel = selected === id
        const drop = dropStroke(id)
        const kind = getUnitKind(e.kind)
        const model = getUnitModel(e.kind, e.model)
        const title = ports.length > 0 && model ? `${kind.label} · ${model.name}` : kind.label
        return (
          <g key={e.id}>
            <g
              aria-label={e.name || kind.label}
              {...press(id)}
              className={onPortClick ? 'cursor-pointer outline-none' : undefined}
            >
              <rect
                x={x}
                y={y}
                width={w}
                height={h}
                rx={8}
                className="fill-surface"
                stroke={drop ?? (isSel ? '#f0a542' : kind.color)}
                strokeOpacity={isSel || drop ? 1 : 0.7}
                strokeWidth={isSel || drop ? 3 : 1.5}
              />
              <g transform={`translate(${x + 10} ${y + 6}) scale(0.7)`} fill="none" stroke={kind.color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                <path d={kind.icon} />
              </g>
              <text x={x + 32} y={y + 17} className="fill-ink-faint text-[8px] font-bold tracking-widest uppercase">
                {clip(title, 34)}
              </text>
              <text x={x + 12} y={y + 35} className="fill-ink text-[13px] font-semibold">
                {clip(e.name || 'Unnamed', 26)}
              </text>
              {e.detail && (
                <text x={x + 12} y={y + 48} className="fill-ink-muted text-[10px]">
                  {clip(e.detail, 36)}
                </text>
              )}
              {lines.map((line, i) => (
                <text key={i} x={x + 12} y={y + 62 + i * 13} className="fill-ink-muted text-[10px]">
                  {clip(line, 38)}
                </text>
              ))}
            </g>

            {sections.map((sec) => (
              <g key={sec.label} className="pointer-events-none">
                <text x={x + 10} y={sec.y} className="fill-ink-faint text-[8px] font-bold tracking-widest uppercase">
                  {sec.label}
                </text>
                <line x1={x + 12 + sec.label.length * 6.2} x2={x + w - 10} y1={sec.y - 3} y2={sec.y - 3} className="stroke-line" strokeWidth={1} />
              </g>
            ))}

            {ports.map((p) => {
              const color = SIGNAL_COLOR[p.spec.signal]
              const isPortSel = selected === p.id
              const portDrop = dropStroke(p.id)
              const used = usedPoints.has(p.id)
              const left = p.dir === -1
              return (
                <g
                  key={p.id}
                  aria-label={`${e.name || kind.label}: ${p.spec.label}`}
                  {...press(p.id)}
                  className={onPortClick ? 'cursor-crosshair outline-none' : undefined}
                >
                  {highlighted.has(p.id) && (
                    <rect
                      x={p.x - 3}
                      y={p.y - 3}
                      width={p.w + 6}
                      height={p.h + 6}
                      rx={6}
                      className="animate-pulse fill-rose-400/25 stroke-rose-400"
                      strokeWidth={2}
                    />
                  )}
                  <rect
                    x={p.x}
                    y={p.y}
                    width={p.w}
                    height={p.h}
                    rx={4}
                    fill={color}
                    fillOpacity={isPortSel || portDrop ? 0.3 : 0.15}
                    stroke={portDrop ?? (isPortSel ? '#ffffff' : color)}
                    strokeOpacity={isPortSel || portDrop ? 1 : 0.6}
                    strokeWidth={isPortSel || portDrop ? 2.5 : 1.2}
                  />
                  <text
                    x={p.x + p.w / 2 + (left ? 3 : -3)}
                    y={p.y + p.h / 2 + 3.3}
                    textAnchor="middle"
                    className="fill-ink text-[10px] font-semibold"
                  >
                    {p.spec.label}
                  </text>
                  <circle
                    cx={p.anchor.x}
                    cy={p.anchor.y}
                    r={5}
                    fill={used ? color : '#1a1a1c'}
                    stroke={color}
                    strokeWidth={1.8}
                  />
                  {annotated.has(p.id) && (
                    <circle cx={left ? p.x + p.w - 3 : p.x + 3} cy={p.y + 3} r={4} className="fill-brand stroke-canvas" strokeWidth={1.2} />
                  )}
                </g>
              )
            })}
          </g>
        )
      })}

      {cables.map((c, i) => {
        const route = routeCable(device, items, c, i)
        if (!route) return null
        const color = cableColor(i)
        const emphasised = touches(c)
        const dim = hasFocus && anyTouched && !emphasised
        // A stream is a logical link over the network, not a wire: dashed and flowing.
        const isStream = pointSignal(c.from, endpoints ?? NO_ENDPOINTS) === 'stream' || pointSignal(c.to, endpoints ?? NO_ENDPOINTS) === 'stream'
        // A link to a switch as a whole is a network path rather than a wire: dashed, in the LAN colour.
        const isPath = !isStream && isHubLink(c, endpoints ?? NO_ENDPOINTS)
        const stroke = isStream ? SIGNAL_COLOR.stream : isPath ? SIGNAL_COLOR.lan : color
        const label = c.label || (isStream ? 'Stream' : '')
        return (
          <g
            key={c.id}
            opacity={dim ? 0.18 : 1}
            className={`${onCableClick ? 'cursor-pointer' : ''} ${freshCables.has(c.id) ? 'animate-pulse' : ''}`}
            onClick={onCableClick ? () => onCableClick(c.id) : undefined}
          >
            <path d={route.d} fill="none" stroke="transparent" strokeWidth={14} />
            <path d={route.d} fill="none" className="stroke-canvas" strokeWidth={emphasised ? 6.5 : 5} strokeLinecap="round" />
            <path
              d={route.d}
              fill="none"
              stroke={stroke}
              strokeWidth={emphasised ? 3.5 : 2.5}
              strokeLinecap="round"
              strokeDasharray={isStream ? '9 6' : isPath ? '2 7' : undefined}
              className={isStream ? 'panel-link' : undefined}
            />
            <circle cx={route.ends[0].x} cy={route.ends[0].y} r={3.5} fill={stroke} className="stroke-canvas" strokeWidth={1.2} />
            <circle cx={route.ends[1].x} cy={route.ends[1].y} r={3.5} fill={stroke} className="stroke-canvas" strokeWidth={1.2} />
            {label && (
              <text
                x={route.label.x}
                y={route.label.y}
                textAnchor={route.label.anchor}
                className="fill-ink stroke-canvas text-[11px] font-semibold"
                strokeWidth={4}
                paintOrder="stroke"
              >
                {clip(label, 16)}
              </text>
            )}
          </g>
        )
      })}

      {ghostCables.map((c, i) => {
        const route = routeCable(device, items, c, cables.length + i)
        if (!route) return null
        return (
          <g key={`ghost-${c.id}`} className="pointer-events-none">
            <path d={route.d} fill="none" stroke="#fb7185" strokeWidth={3} strokeDasharray="3 7" strokeLinecap="round" opacity={0.85} />
            <g transform={`translate(${route.label.x} ${route.label.y - 4})`}>
              <circle r={9} className="fill-canvas stroke-rose-400" strokeWidth={2} />
              <path d="M -3.5 -3.5 L 3.5 3.5 M 3.5 -3.5 L -3.5 3.5" className="stroke-rose-400" strokeWidth={2} strokeLinecap="round" />
            </g>
          </g>
        )
      })}

      {connectable &&
        items
          .filter((i) => i.ports.length === 0)
          .map(({ endpoint: e, inner }) => (
            <g key={e.id} data-handle={epPointId(e.id)} className="cursor-crosshair">
              <circle cx={inner.x} cy={inner.y} r={11} className="fill-brand stroke-canvas" strokeWidth={2} />
              <path
                d={`M ${inner.x - 5} ${inner.y} H ${inner.x + 5} M ${inner.x} ${inner.y - 5} V ${inner.y + 5}`}
                className="stroke-on-brand pointer-events-none"
                strokeWidth={2.2}
                strokeLinecap="round"
              />
              <title>Drag to a port or another box to connect a cable</title>
            </g>
          ))}

      {pending && (
        <g className="pointer-events-none">
          <path
            d={`M ${pending.from.x} ${pending.from.y} L ${pending.to.x} ${pending.to.y}`}
            stroke={pending.ok === false ? '#fb7185' : '#f0a542'}
            strokeWidth={3}
            strokeDasharray="7 5"
            strokeLinecap="round"
            fill="none"
          />
          {pending.ok === false && pending.reason && (
            <text
              x={pending.to.x + 14}
              y={pending.to.y - 12}
              className="fill-rose-300 stroke-canvas text-[12px] font-semibold"
              strokeWidth={4}
              paintOrder="stroke"
            >
              ✕ {clip(pending.reason, 64)}
            </text>
          )}
          {pending.ok === true && (
            <text
              x={pending.to.x + 14}
              y={pending.to.y - 12}
              className="fill-emerald-300 stroke-canvas text-[12px] font-semibold"
              strokeWidth={4}
              paintOrder="stroke"
            >
              ✓ connect
            </text>
          )}
        </g>
      )}

      {moves.map((m, i) => {
        const a = frameBySlot.get(m.from)
        const b = frameBySlot.get(m.to)
        if (!a || !b) return null
        const p = { x: a.x + a.w / 2, y: a.y + a.h / 2 }
        const q = { x: b.x + b.w / 2, y: b.y + b.h / 2 }
        const bend = p.x === q.x ? 90 : 0
        return (
          <path
            key={i}
            d={`M ${p.x} ${p.y} Q ${(p.x + q.x) / 2 + bend} ${(p.y + q.y) / 2} ${q.x} ${q.y}`}
            fill="none"
            stroke="#f0a542"
            strokeWidth={4}
            strokeDasharray="10 7"
            markerEnd="url(#panel-arrow)"
            className="panel-link pointer-events-none"
          />
        )
      })}

      {links.map((l, i) => {
        const a = byId.get(l.from)
        const b = byId.get(l.to)
        if (!a || !b || a === b) return null
        return (
          <path
            key={`${l.from}-${l.to}-${i}`}
            d={linkPath(a, b)}
            fill="none"
            stroke="#f0a542"
            strokeWidth={3}
            strokeDasharray="8 6"
            markerEnd="url(#panel-arrow)"
            className="panel-link pointer-events-none"
          />
        )
      })}
    </svg>
  )
}
