import { StepView } from './StepView'
import type { GuideStep } from '../types'

type SectionBlockViewProps = {
  /** When set, this block becomes a scroll-spy anchor target. */
  anchorId?: string
  heading: string
  body: string
  steps: GuideStep[]
}

/** Heading + body + numbered steps. Shared by chapter sections and standalone `section` parts. */
export function SectionBlockView({ anchorId, heading, body, steps }: SectionBlockViewProps) {
  return (
    <div id={anchorId} className={anchorId ? 'scroll-mt-24' : undefined}>
      {heading && <h4 className="text-sm font-semibold text-slate-900">{heading}</h4>}
      {body && (
        <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-600">
          {body}
        </p>
      )}
      {steps.length > 0 && (
        <ol className="mt-2 space-y-2.5">
          {steps.map((step, i) => (
            <StepView key={step.id} step={step} index={i} />
          ))}
        </ol>
      )}
    </div>
  )
}
