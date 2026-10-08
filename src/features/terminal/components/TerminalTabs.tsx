import type { ConnectionState, Session } from '../types'
import { TerminalView } from './TerminalView'
import { CloseIcon } from './icons'

type TerminalTabsProps = {
  sessions: Session[]
  activeId: string | null
  states: Record<string, ConnectionState>
  onSelect: (id: string) => void
  onClose: (id: string) => void
  onState: (id: string, state: ConnectionState) => void
  onReauth: (id: string) => void
}

const DOT: Record<ConnectionState, string> = {
  connecting: 'bg-amber-400 animate-pulse',
  ready: 'bg-emerald-400',
  closed: 'bg-ink-faint',
  error: 'bg-rose-400',
}

/**
 * The tab strip and every open terminal. All terminals stay mounted and the
 * inactive ones are hidden, so a running command keeps going while you look at
 * another tab.
 */
export function TerminalTabs({ sessions, activeId, states, onSelect, onClose, onState, onReauth }: TerminalTabsProps) {
  return (
    <section className="border-line-strong bg-canvas flex min-h-0 flex-1 flex-col border-t">
      <div role="tablist" className="border-line-soft bg-surface flex shrink-0 gap-1 overflow-x-auto border-b px-3 pt-2">
        {sessions.map((s) => {
          const selected = s.id === activeId
          return (
            <div
              key={s.id}
              className={`flex shrink-0 items-center gap-2 rounded-t-lg border border-b-0 px-3 py-1.5 text-xs font-medium ${
                selected
                  ? 'border-line-strong bg-canvas text-ink'
                  : 'text-ink-muted hover:bg-subtle border-transparent'
              }`}
            >
              <button
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => onSelect(s.id)}
                className="flex items-center gap-2"
              >
                <span className={`h-2 w-2 rounded-full ${DOT[states[s.id] ?? 'connecting']}`} />
                {s.label}
              </button>
              <button
                type="button"
                onClick={() => onClose(s.id)}
                aria-label={`Close ${s.label}`}
                className="text-ink-faint rounded p-0.5 hover:bg-rose-500/15 hover:text-rose-300"
              >
                <CloseIcon className="h-3 w-3" />
              </button>
            </div>
          )
        })}
      </div>
      <div className="min-h-0 flex-1">
        {sessions.map((s) => (
          <div key={s.id} hidden={s.id !== activeId} className="h-full">
            <TerminalView
              session={s}
              active={s.id === activeId}
              onState={(state) => onState(s.id, state)}
              onReauth={() => onReauth(s.id)}
            />
          </div>
        ))}
      </div>
    </section>
  )
}
