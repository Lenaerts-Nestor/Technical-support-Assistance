import { CALLOUT_BOX, CALLOUT_LABEL_COLOR, calloutLabel } from './calloutStyles'
import type { StepSubItem } from '../types'

/** One item under a step: a plain bullet or a coloured Info / Warning note. */
export function SubItemView({ item }: { item: StepSubItem }) {
  if (item.kind === 'bullet') {
    return (
      <li className="flex gap-2 text-sm text-slate-600">
        <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-slate-400" />
        <span className="whitespace-pre-line">{item.text}</span>
      </li>
    )
  }
  return (
    <li className={`rounded-lg border px-3 py-2 text-sm leading-relaxed ${CALLOUT_BOX[item.kind]}`}>
      <span
        className={`mb-0.5 block text-[10px] font-semibold uppercase tracking-wide ${CALLOUT_LABEL_COLOR[item.kind]}`}
      >
        {calloutLabel(item.kind)}
      </span>
      <span className="whitespace-pre-line">{item.text}</span>
    </li>
  )
}
