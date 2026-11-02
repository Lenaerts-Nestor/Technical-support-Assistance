/**
 * Shared Tailwind class strings for the app's UI primitives.
 *
 * Colour tokens (canvas / surface / line / ink / brand …) are defined in
 * `src/index.css` via `@theme` and re-pointed per colour theme in
 * `src/shared/theme/themes.css`. Every feature composes its cards, buttons and
 * fields from the constants here so borders, radii, depth and focus states stay
 * identical across pages — and a theme change reaches all of them at once.
 *
 * Shape rules: cards 12px, nested blocks and controls 8px, controls 34–40px high,
 * flat fills (no gradients), thin warm borders, a hover that nudges border or
 * background, and one focus ring in the theme's focus colour (see index.css).
 *
 * Depth, darkest to lightest in the dark theme: field (input wells) → canvas → surface → surface-hi.
 */

/* -- Containers ------------------------------------------------------------ */

/** Top-level card — the main object on a page. Defined by its border; the shadow is only a hint. */
export const CARD = 'rounded-xl border border-line-strong bg-surface shadow-card'

/** A block nested inside a CARD: a step, a link, a section row. */
export const PANEL = 'rounded-lg border border-line bg-surface shadow-btn-soft'

/** Recessed block inside a CARD — reads as one level further down. */
export const INSET = 'rounded-lg border border-line bg-field/50'

/** Divider between rows inside a card. */
export const DIVIDER = 'border-line'

/** Placeholder shown where a card's content would be. */
export const EMPTY =
  'rounded-xl border border-dashed border-line-strong bg-surface/40 px-4 py-12 text-center text-sm text-ink-muted'

/** Header strip across the top of a card (title + its actions): the card's own colour, closed off by a line. */
export const CARD_HEADER = 'flex items-center justify-between gap-3 rounded-t-xl border-b border-line px-4 py-3'

/* -- Alerts ---------------------------------------------------------------- */

/**
 * Quiet coloured panels for messages. Each pairs the semantic surface with its own text
 * shade, and carries a thin edge in the semantic colour, so the meaning is never colour alone
 * (callers add a heading or an icon): danger = something is wrong, warning = look at this,
 * info = good to know, success = it worked.
 */
const ALERT = 'rounded-lg border px-3 py-2 text-sm'
export const ALERT_DANGER = `${ALERT} border-danger/45 bg-danger-surface text-rose-100`
export const ALERT_WARNING = `${ALERT} border-warning/45 bg-warning-surface text-amber-100`
export const ALERT_INFO = `${ALERT} border-info/45 bg-info-surface text-sky-100`
export const ALERT_SUCCESS = `${ALERT} border-success/45 bg-success-surface text-emerald-100`

/* -- Buttons --------------------------------------------------------------- */

/**
 * Shape of the primary action, with no background — so the success state below
 * can swap the colour without two `bg-*` classes fighting in one class string.
 * The border is there (transparent) so a disabled button can show a visible edge.
 */
const PRIMARY_SHAPE =
  'inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-transparent px-3.5 py-2 text-sm font-bold text-on-brand shadow-btn transition-colors disabled:cursor-not-allowed disabled:border-line-strong disabled:opacity-55 disabled:shadow-none'

/** The one primary action on a screen. Amber in the dark theme, terracotta in the light one. */
export const PRIMARY_BTN = `${PRIMARY_SHAPE} bg-brand hover:bg-brand-hover active:bg-brand-hover`

/** Momentary confirmation state for a primary action ("Copied"). */
export const SUCCESS_BTN = `${PRIMARY_SHAPE} bg-emerald-400 hover:bg-emerald-400`

/** Compact secondary action (toolbars, card headers). */
export const GHOST_BTN =
  'inline-flex items-center justify-center gap-1.5 rounded-lg border border-line-strong bg-surface-hi px-2.5 py-1.5 text-[13px] font-semibold text-ink-soft shadow-btn-soft transition-colors hover:border-brand-line hover:bg-subtle hover:text-ink disabled:pointer-events-none disabled:border-line disabled:opacity-55'

