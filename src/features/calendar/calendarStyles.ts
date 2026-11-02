import type { LeaveKind } from './types'

/** Class names are spelled out so Tailwind sees them; colours come from `index.css`. */
export const KIND_STYLE: Record<LeaveKind, { label: string; fill: string; swatch: string }> = {
  pto: { label: 'PTO', fill: 'bg-pto text-pto-ink', swatch: 'bg-pto' },
  other: { label: 'Other', fill: 'bg-leave-other text-leave-other-ink', swatch: 'bg-leave-other' },
}

/** The marker for today (the primary accent), shared by the month and year views. */
export const TODAY_RING = 'outline-2 -outline-offset-2 outline-dashed outline-brand'
