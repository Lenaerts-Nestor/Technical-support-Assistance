import { useCopyToClipboard } from '../../../shared/hooks/useCopyToClipboard'
import { CopyIcon } from '../../../shared/ui/icons'
import { CARD, CARD_HEADER, CHIP, GHOST_BTN, INSET, SECTION_LABEL } from '../../../shared/ui/styles'
import { OUTCOME_LABEL, formatChangeLog } from '../nvxData'
import type { ChangeLogEntry } from '../types'

const OUTCOME_STYLE = {
  applied: 'border-emerald-500/40 text-emerald-300',
  restart: 'border-amber-500/40 text-amber-300',
  failed: 'border-rose-500/40 text-rose-300',
} as const

type ChangesCardProps = {
  entries: ChangeLogEntry[]
  onClear: () => void
}

/** Every change sent since the app started, newest first, to paste into a case note. It is not saved. */
export function ChangesCard({ entries, onClear }: ChangesCardProps) {
  const { copied, copy } = useCopyToClipboard()
  return (
    <section className={CARD} aria-label="Changes this session">
      <header className={CARD_HEADER}>
        <h3 className={SECTION_LABEL}>Changes this session</h3>
        <div className="flex items-center gap-2">
          <button type="button" className={GHOST_BTN} onClick={() => void copy(formatChangeLog(entries))}>
            <CopyIcon className="h-3.5 w-3.5" />
            {copied ? 'Copied' : 'Copy log'}
          </button>
          <button type="button" className={GHOST_BTN} onClick={onClear}>
            Clear
          </button>
        </div>
      </header>
      <ul className="space-y-3 p-4">
        {[...entries].reverse().map((entry) => (
          <li key={entry.id} className={`${INSET} space-y-1.5 p-3`}>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-ink text-sm font-semibold">{entry.unit.label || entry.unit.ip}</span>
              <span className="text-ink-muted font-mono text-xs">{new Date(entry.at).toLocaleTimeString()}</span>
              <span className={`${CHIP} ${OUTCOME_STYLE[entry.outcome]}`}>{OUTCOME_LABEL[entry.outcome]}</span>
            </div>
            {entry.lines.map((line) => (
              <p key={line} className="text-ink font-mono text-xs break-all">
                {line}
              </p>
            ))}
            {entry.detail && <p className="text-ink-muted text-xs">{entry.detail}</p>}
          </li>
        ))}
      </ul>
    </section>
  )
}
