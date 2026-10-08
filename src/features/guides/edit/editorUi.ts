import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

/**
 * View state of the guide editor that is not part of the guide itself: which
 * blocks are folded up, which top-level block the author is working in (so new
 * blocks land after it), and which item was just added (so it can take focus
 * and flash briefly).
 */
export type EditorUi = {
  collapsed: ReadonlySet<string>
  toggleCollapsed: (id: string) => void
  collapseAll: (ids: string[]) => void
  expandAll: () => void
  activeId: string | null
  setActiveId: (id: string | null) => void
  justAdded: string | null
  flashAdded: (id: string) => void
}

const NONE: ReadonlySet<string> = new Set()

const DEFAULT_UI: EditorUi = {
  collapsed: NONE,
  toggleCollapsed: () => {},
  collapseAll: () => {},
  expandAll: () => {},
  activeId: null,
  setActiveId: () => {},
  justAdded: null,
  flashAdded: () => {},
}

export const EditorUiContext = createContext<EditorUi>(DEFAULT_UI)

export const useEditorUi = () => useContext(EditorUiContext)

/** True for a moment after the item with this id was added. */
export const useFresh = (id: string) => useEditorUi().justAdded === id

/** How long a new item stays highlighted. */
const FLASH_MS = 1600

export function useEditorUiState(): EditorUi {
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(NONE)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [justAdded, setJustAdded] = useState<string | null>(null)

  useEffect(() => {
    if (!justAdded) return
    const t = window.setTimeout(() => setJustAdded(null), FLASH_MS)
    return () => window.clearTimeout(t)
  }, [justAdded])

  const toggleCollapsed = useCallback(
    (id: string) =>
      setCollapsed((prev) => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      }),
    [],
  )
  const collapseAll = useCallback((ids: string[]) => setCollapsed(new Set(ids)), [])
  const expandAll = useCallback(() => setCollapsed(NONE), [])
  const flashAdded = useCallback((id: string) => {
    // A new item is never folded, even if its id was somehow collapsed before.
    setCollapsed((prev) => {
      if (!prev.has(id)) return prev
      const next = new Set(prev)
      next.delete(id)
      return next
    })
    setJustAdded(id)
  }, [])

  return useMemo(
    () => ({
      collapsed,
      toggleCollapsed,
      collapseAll,
      expandAll,
      activeId,
      setActiveId,
      justAdded,
      flashAdded,
    }),
    [collapsed, toggleCollapsed, collapseAll, expandAll, activeId, justAdded, flashAdded],
  )
}
