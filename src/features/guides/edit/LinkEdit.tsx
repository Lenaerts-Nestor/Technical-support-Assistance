import { ArrowDownIcon, ArrowUpIcon, TrashIcon } from '../components/icons'
import { DELETE_BTN, ICON_BTN, INPUT, PANEL } from '../../../shared/ui/styles'
import type { GuideLink } from '../types'

type LinkEditProps = {
  link: GuideLink
  index: number
  count: number
  onChange: (fields: Partial<Omit<GuideLink, 'id'>>) => void
  onMove: (dir: -1 | 1) => void
  onRemove: () => void
}

export function LinkEdit({ link, index, count, onChange, onMove, onRemove }: LinkEditProps) {
  return (
    <div className={`${PANEL} p-2.5`}>
      <div className="mb-2 flex items-center gap-1">
        <span className="text-ink-faint text-[11px] font-semibold tracking-[0.06em] uppercase">
          Link {index + 1}
        </span>
        <span className="flex-1" />
        <button
          type="button"
          onClick={() => onMove(-1)}
          disabled={index === 0}
          aria-label="Move link up"
          className={ICON_BTN}
        >
          <ArrowUpIcon className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={() => onMove(1)}
          disabled={index === count - 1}
          aria-label="Move link down"
          className={ICON_BTN}
        >
          <ArrowDownIcon className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Delete link"
          className={`${DELETE_BTN} p-1`}
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>
      <div className="space-y-1.5">
        <input
          value={link.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="Link title…"
          className={INPUT}
        />
        <input
          value={link.url}
          onChange={(e) => onChange({ url: e.target.value })}
          placeholder="https://…"
          className={INPUT}
        />
        <input
          value={link.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Short description (optional)…"
          className={INPUT}
        />
      </div>
    </div>
  )
}
