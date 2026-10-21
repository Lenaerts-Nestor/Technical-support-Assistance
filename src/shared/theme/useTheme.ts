import { useEffect } from 'react'
import { usePersistentState } from '../storage/usePersistentState'
import { DEFAULT_THEME, THEME_KEY, applyTheme, reviveTheme } from './themes'
import type { ThemeId } from './themes'

/** The active colour theme: remembered across reloads and applied to the page whenever it changes. */
export function useTheme(): [ThemeId, (id: ThemeId) => void] {
  const [theme, setTheme] = usePersistentState<ThemeId>(THEME_KEY, () => DEFAULT_THEME, reviveTheme)
  useEffect(() => applyTheme(theme), [theme])
  return [theme, setTheme]
}
