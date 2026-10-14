import { createContext, useContext, useEffect } from 'react'
import type { PageId } from './navigation'

/**
 * Lets a page ask the shell to give it more room: the sidebar shrinks to icons
 * while that page is in "focus mode" (e.g. a full-size diagram, or a side card).
 * Requests are keyed by page so one page can never release another's. Inert by default.
 */
export const FocusModeContext = createContext<(page: PageId, on: boolean) => void>(() => {})

/** Hold focus mode for `page` while `on` is true; released when it turns false or the page unmounts. */
export function useFocusMode(page: PageId, on: boolean) {
  const setFocus = useContext(FocusModeContext)
  useEffect(() => {
    setFocus(page, on)
    return () => setFocus(page, false)
  }, [page, on, setFocus])
}
