import { CalloutView } from './CalloutView'
import { StepView } from './StepView'
import { TableView } from './TableView'
import { TermView } from './TermView'
import type { GuideStep, SectionBlock } from '../types'

type SectionBlockViewProps = {
  /** When set, this block becomes a scroll-spy anchor target. */
  anchorId?: string
  heading: string
  body: string
  steps: GuideStep[]
  /** Tables / callouts / terms belonging to this section, shown under its steps. */
  blocks?: SectionBlock[]
}

/**
 * Heading + body + numbered steps + any nested blocks. Shared by chapter
 * sections and standalone `section` parts. The heading is deliberately a step
 * down from the chapter band above it: smaller, un-tinted, marked by a rule
 * rather than a fill.
 */
export function SectionBlockView({
  anchorId,
  heading,
  body,
  steps,
  blocks,
}: SectionBlockViewProps) {
  return (
    <div id={anchorId} className={anchorId ? 'scroll-mt-20' : undefined}>
      {heading && (
        <h4 className="text-ink border-l-2 border-l-violet-400 pl-2.5 text-sm font-semibold tracking-tight">
          {heading}
        </h4>
      )}
      {body && (
        <p className="text-ink-muted mt-1.5 text-sm leading-relaxed whitespace-pre-line">
          {body}
        </p>
      )}
      {steps.length > 0 && (
        <ol className="mt-3 space-y-3">
          {steps.map((step, i) => (
            <StepView key={step.id} step={step} index={i} />
          ))}
        </ol>
      )}
      {blocks && blocks.length > 0 && (
        <div className="mt-3 space-y-2.5">
          {blocks.map((block) => (
            <SectionBlockItem key={block.id} block={block} />
          ))}
        </div>
      )}
    </div>
  )
}

function SectionBlockItem({ block }: { block: SectionBlock }) {
  if (block.type === 'table') return <TableView part={block} nested />
  if (block.type === 'callout') return <CalloutView part={block} />
  return <TermView part={block} />
}
