import { storageKey } from '../storage/usePersistentState'

/**
 * The colour themes. The palettes themselves are CSS variables (the default in
 * `index.css`, the rest in `themes.css`); this list is only what the switcher
 * needs: a name and two swatch colours so a theme can be recognised before it is
 * applied.
 */
export type ThemeId = 'dark' | 'coffee'

export type ThemeInfo = {
  id: ThemeId
  label: string
  /** The card colour and the accent, for the swatch. Keep in step with the CSS. */
  swatch: readonly [card: string, accent: string]
}

export const THEMES: readonly ThemeInfo[] = [
  { id: 'dark', label: 'Dark', swatch: ['#23262e', '#e9a23b'] },
  { id: 'coffee', label: 'Coffee', swatch: ['#fffdf9', '#8f5b2a'] },
]

export const DEFAULT_THEME: ThemeId = 'dark'

export const THEME_KEY = storageKey('app', 'theme')

/** Accepts only a theme that exists, so a renamed or removed theme falls back to the default. */
export const reviveTheme = (raw: unknown): ThemeId | null => THEMES.find((t) => t.id === raw)?.id ?? null

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
