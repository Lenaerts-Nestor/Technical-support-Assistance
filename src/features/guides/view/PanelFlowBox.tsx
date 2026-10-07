import { getTemplate } from '../panel/devices'
import type { PanelFlow } from '../panel/usePanelFlow'
import { GHOST_BTN, SECTION_LABEL } from '../../../shared/ui/styles'
import type { PanelPart } from '../types'

/**
 * The troubleshooting checks of a panel as something to walk through: pick a
 * check, read the step, answer it, and see the diagram follow along.
 */
export function PanelFlowBox({ part, flow }: { part: PanelPart; flow: PanelFlow }) {
  if (part.scenarios.length === 0) return null
  const slotLabel = (id: string) => getTemplate(part.deviceId)?.slots.find((s) => s.id === id)?.label ?? id
  const { scenario, step } = flow

  return (
    <div>
      <p className={`mb-1.5 ${SECTION_LABEL}`}>Troubleshooting</p>
      <div className="flex flex-wrap gap-1.5">
        {part.scenarios.map((s) => (
          <button
            key={s.id}
            type="button"
            aria-pressed={s.id === scenario?.id}
            onClick={() => flow.open(s.id)}
            className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
              s.id === scenario?.id
                ? 'border-rose-400/60 bg-rose-400/15 text-rose-200'
                : 'border-line bg-surface text-ink-muted hover:border-line-strong hover:text-ink'
            }`}
          >
            {s.title || 'Untitled check'}
          </button>
        ))}
      </div>

      {scenario && step && (
        <div className="border-line bg-canvas mt-2.5 rounded-lg border p-3">
          <p className="text-ink-faint text-[11px] font-semibold tracking-wide uppercase">
            Step {flow.stepNumber}
          </p>
          <p className="text-ink mt-1 text-sm leading-relaxed whitespace-pre-line">{step.text}</p>

          {step.move && (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-amber-400/40 bg-amber-400/10 px-2 py-1 text-xs font-medium text-amber-200">
              Swap cards: {slotLabel(step.move.from)} ⇄ {slotLabel(step.move.to)}
              <span className="text-amber-200/70 font-normal">(cables follow the cards)</span>
            </p>
          )}

          {flow.conclusion !== null ? (
            <div className="mt-3 rounded-md border border-emerald-400/40 bg-emerald-400/10 px-3 py-2">
              <p className="text-[11px] font-semibold tracking-wide text-emerald-200 uppercase">Conclusion</p>
              <p className="text-ink mt-0.5 text-sm whitespace-pre-line">{flow.conclusion}</p>
            </div>
          ) : (
            step.answers.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {step.answers.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => flow.answer(a)}
                    className="bg-brand text-on-brand hover:bg-brand-strong rounded-md px-3 py-1 text-xs font-semibold transition-colors"
                  >
                    {a.label || 'Next'}
                  </button>
                ))}
              </div>
            )
          )}

          <div className="mt-3 flex gap-1.5">
            <button type="button" onClick={flow.back} disabled={!flow.canGoBack} className={GHOST_BTN}>
              Back
            </button>
            <button type="button" onClick={flow.restart} className={GHOST_BTN}>
              Restart
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
