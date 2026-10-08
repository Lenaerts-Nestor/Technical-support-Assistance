import { CalloutIcon, PanelIcon, PlusIcon, TableIcon, TermIcon } from '../components/icons'
import { PART_TONES } from '../guidesData'
import type { GuidePartKind } from '../types'

const KIND_ICON: Partial<Record<GuidePartKind, (p: { className?: string }) => React.ReactElement>> = {
  chapter: PlusIcon,
  section: PlusIcon,
  table: TableIcon,
  callout: CalloutIcon,
  term: TermIcon,
  panel: PanelIcon,
}

type InsertBarProps<K extends GuidePartKind> = {
  kinds: { kind: K; label: string }[]
  onInsert: (kind: K) => void
  /** Accessible name, e.g. "Insert a block here". */
  hint?: string
  /** Shorter bar for tight lists. */
  compact?: boolean
}

/**
 * A thin line between two blocks with a "+" in the middle. Hover (or tab to)
 * it and the kinds of block you can put exactly there appear. This is the
 * answer to "everything is added at the bottom": insert where it belongs.
 */
export function InsertBar<K extends GuidePartKind>({
  kinds,
  onInsert,
  hint = 'Insert a block here',
  compact = false,
}: InsertBarProps<K>) {
  return (
    <div role="group" aria-label={hint} className={`group relative ${compact ? 'h-6' : 'h-8'}`}>
      <div
        aria-hidden
        className="border-line-strong group-hover:border-brand-line group-focus-within:border-brand-line absolute inset-x-0 top-1/2 border-t border-dashed opacity-50 transition-colors group-focus-within:opacity-100 group-hover:opacity-100"
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-canvas flex items-center gap-1.5 rounded-full px-1.5">
          <button
            type="button"
            aria-label={hint}
            title={hint}
            className="border-line-strong text-ink-faint group-hover:border-brand-line group-hover:text-brand-strong group-focus-within:border-brand-line flex h-5 w-5 items-center justify-center rounded-full border transition-colors"
          >
            <PlusIcon className="h-3 w-3" />
          </button>
          <div className="hidden items-center gap-1.5 group-focus-within:flex group-hover:flex">
            {kinds.map(({ kind, label }) => {
              const Icon = KIND_ICON[kind] ?? PlusIcon
              return (
                <button
                  key={kind}
                  type="button"
                  onClick={() => onInsert(kind)}
                  className="border-line bg-surface text-ink-muted hover:border-brand-line hover:text-ink inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-colors"
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${PART_TONES[kind].dot}`} aria-hidden />
                  <Icon className="h-3 w-3" />
                  {label.replace(/^Add /, '')}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
