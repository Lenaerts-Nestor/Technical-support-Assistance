import type { CalloutVariant } from '../types'

/**
 * Shared colour tokens for anything that renders as an Info / Warning note:
 * standalone `callout` parts and the note-style sub-items under a step.
 * Warning is rose rather than amber so it stays distinct from the amber brand
 * accent used by buttons and active nav.
 */
export const CALLOUT_BOX: Record<CalloutVariant, string> = {
  info: 'border-sky-400/35 border-l-sky-400 bg-sky-400/10 text-sky-50',
  warning: 'border-rose-400/35 border-l-rose-400 bg-rose-400/10 text-rose-50',
}

export const CALLOUT_LABEL: Record<CalloutVariant, string> = {
  info: 'bg-sky-400/20 text-sky-200',
  warning: 'bg-rose-400/20 text-rose-200',
}

export const calloutLabel = (variant: CalloutVariant): string =>
  variant === 'warning' ? 'Warning' : 'Info'
