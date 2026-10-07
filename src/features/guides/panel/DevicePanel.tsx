import { portCenter, type DeviceDef, type PortDef, type PortKind } from './devices'
import {
  EXT,
  cableColor,
  cableGeometry,
  layoutEquipment,
  pointLookup,
  epPointId,
  sceneBounds,
  type Rect,
} from './scene'
import type { PanelCable, PanelEndpoint } from '../types'

const KIND_CLASS: Record<PortKind, string> = {
  input: 'fill-sky-400/15 stroke-sky-400/60',
  output: 'fill-emerald-400/15 stroke-emerald-400/60',
  network: 'fill-violet-400/15 stroke-violet-400/60',
  control: 'fill-amber-400/15 stroke-amber-400/60',
  power: 'fill-rose-400/15 stroke-rose-400/60',
  audio: 'fill-lime-400/15 stroke-lime-400/60',
}

type DevicePanelProps = {
  device: DeviceDef
  /** Ports that carry a note in this guide: drawn with a small dot. */
  annotated?: ReadonlySet<string>
  /** Ports a troubleshooting check points at: pulsing ring. */
  highlighted?: ReadonlySet<string>
  /** Arcs drawn between ports for the active troubleshooting check. */
  links?: { from: string; to: string }[]
  /** Equipment beside the unit and the cables to it. Omit to draw the unit alone. */
  endpoints?: PanelEndpoint[]
  cables?: PanelCable[]
  /** A port id, or `ep:<id>` for equipment. */
  selected?: string | null
  selectedCable?: string | null
  onPortClick?: (id: string) => void
  onCableClick?: (cableId: string) => void
  /** Visible region. Defaults to the whole scene; the canvas drives it for pan / zoom. */
  viewBox?: Rect
  className?: string
}

const EMPTY_SET: ReadonlySet<string> = new Set()
const NO_ENDPOINTS: PanelEndpoint[] = []
const NO_CABLES: PanelCable[] = []

/** A troubleshooting link as a curve that arcs above both ports. */
function linkPath(a: PortDef, b: PortDef): string {
  const p = portCenter(a)
  const q = portCenter(b)
  const lift = Math.min(p.y, q.y) - 36 - Math.abs(p.x - q.x) * 0.08
  return `M ${p.x} ${p.y} Q ${(p.x + q.x) / 2} ${lift} ${q.x} ${q.y}`
}

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)

/** The rear-panel schematic itself. Purely presentational: callers own all state. */
export function DevicePanel({
  device,
  annotated = EMPTY_SET,
  highlighted = EMPTY_SET,
  links = [],
  endpoints,
  cables = NO_CABLES,
  selected = null,
  selectedCable = null,
  onPortClick,
  onCableClick,
  viewBox,
  className = 'h-auto w-full select-none',
}: DevicePanelProps) {
  const byId = new Map(device.ports.map((p) => [p.id, p]))
  const withEquipment = endpoints !== undefined
  const items = layoutEquipment(device, endpoints ?? NO_ENDPOINTS, cables)
  const locate = pointLookup(device, items)
  const vb = viewBox ?? sceneBounds(device, withEquipment)

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
          onClick: () => onPortClick(id),
          onKeyDown: (e: React.KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onPortClick(id)
            }
          },
        }
      : {}

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
          <rect x={f.x} y={f.y} width={f.w} height={f.h} rx={5} className="fill-surface stroke-line" />
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
              className={isSel ? 'fill-ink/20 stroke-ink' : KIND_CLASS[port.kind]}
              strokeWidth={isSel ? 2.5 : 1.5}
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

      {withEquipment && (
        <>
          <text x={-EXT + 20} y={24} className="fill-ink-faint text-[11px] font-bold tracking-widest uppercase">
            Sources
          </text>
          <text x={device.width + 80} y={24} className="fill-ink-faint text-[11px] font-bold tracking-widest uppercase">
            Displays
          </text>
          {items.map(({ endpoint: e, x, y, w, h }) => {
            const id = epPointId(e.id)
            const isSel = selected === id
            const tone = e.side === 'source' ? 'stroke-sky-400/70' : 'stroke-emerald-400/70'
            return (
              <g
                key={e.id}
                aria-label={e.name || e.side}
                {...press(id)}
                className={onPortClick ? 'cursor-pointer outline-none' : undefined}
              >
                <rect
                  x={x}
                  y={y}
                  width={w}
                  height={h}
                  rx={8}
                  className={`fill-surface ${isSel ? 'stroke-ink' : tone}`}
                  strokeWidth={isSel ? 2.5 : 1.5}
                />
                <text x={x + 12} y={y + 14} className="fill-ink-faint text-[8px] font-bold tracking-widest uppercase">
                  {e.side}
                </text>
                <text x={x + 12} y={y + 31} className="fill-ink text-[13px] font-semibold">
                  {clip(e.name || 'Unnamed', 26)}
                </text>
                {e.detail && (
                  <text x={x + 12} y={y + 45} className="fill-ink-muted text-[10px]">
                    {clip(e.detail, 36)}
                  </text>
                )}
              </g>
            )
          })}
        </>
      )}

      {cables.map((c, i) => {
        const a = locate(c.from)
        const b = locate(c.to)
        if (!a || !b) return null
        const { d, mid } = cableGeometry(a, b)
        const color = cableColor(i)
        const emphasised = touches(c)
        const dim = hasFocus && anyTouched && !emphasised
        return (
          <g
            key={c.id}
            opacity={dim ? 0.18 : 1}
            className={onCableClick ? 'cursor-pointer' : undefined}
            onClick={onCableClick ? () => onCableClick(c.id) : undefined}
          >
            <path d={d} fill="none" stroke="transparent" strokeWidth={14} />
            <path d={d} fill="none" className="stroke-canvas" strokeWidth={emphasised ? 6.5 : 5} strokeLinecap="round" />
            <path d={d} fill="none" stroke={color} strokeWidth={emphasised ? 3.5 : 2.5} strokeLinecap="round" />
            <circle cx={a.x} cy={a.y} r={4} fill={color} className="stroke-canvas" strokeWidth={1.5} />
            <circle cx={b.x} cy={b.y} r={4} fill={color} className="stroke-canvas" strokeWidth={1.5} />
            {c.label && (
              <text
                x={mid.x}
                y={mid.y - 6}
                textAnchor="middle"
                className="fill-ink stroke-canvas text-[11px] font-semibold"
                strokeWidth={4}
                paintOrder="stroke"
              >
                {c.label}
              </text>
            )}
          </g>
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
