import { CALLOUT_BOX, CALLOUT_LABEL, calloutLabel } from './calloutStyles'
import type { StepSubItem } from '../types'

/** One item under a step: a plain bullet or a coloured Info / Warning note. */
export function SubItemView({ item }: { item: StepSubItem }) {
  if (item.kind === 'bullet') {
    return (
      <li className="text-ink-muted flex gap-2 text-sm">
        <span aria-hidden className="bg-ink-faint mt-2 h-1 w-1 shrink-0 rounded-full" />
        <span className="whitespace-pre-line">{item.text}</span>
      </li>
    )
  }
  return (
    <li
      className={`rounded-lg border border-l-[3px] px-3 py-2 text-sm leading-relaxed ${CALLOUT_BOX[item.kind]}`}
    >
      <span
        className={`mb-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold tracking-[0.06em] uppercase ${CALLOUT_LABEL[item.kind]}`}
      >
        {calloutLabel(item.kind)}
      </span>
      <span className="block whitespace-pre-line">{item.text}</span>
    </li>
  )
}
