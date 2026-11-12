import { useEffect, useRef } from 'react'
import { PRIMARY_BTN } from '../shared/ui/styles'
import { RULES_CONTENT as C } from './rulesContent'

/**
 * The "Future plans" notice: a square-ish dialog in the middle of the screen over a darkened page. It is
 * meant to be read, so a click outside does not close it; the button (or Escape) does.
 */
export function RulesDialog({ onClose }: { onClose: () => void }) {
  const button = useRef<HTMLButtonElement>(null)
  const closeRef = useRef(onClose)
  useEffect(() => {
    closeRef.current = onClose
  })

  useEffect(() => {
    button.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current()
      // The only control is the button, so Tab stays on it instead of wandering into the page behind.
      if (e.key === 'Tab') {
        e.preventDefault()
        button.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="rules-title"
        className="border-line-strong bg-surface shadow-card flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border"
      >
        <div className="space-y-5 overflow-y-auto p-6 sm:p-8">
          <h2 id="rules-title" className="text-ink text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl">
            {C.title}
          </h2>

          <p className="text-ink-soft text-[15px] leading-relaxed">
            <strong className="text-ink font-bold">{C.reminder.lead}</strong> {C.reminder.text}
          </p>

          <section>
            <h3 className="text-ink text-lg font-bold tracking-tight">{C.rebuild.heading}</h3>
            <p className="text-ink-soft mt-1.5 text-[15px] leading-relaxed">{C.rebuild.text}</p>
          </section>

          {/* The part the eye should land on. */}
          <section className="border-brand/60 bg-brand-soft rounded-xl border-2 p-4 sm:p-5">
            <h3 className="text-brand-strong text-lg font-bold tracking-tight">{C.features.heading}</h3>
            <p className="text-ink mt-1.5 text-sm leading-relaxed font-semibold">{C.features.maybe}</p>
            <p className="text-ink-soft mt-1.5 text-sm leading-relaxed">{C.features.intro}</p>
            <ul className="mt-3 space-y-2.5">
              {C.features.items.map((item) => (
                <li key={item.name} className="bg-surface/70 border-line rounded-lg border px-3.5 py-2.5">
                  <p className="text-ink text-[15px] font-bold">{item.name}</p>
                  <p className="text-ink-soft mt-0.5 text-sm leading-relaxed">{item.text}</p>
                  {'points' in item && (
                    <ul className="text-ink-soft mt-1 list-disc space-y-1 pl-5 text-sm leading-relaxed">
                      {item.points.map((point) => (
                        <li key={point}>{point}</li>
                      ))}
                    </ul>
                  )}
                  {'benefits' in item &&<p className="text-ink-soft mt-1.5 text-sm leading-relaxed">{item.benefits}</p>}
                  {'credit' in item &&<p className="text-ink-muted mt-1 text-xs italic">{item.credit}</p>}
                </li>
              ))}
            </ul>
            <p className="text-ink-muted mt-3 text-sm leading-relaxed">{C.features.outro}</p>
            <p className="text-ink mt-3 text-[15px] leading-relaxed font-bold">
              {C.features.credits.text}{' '}
              <span className="bg-brand text-on-brand rounded px-1.5 py-0.5">{C.features.credits.emphasis}</span>
            </p>
            <div className="border-brand bg-surface mt-3 rounded-lg border-l-4 px-4 py-3 shadow-[0_0_16px_color-mix(in_oklab,var(--color-brand)_35%,transparent)]">
              <p className="text-brand-strong text-base font-extrabold tracking-tight">{C.features.responsible.lead}</p>
              <p className="text-ink mt-0.5 text-sm leading-relaxed font-semibold">{C.features.responsible.text}</p>
            </div>
          </section>

          <section className="border-warning/45 bg-warning-surface rounded-xl border p-4 sm:p-5">
            <h3 className="text-sm font-extrabold tracking-[0.14em] text-amber-100 uppercase">{C.warning.heading}</h3>
            <ul className="mt-2.5 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-amber-100">
              {C.warning.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
            <p className="mt-3 text-sm font-bold text-amber-100">{C.warning.closing}</p>

            {/* The commitment: loud on purpose, so it is the last thing the eye lands on. */}
            <div className="border-danger bg-danger-surface mt-4 space-y-2.5 rounded-lg border-2 p-4 shadow-[0_0_22px_color-mix(in_oklab,var(--color-danger)_55%,transparent)]">
              <p className="text-base leading-snug font-extrabold text-rose-100 sm:text-[17px]">{C.warning.decision.main}</p>
              <p className="border-danger/50 border-t pt-2.5 text-sm leading-relaxed font-bold text-rose-100">
                {C.warning.decision.also}
              </p>
            </div>
          </section>
        </div>

        <div className="border-line flex justify-end border-t px-6 py-4 sm:px-8">
          <button ref={button} type="button" onClick={onClose} className={PRIMARY_BTN}>
            {C.button}
          </button>
        </div>
      </div>
    </div>
  )
}
