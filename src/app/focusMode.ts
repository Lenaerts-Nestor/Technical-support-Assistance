import { createContext, useContext, useEffect } from 'react'

/**
 * Lets a page ask the shell to give it more room: the sidebar shrinks to icons
 * while a page is in "focus mode" (e.g. a full-size diagram). Inert by default.
 */
export const FocusModeContext = createContext<(on: boolean) => void>(() => {})

/** Hold focus mode while `on` is true; released when it turns false or the page unmounts. */
export function useFocusMode(on: boolean) {
  const setFocus = useContext(FocusModeContext)
  useEffect(() => {
    setFocus(on)
    return () => setFocus(false)
  }, [on, setFocus])
}