/** GHOST_BTN sized to sit next to a page title. */
export const GHOST_BTN_MD =
  'inline-flex items-center justify-center gap-1.5 rounded-lg border border-line-strong bg-surface-hi px-3 py-2 text-sm font-semibold text-ink-soft shadow-btn-soft transition-colors hover:border-brand-line hover:bg-subtle hover:text-ink disabled:pointer-events-none disabled:border-line disabled:opacity-55'

/** Destructive action that still needs a full button. */
export const DANGER_BTN =
  'inline-flex items-center justify-center gap-1.5 rounded-lg border border-rose-400/60 bg-surface-hi px-3 py-2 text-sm font-semibold text-rose-200 shadow-btn-soft transition-colors hover:border-rose-400 hover:bg-danger-surface disabled:pointer-events-none disabled:border-line disabled:opacity-55'

/** Bordered icon-only control — reorder arrows, steppers. */
export const ICON_BTN =
  'rounded-lg border border-line-strong bg-surface-hi p-1 text-ink-soft shadow-btn-soft transition-colors hover:border-brand-line hover:bg-subtle hover:text-ink disabled:opacity-55 disabled:hover:border-line-strong disabled:hover:bg-surface-hi disabled:hover:text-ink-soft'

/** Borderless destructive icon — delete a row or block. Callers add padding. */
export const DELETE_BTN =
  'shrink-0 rounded-md text-ink-muted transition-colors hover:bg-danger-surface hover:text-rose-300'

/* -- Fields ---------------------------------------------------------------- */

const FIELD_BASE =
  'w-full rounded-lg border border-field-line bg-field text-ink shadow-field transition-colors placeholder:text-ink-faint hover:border-ink-faint focus:border-focus focus:ring-2 focus:ring-focus/40 focus:outline-none disabled:opacity-55'

export const INPUT = `${FIELD_BASE} px-2.5 py-1.5 text-sm`

/** INPUT with the roomier padding used on standalone form rows. */
export const INPUT_LG = `${FIELD_BASE} px-3 py-2 text-sm`

export const TEXTAREA = `${FIELD_BASE} resize-y px-2.5 py-1.5 text-sm leading-relaxed`

export const SELECT =
  'rounded-lg border border-field-line bg-field px-2.5 py-1.5 text-sm font-semibold text-ink transition-colors hover:border-ink-faint focus:border-focus focus:ring-2 focus:ring-focus/40 focus:outline-none disabled:opacity-55'

/**
 * Heading fields. These are sized like the headings they produce, so the H2 /
 * H3 hierarchy is visible while editing and not only after saving.
 */
export const INPUT_TITLE = `${FIELD_BASE} px-3 py-2 text-base font-semibold tracking-tight`
export const INPUT_HEADING = `${FIELD_BASE} px-2.5 py-1.5 text-sm font-semibold`

/* -- Text ------------------------------------------------------------------ */

/** Page identity: the only large heading on a screen. */
export const PAGE_TITLE = 'text-3xl font-extrabold tracking-[-0.03em] text-ink'

export const PAGE_SUBTITLE = 'mt-1 text-sm text-ink-muted'

/** Small uppercase label over a group of controls or cards (TODAY'S COVERAGE, SHIFT 1 …). */
export const SECTION_LABEL = 'text-[11px] font-bold tracking-[0.14em] text-ink-muted uppercase'

/** The title of a card, under its SECTION_LABEL: normal case, calm weight. */
export const CARD_TITLE = 'text-[15px] font-semibold tracking-tight text-ink'

/** Neutral badge. Coloured variants live next to the data that defines them. */
export const CHIP =
  'inline-flex items-center rounded-md border border-line-strong bg-field/60 px-1.5 py-0.5 text-[10px] font-bold tracking-[0.06em] text-ink-soft uppercase'

/** Small numeric counter next to a section label. */
export const COUNT_BADGE =
  'rounded-md border border-line-strong bg-field/60 px-1.5 py-0.5 text-[11px] font-bold text-ink-soft'
