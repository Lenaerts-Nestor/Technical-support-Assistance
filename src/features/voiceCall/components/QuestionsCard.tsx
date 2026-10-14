import { CARD, CARD_HEADER, SECTION_LABEL } from '../../../shared/ui/styles'
import { QUESTION_GROUPS, QUESTION_TIPS } from '../voiceCallData'
import { CloseIcon, HelpIcon } from './icons'

type QuestionsCardProps = {
  onClose: () => void
}

/** Side card of reminder questions, so nothing gets forgotten mid-call. */
export function QuestionsCard({ onClose }: QuestionsCardProps) {
  return (
    <aside
      aria-label="Questions to ask"
      className={`${CARD} sticky top-7 flex max-h-[calc(100vh-3.5rem)] w-96 shrink-0 flex-col`}
    >
      <div className={CARD_HEADER}>
        <div className="text-ink flex items-center gap-2 text-sm font-semibold">
          <HelpIcon className="text-brand h-4 w-4" />
          Questions to ask
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close questions"
          className="text-ink-faint hover:bg-surface hover:text-ink rounded-md p-1 transition-colors"
        >
          <CloseIcon className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-5 overflow-y-auto px-4 py-4">
        {QUESTION_GROUPS.map((group) => (
          <section key={group.title}>
            <h3 className={SECTION_LABEL}>{group.title}</h3>
            <ul className="text-ink mt-2 space-y-1.5 text-sm leading-snug">
              {group.questions.map((q) => (
                <li key={q} className="flex gap-2">
                  <span aria-hidden="true" className="bg-brand mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" />
                  <span>{q}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <section className="border-line-soft border-t pt-4">
          <h3 className={SECTION_LABEL}>Tips</h3>
          <ul className="text-ink-muted mt-2 space-y-1.5 text-sm leading-snug">
            {QUESTION_TIPS.map((tip) => (
              <li key={tip} className="flex gap-2">
                <span aria-hidden="true" className="bg-ink-faint mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </aside>
  )
}
