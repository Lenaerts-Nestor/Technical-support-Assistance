import { storageKey } from '../storage/usePersistentState'

/**
 * The colour themes. The palettes themselves are CSS variables (the default in
 * `index.css`, the rest in `themes.css`); this list is only what the switcher
 * needs: a name and two swatch colours so a theme can be recognised before it is
 * applied.
 */
export type ThemeId = 'dark' | 'parchment'

export type ThemeInfo = {
  id: ThemeId
  label: string
  /** The card colour and the accent, for the swatch. Keep in step with the CSS. */
  swatch: readonly [card: string, accent: string]
}

export const THEMES: readonly ThemeInfo[] = [
  { id: 'dark', label: 'Graphite', swatch: ['#202124', '#e7a83e'] },
  { id: 'parchment', label: 'Parchment', swatch: ['#fffdf9', '#914b32'] },
]

export const DEFAULT_THEME: ThemeId = 'dark'

export const THEME_KEY = storageKey('app', 'theme')

/** Saved choices from before a theme was renamed: "coffee" became "parchment". */
const RENAMED: Record<string, ThemeId> = { coffee: 'parchment' }

/** Accepts only a theme that exists (or an old name of one), so a removed theme falls back to the default. */
export const reviveTheme = (raw: unknown): ThemeId | null =>
  THEMES.find((t) => t.id === raw)?.id ?? (typeof raw === 'string' ? (RENAMED[raw] ?? null) : null)

/** Put a theme on the page. The default theme is the bare `:root`, so it clears the attribute. */
export function applyTheme(id: ThemeId): void {
  const root = document.documentElement
  if (id === DEFAULT_THEME) delete root.dataset.theme
  else root.dataset.theme = id
}

/** Read the saved theme synchronously, so the first paint is already in it. */
export function readStoredTheme(): ThemeId {
  try {
    const stored = window.localStorage.getItem(THEME_KEY)
    return (stored !== null && reviveTheme(JSON.parse(stored))) || DEFAULT_THEME
  } catch {
    return DEFAULT_THEME
  }
}
