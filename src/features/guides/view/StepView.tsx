import { ImageIcon } from '../components/icons'
import { useGuideImage } from './GuideAssetsContext'
import { ImageZoom } from './ImageZoom'
import { SubItemView } from './SubItemView'
import type { GuideStep } from '../types'

type StepViewProps = {
  step: GuideStep
  index: number
  /** The last step has no line running down to a next one. */
  last: boolean
}

/**
 * A single numbered step. The numbers are joined by a thin line so a run of
 * steps reads as one sequence; the text is body-sized and full contrast, since
 * this is the part somebody follows while on a call.
 */
export function StepView({ step, index, last }: StepViewProps) {
  const imageUrl = useGuideImage(step.image)

  return (
    <li className={`relative flex gap-3.5 ${last ? '' : 'pb-5'}`}>
      {!last && (
        <span aria-hidden className="bg-line absolute top-8 bottom-1 left-[13px] w-px" />
      )}
      <span className="bg-brand-soft text-brand-strong ring-brand-line relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ring-1">
        {index + 1}
      </span>
      <div className="min-w-0 flex-1 space-y-2.5 pt-0.5">
        {step.text && (
          <p className="text-ink text-[15px] leading-relaxed whitespace-pre-line">{step.text}</p>
        )}
        {step.image &&
          (imageUrl ? (
            <ImageZoom src={imageUrl} alt={step.text || step.image} />
          ) : (
            <span className="border-line bg-subtle text-ink-muted inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px]">
              <ImageIcon className="text-ink-faint h-3.5 w-3.5 shrink-0" />
              {step.image}
              <span className="text-ink-faint">— loads when the folder is linked</span>
            </span>
          ))}
        {step.subItems.length > 0 && (
          <ul className="space-y-2">
            {step.subItems.map((sub) => (
              <SubItemView key={sub.id} item={sub} />
            ))}
          </ul>
        )}
      </div>
    </li>
  )
}
