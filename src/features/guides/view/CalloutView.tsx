import { CalloutIcon, WarningIcon } from '../components/icons'
import { CALLOUT_BOX, CALLOUT_ICON, CALLOUT_WORD, calloutLabel } from './calloutStyles'
import type { CalloutPart } from '../types'

/** A standalone note that frames the guide or a group of steps. */
export function CalloutView({ part }: { part: CalloutPart }) {
  const Icon = part.variant === 'warning' ? WarningIcon : CalloutIcon
  return (
    <div
      className={`shadow-card flex gap-3 rounded-xl border border-l-[3px] px-4 py-3.5 ${CALLOUT_BOX[part.variant]}`}
    >
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${CALLOUT_ICON[part.variant]}`} />
      <div className="min-w-0">
        <span
          className={`mb-0.5 block text-[11px] font-bold tracking-[0.06em] uppercase ${CALLOUT_WORD[part.variant]}`}
        >
          {calloutLabel(part.variant)}
        </span>
        <p className="text-[15px] leading-relaxed whitespace-pre-line">{part.text}</p>
      </div>
    </div>
  )
}
