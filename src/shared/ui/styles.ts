/**
 * Shared Tailwind class strings for the app's UI primitives.
 *
 * Colour tokens (canvas / surface / line / ink / brand …) are defined in
 * `src/index.css` via `@theme` and re-pointed per colour theme in
 * `src/shared/theme/themes.css`. Every feature composes its cards, buttons and
 * fields from the constants here so borders, radii, depth and focus states stay
 * identical across pages — and a theme change reaches all of them at once.
 *
 * Depth, darkest to lightest: field (input wells) → canvas → surface → surface-hi.
 */

/* -- Containers ------------------------------------------------------------ */

/** Top-level card — the main object on a page. Lit from above, with a soft drop shadow. */
export const CARD =
  'rounded-xl border border-line-strong bg-linear-to-b from-surface-hi to-surface shadow-card'

/** A block nested inside a CARD: a step, a link, a section row. */
export const PANEL = 'rounded-lg border border-line bg-surface shadow-btn-soft'

/** Recessed block inside a CARD — reads as one level further down. */
export const INSET = 'rounded-lg border border-line bg-field/50'

/** Divider between rows inside a card. */
export const DIVIDER = 'border-line'

/** Placeholder shown where a card's content would be. */
export const EMPTY =
  'rounded-xl border border-dashed border-line-strong bg-surface/40 px-4 py-12 text-center text-sm text-ink-muted'

/** Header strip across the top of a card (title + its actions). */
export const CARD_HEADER =
  'flex items-center justify-between gap-3 rounded-t-xl border-b border-line bg-linear-to-b from-subtle to-subtle/55 px-4 py-2.5'

/* -- Buttons --------------------------------------------------------------- */

/**
 * Shape of the primary action, with no background — so the success state below
 * can swap the colour without two `bg-*` classes fighting in one class string.
 */
const PRIMARY_SHAPE =
  'inline-flex shrink-0 items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-bold text-on-brand shadow-btn transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-55 disabled:shadow-none'

/** The one primary action on a screen. */
export const PRIMARY_BTN = `${PRIMARY_SHAPE} bg-linear-to-b from-brand-hi to-brand hover:brightness-110 active:brightness-95`

/** Momentary confirmation state for a primary action ("Copied"). */
export const SUCCESS_BTN = `${PRIMARY_SHAPE} bg-emerald-400 hover:bg-emerald-400`

/** Compact secondary action (toolbars, card headers). */
export const GHOST_BTN =
  'inline-flex items-center justify-center gap-1.5 rounded-md border border-line-strong bg-surface-hi px-2.5 py-1 text-[13px] font-semibold text-ink-soft shadow-btn-soft transition-colors hover:border-brand-line hover:bg-subtle hover:text-ink disabled:pointer-events-none disabled:opacity-60'

/** GHOST_BTN sized to sit next to a page title. */
export const GHOST_BTN_MD =
  'inline-flex items-center justify-center gap-1.5 rounded-lg border border-line-strong bg-surface-hi px-3 py-1.5 text-sm font-semibold text-ink-soft shadow-btn-soft transition-colors hover:border-brand-line hover:bg-subtle hover:text-ink disabled:pointer-events-none disabled:opacity-60'

/** Destructive action that still needs a full button. */
export const DANGER_BTN =
  'inline-flex items-center justify-center gap-1.5 rounded-lg border border-rose-500/60 bg-surface-hi px-3 py-1.5 text-sm font-semibold text-rose-200 shadow-btn-soft transition-colors hover:border-rose-400 hover:bg-rose-500/20 disabled:pointer-events-none disabled:opacity-60'

/** Bordered icon-only control — reorder arrows, steppers. */
export const ICON_BTN =
  'rounded-md border border-line-strong bg-surface-hi p-1 text-ink-soft shadow-btn-soft transition-colors hover:border-brand-line hover:bg-subtle hover:text-ink disabled:opacity-45 disabled:hover:border-line-strong disabled:hover:bg-surface-hi disabled:hover:text-ink-soft'

/** Borderless destructive icon — delete a row or block. Callers add padding. */
export const DELETE_BTN =
  'shrink-0 rounded-md text-ink-muted transition-colors hover:bg-rose-500/15 hover:text-rose-300'

/* -- Fields ---------------------------------------------------------------- */

const FIELD_BASE =
  'w-full rounded-md border border-line-strong bg-field text-ink shadow-field transition-colors placeholder:text-ink-faint hover:border-ink-faint focus:border-brand focus:ring-2 focus:ring-brand/25 focus:outline-none'

export const INPUT = `${FIELD_BASE} px-2.5 py-1.5 text-sm`

/** INPUT with the roomier padding used on standalone form rows. */
export const INPUT_LG = `${FIELD_BASE} px-3 py-2 text-sm`

export const TEXTAREA = `${FIELD_BASE} resize-y px-2.5 py-1.5 text-sm leading-relaxed`

export const SELECT =
  'rounded-md border border-line-strong bg-field px-2 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-ink-faint focus:border-brand focus:ring-2 focus:ring-brand/25 focus:outline-none'

/**
 * Heading fields. These are sized like the headings they produce, so the H2 /
 * H3 hierarchy is visible while editing and not only after saving.
 */
export const INPUT_TITLE = `${FIELD_BASE} px-3 py-2 text-base font-semibold tracking-tight`
export const INPUT_HEADING = `${FIELD_BASE} px-2.5 py-1.5 text-sm font-semibold`

/* -- Text ------------------------------------------------------------------ */

export const PAGE_TITLE = 'text-2xl font-bold tracking-tight text-ink'

export const PAGE_SUBTITLE = 'mt-1 text-sm text-ink-muted'

/** Small uppercase label over a group of controls or cards. */
export const SECTION_LABEL =
  'text-[11px] font-bold tracking-[0.1em] text-ink-soft uppercase'

/** Neutral badge. Coloured variants live next to the data that defines them. */
export const CHIP =
  'inline-flex items-center rounded-md border border-line-strong bg-field/60 px-1.5 py-0.5 text-[10px] font-bold tracking-[0.06em] text-ink-soft uppercase'

/** Small numeric counter next to a section label. */
export const COUNT_BADGE =
  'rounded-md border border-line-strong bg-field/60 px-1.5 py-0.5 text-[11px] font-bold text-ink-soft'
