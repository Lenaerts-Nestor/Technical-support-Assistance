/**
 * Shared Tailwind class strings for the app's UI primitives.
 *
 * Colour tokens (canvas / surface / line / ink / brand) are defined in
 * `src/index.css` via `@theme`. Every feature composes its cards, buttons and
 * fields from the constants here so borders, radii and focus states stay
 * identical across Voice Call / RMA / Cases / Guides.
 */

/* -- Containers ------------------------------------------------------------ */

/** Top-level card — the main object on a page. Strongest border in the app. */
export const CARD = 'rounded-xl border border-line-strong bg-surface shadow-card'

/** A block nested inside a CARD: a step, a link, a section row. */
export const PANEL = 'rounded-lg border border-line bg-surface'

/** Recessed block inside a CARD — reads as one level further down. */
export const INSET = 'rounded-lg border border-line bg-subtle'

/** Divider between rows inside a card. */
export const DIVIDER = 'border-line-soft'

/** Placeholder shown where a card's content would be. */
export const EMPTY =
  'rounded-xl border border-dashed border-line-strong px-4 py-12 text-center text-sm text-ink-muted'

/** Header strip across the top of a card (title + its actions). */
export const CARD_HEADER =
  'flex items-center justify-between gap-3 rounded-t-xl border-b border-line-soft bg-subtle px-4 py-2.5'

/* -- Buttons --------------------------------------------------------------- */

/**
 * Shape of the primary action, with no background — so the success state below
 * can swap the colour without two `bg-*` classes fighting in one class string.
 */
const PRIMARY_SHAPE =
  'inline-flex shrink-0 items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold text-on-brand transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'

/** The one primary action on a screen. */
export const PRIMARY_BTN = `${PRIMARY_SHAPE} bg-brand hover:bg-brand-strong`

/** Momentary confirmation state for a primary action ("Copied"). */
export const SUCCESS_BTN = `${PRIMARY_SHAPE} bg-emerald-400 hover:bg-emerald-400`

/** Compact secondary action (toolbars, card headers). */
export const GHOST_BTN =
  'inline-flex items-center justify-center gap-1.5 rounded-md border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink-muted transition-colors hover:border-line-strong hover:bg-subtle hover:text-ink disabled:pointer-events-none disabled:opacity-40'

/** GHOST_BTN sized to sit next to a page title. */
export const GHOST_BTN_MD =
  'inline-flex items-center justify-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium text-ink-muted transition-colors hover:border-line-strong hover:bg-subtle hover:text-ink disabled:pointer-events-none disabled:opacity-40'

/** Destructive action that still needs a full button. */
export const DANGER_BTN =
  'inline-flex items-center justify-center gap-1.5 rounded-lg border border-rose-500/50 bg-surface px-3 py-1.5 text-sm font-medium text-rose-300 transition-colors hover:border-rose-400 hover:bg-rose-500/15'

/** Bordered icon-only control — reorder arrows, steppers. */
export const ICON_BTN =
  'rounded-md border border-line bg-surface p-1 text-ink-muted transition-colors hover:border-line-strong hover:bg-subtle hover:text-ink disabled:opacity-30 disabled:hover:border-line disabled:hover:bg-surface disabled:hover:text-ink-muted'

/** Borderless destructive icon — delete a row or block. Callers add padding. */
export const DELETE_BTN =
  'shrink-0 rounded-md text-ink-faint transition-colors hover:bg-rose-500/15 hover:text-rose-300'

/* -- Fields ---------------------------------------------------------------- */

const FIELD_BASE =
  'w-full rounded-md border border-line bg-canvas text-ink transition-colors placeholder:text-ink-faint focus:border-brand focus:ring-2 focus:ring-brand/25 focus:outline-none'

export const INPUT = `${FIELD_BASE} px-2.5 py-1.5 text-sm`

/** INPUT with the roomier padding used on standalone form rows. */
export const INPUT_LG = `${FIELD_BASE} px-3 py-2 text-sm`

export const TEXTAREA = `${FIELD_BASE} resize-y px-2.5 py-1.5 text-sm leading-relaxed`

export const SELECT =
  'rounded-md border border-line bg-canvas px-2 py-1.5 text-xs font-medium text-ink transition-colors focus:border-brand focus:ring-2 focus:ring-brand/25 focus:outline-none'

/**
 * Heading fields. These are sized like the headings they produce, so the H2 /
 * H3 hierarchy is visible while editing and not only after saving.
 */
export const INPUT_TITLE = `${FIELD_BASE} px-3 py-2 text-base font-semibold tracking-tight`
export const INPUT_HEADING = `${FIELD_BASE} px-2.5 py-1.5 text-sm font-semibold`

/* -- Text ------------------------------------------------------------------ */

export const PAGE_TITLE = 'text-2xl font-semibold tracking-tight text-ink'

export const PAGE_SUBTITLE = 'mt-1 text-sm text-ink-muted'

/** Small uppercase label over a group of controls or cards. */
export const SECTION_LABEL =
  'text-[11px] font-semibold tracking-[0.08em] text-ink-muted uppercase'

/** Neutral badge. Coloured variants live next to the data that defines them. */
export const CHIP =
  'inline-flex items-center rounded-md border border-line bg-subtle px-1.5 py-0.5 text-[10px] font-bold tracking-[0.06em] text-ink-muted uppercase'

/** Small numeric counter next to a section label. */
export const COUNT_BADGE =
  'rounded-md border border-line bg-subtle px-1.5 py-0.5 text-[11px] font-semibold text-ink-muted'
