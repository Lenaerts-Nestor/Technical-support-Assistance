import type { CalloutVariant } from '../types'

/**
 * Shared colour tokens for anything that renders as an Info / Warning note:
 * standalone `callout` parts and the note-style sub-items under a step.
 */
export const CALLOUT_BOX: Record<CalloutVariant, string> = {
  info: 'border-sky-200 bg-sky-50 text-sky-900',
  warning: 'border-amber-300 bg-amber-50 text-amber-900',
}

export const CALLOUT_LABEL_COLOR: Record<CalloutVariant, string> = {
  info: 'text-sky-600',
  warning: 'text-amber-600',
}

export const calloutLabel = (variant: CalloutVariant): string =>
  variant === 'warning' ? 'Warning' : 'Info'
