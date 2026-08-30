import { ImageIcon } from '../components/icons'
import { useGuideImage } from './GuideAssetsContext'
import { SubItemView } from './SubItemView'
import type { GuideStep } from '../types'

/** A single numbered step: text, optional image, and its sub-items. */
export function StepView({ step, index }: { step: GuideStep; index: number }) {
  const imageUrl = useGuideImage(step.image)

  return (
    <li className="flex gap-3">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-500">
        {index + 1}
      </span>
      <div className="min-w-0 flex-1 space-y-2">
        {step.text && (
          <p className="whitespace-pre-line text-sm leading-relaxed text-slate-800">
            {step.text}
          </p>
        )}
        {step.image &&
          (imageUrl ? (
            <img
              src={imageUrl}
              alt={step.text || step.image}
              className="max-h-80 rounded-md border border-slate-200"
            />
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-500">
              <ImageIcon className="h-3.5 w-3.5 shrink-0" />
              {step.image}
              <span className="text-slate-400">— loads when the folder is linked</span>
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
