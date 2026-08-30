import { CALLOUT_BOX, CALLOUT_LABEL_COLOR, calloutLabel } from './calloutStyles'
import type { CalloutPart } from '../types'

/** A standalone note that frames the guide or a group of steps. */
export function CalloutView({ part }: { part: CalloutPart }) {
  return (
    <div className={`rounded-xl border border-l-4 px-4 py-3 ${CALLOUT_BOX[part.variant]}`}>
      <span
        className={`mb-1 block text-[10px] font-bold uppercase tracking-wide ${CALLOUT_LABEL_COLOR[part.variant]}`}
      >
        {calloutLabel(part.variant)}
      </span>
      <p className="whitespace-pre-line text-sm leading-relaxed">{part.text}</p>
    </div>
  )
}
