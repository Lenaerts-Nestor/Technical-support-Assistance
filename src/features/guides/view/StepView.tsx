import { ImageIcon } from '../components/icons'
import { useGuideImage } from './GuideAssetsContext'
import { SubItemView } from './SubItemView'
import type { GuideStep } from '../types'

/** A single numbered step: text, optional image, and its sub-items. */
export function StepView({ step, index }: { step: GuideStep; index: number }) {
  const imageUrl = useGuideImage(step.image)

  return (
    <li className="flex gap-3">
      <span className="bg-brand-soft text-brand-strong ring-brand-line mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ring-1">
        {index + 1}
      </span>
      <div className="min-w-0 flex-1 space-y-2">
        {step.text && (
          <p className="text-ink text-sm leading-relaxed whitespace-pre-line">
            {step.text}
          </p>
        )}
        {step.image &&
          (imageUrl ? (
            <img
              src={imageUrl}
              alt={step.text || step.image}
              className="border-line max-h-80 rounded-lg border"
            />
          ) : (
            <span className="border-line bg-subtle text-ink-muted inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px]">
              <ImageIcon className="text-ink-faint h-3.5 w-3.5 shrink-0" />
              {step.image}
              <span className="text-ink-faint">— loads when the folder is linked</span>
            </span>
          ))}
        {step.subItems.length > 0 && (
          <ul className="space-y-1.5">
            {step.subItems.map((sub) => (
              <SubItemView key={sub.id} item={sub} />
            ))}
          </ul>
        )}
      </div>
    </li>
  )
}
