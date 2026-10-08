import { CalloutIcon, WarningIcon } from '../components/icons'
import { CALLOUT_BOX, CALLOUT_ICON, CALLOUT_WORD, calloutLabel } from './calloutStyles'
import type { StepSubItem } from '../types'

/** One item under a step: a plain bullet or a coloured Info / Warning note. */
export function SubItemView({ item }: { item: StepSubItem }) {
  if (item.kind === 'bullet') {
    return (
      <li className="text-ink-muted flex gap-2.5 text-[15px] leading-relaxed">
        <span aria-hidden className="bg-ink-faint mt-[0.6em] h-1.5 w-1.5 shrink-0 rounded-full" />
        <span className="whitespace-pre-line">{item.text}</span>
      </li>
    )
  }
  const Icon = item.kind === 'warning' ? WarningIcon : CalloutIcon
  return (
    <li
      className={`flex gap-2.5 rounded-lg border border-l-[3px] px-3.5 py-2.5 text-[15px] leading-relaxed ${CALLOUT_BOX[item.kind]}`}
    >
      <Icon className={`mt-[0.2em] h-4 w-4 shrink-0 ${CALLOUT_ICON[item.kind]}`} />
      <span className="min-w-0">
        <span
          className={`mr-1.5 text-[11px] font-bold tracking-[0.06em] uppercase ${CALLOUT_WORD[item.kind]}`}
        >
          {calloutLabel(item.kind)}
        </span>
        <span className="whitespace-pre-line">{item.text}</span>
      </span>
    </li>
  )
}
