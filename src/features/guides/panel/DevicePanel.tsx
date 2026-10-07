import { portCenter, type DeviceDef, type PortDef, type PortKind } from './devices'


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
  /** Lines drawn between ports for the active check. */
  links?: { from: string; to: string }[]
  selected?: string | null
  onPortClick?: (portId: string) => void
}

const EMPTY_SET: ReadonlySet<string> = new Set()

/** A link as a curve that arcs above both ports, so it never cuts across other ports. */
function linkPath(a: PortDef, b: PortDef): string {
  const p = portCenter(a)
  const q = portCenter(b)
  const lift = Math.min(p.y, q.y) - 36 - Math.abs(p.x - q.x) * 0.08
  return `M ${p.x} ${p.y} Q ${(p.x + q.x) / 2} ${lift} ${q.x} ${q.y}`
}

/** The rear-panel schematic itself. Purely presentational: callers own all state. */
export function DevicePanel({
  device,
  annotated = EMPTY_SET,
  highlighted = EMPTY_SET,
  links = [],
  selected = null,
  onPortClick,
}: DevicePanelProps) {
  const byId = new Map(device.ports.map((p) => [p.id, p]))

  return (
    <svg
      viewBox={`0 0 ${device.width} ${device.height}`}
      role="group"
      aria-label={`${device.name} rear panel`}
      className="h-auto w-full select-none"
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
      <text x={24} y={28} className="fill-ink-muted text-[13px] font-semibold">
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
            role={onPortClick ? 'button' : undefined}
            tabIndex={onPortClick ? 0 : undefined}
            aria-label={port.label}
            aria-pressed={onPortClick ? isSel : undefined}
            onClick={onPortClick ? () => onPortClick(port.id) : undefined}
            onKeyDown={
              onPortClick
                ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onPortClick(port.id)
                    }
                  }
                : undefined
            }
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
