import type { ReactNode } from 'react'
import { CARD, COUNT_BADGE } from '../../../shared/ui/styles'
import { StepHeader } from './StepHeader'
import type { StepState } from './StepHeader'

export type PickerTab = 'saved' | 'request'

type CallPickerProps = {
  tab: PickerTab
  onTab: (tab: PickerTab) => void
  savedCount: number
  state: StepState
  /** The saved-calls list and the request builder, each shown without its own frame. */
  saved: ReactNode
  request: ReactNode
}

/**
 * Step 2, Choose what to send: one card with two ways in — run something already saved,
 * or build a request by hand. Both panels stay mounted (only hidden) so a half-typed
 * request survives a look at the saved list.
 */
export function CallPicker({ tab, onTab, savedCount, state, saved, request }: CallPickerProps) {
  const tabs: { id: PickerTab; label: string; count?: number }[] = [
    { id: 'saved', label: 'Saved calls', count: savedCount },
    { id: 'request', label: 'Custom request' },
  ]
  return (
    <section className={CARD} aria-label="Choose what to send">
      <StepHeader step={2} title="Choose what to send" state={state} />
      <div className="px-3 pt-3">
        <div role="tablist" aria-label="Where the request comes from" className="border-line-strong bg-field/60 flex gap-1 rounded-lg border p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              id={`nvx-tab-${t.id}`}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              aria-controls={`nvx-panel-${t.id}`}
              onClick={() => onTab(t.id)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
                tab === t.id ? 'bg-brand text-on-brand shadow-btn' : 'text-ink-soft hover:bg-hover hover:text-ink'
              }`}
            >
              {t.label}
              {t.count !== undefined && (
                <span className={`${COUNT_BADGE} ${tab === t.id ? '!border-transparent !bg-black/15 !text-on-brand' : ''}`}>{t.count}</span>
              )}
            </button>
          ))}
        </div>
      </div>
      <div id="nvx-panel-saved" role="tabpanel" aria-labelledby="nvx-tab-saved" hidden={tab !== 'saved'} className="pt-2">
        {saved}
      </div>
      <div id="nvx-panel-request" role="tabpanel" aria-labelledby="nvx-tab-request" hidden={tab !== 'request'}>
        {request}
      </div>
    </section>
  )
}
