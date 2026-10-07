import { UNIT_KINDS, getUnitKind } from '../panel/units'

/** The 24×24 stroke icon of a unit kind, tinted with its colour. */
export function UnitIcon({ kind, className = 'h-5 w-5' }: { kind: string; className?: string }) {
  const k = getUnitKind(kind)
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke={k.color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={k.icon} />
    </svg>
  )
}

/**
 * A visual menu of the unit types: click one to add it. `canPick` greys out the
 * ones that have nothing to plug into (e.g. no HDMI port to take an HDMI cable).
 */
export function UnitPicker({
  onPick,
  canPick,
}: {
  onPick: (kindId: string) => void
  canPick?: (kindId: string) => boolean
}) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {UNIT_KINDS.filter((k) => !k.legacy).map((k) => {
        const ok = canPick ? canPick(k.id) : true
        return (
          <button
            key={k.id}
            type="button"
            disabled={!ok}
            title={ok ? undefined : 'Nothing on this unit takes that cable'}
            onClick={() => onPick(k.id)}
            className="border-line bg-canvas text-ink-muted hover:border-line-strong hover:bg-subtle hover:text-ink flex flex-col items-center gap-1 rounded-md border px-1 py-2 text-center text-[11px] leading-tight font-medium transition-colors disabled:pointer-events-none disabled:opacity-35"
          >
            <UnitIcon kind={k.id} className="h-6 w-6" />
            {k.label}
          </button>
        )
      })}
    </div>
  )
}
