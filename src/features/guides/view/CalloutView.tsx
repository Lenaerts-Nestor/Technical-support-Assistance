import { CALLOUT_BOX, CALLOUT_LABEL, calloutLabel } from './calloutStyles'
import type { CalloutPart } from '../types'

/** A standalone note that frames the guide or a group of steps. */
export function CalloutView({ part }: { part: CalloutPart }) {
  return (
    <div
      className={`shadow-card rounded-xl border border-l-[3px] px-4 py-3.5 ${CALLOUT_BOX[part.variant]}`}
    >
      <span
        className={`mb-1.5 inline-block rounded-md px-1.5 py-0.5 text-[10px] font-bold tracking-[0.06em] uppercase ${CALLOUT_LABEL[part.variant]}`}
      >
        {calloutLabel(part.variant)}
      </span>
      <p className="text-sm leading-relaxed whitespace-pre-line">{part.text}</p>
    </div>
  )
}
