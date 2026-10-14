import { useCallback, useMemo, useState } from 'react'
import { blankGuide } from './guidesData'
import type { GuidesLibrary } from './useGuidesLibrary'
import type { Guide } from './types'

const uid = () => crypto.randomUUID()

/** Which screen the Guides page is showing. */
export type GuidesScreen =
  | { name: 'list' }
  | { name: 'view'; id: string }
  | { name: 'edit'; id: string }

/**
 * Page-local UI state for the Guides feature: list → view → edit. It lives with
 * the page (not with the shared guides data) so that the page's error boundary
 * still throws a crashed editor away on "Try again".
 */
export function useGuidesScreen(library: GuidesLibrary) {
  const { guides, pendingNewId, addDraftGuide, saveGuide: commitGuide, discardDraftGuide, removeGuide } = library
  const [screen, setScreen] = useState<GuidesScreen>({ name: 'list' })

  const activeGuide = useMemo(() => {
    if (screen.name === 'list') return null
    return guides.find((g) => g.id === screen.id) ?? null
  }, [guides, screen])

  const openGuide = useCallback((id: string) => setScreen({ name: 'view', id }), [])
  const editGuide = useCallback((id: string) => setScreen({ name: 'edit', id }), [])
  const closeGuide = useCallback(() => setScreen({ name: 'list' }), [])

  const newGuide = useCallback(() => {
    const draft = blankGuide(uid(), new Date().toISOString())
    addDraftGuide(draft)
    setScreen({ name: 'edit', id: draft.id })
  }, [addDraftGuide])

  const saveGuide = useCallback(
    (draft: Guide) => {
      const saved: Guide = { ...draft, updatedAt: new Date().toISOString() }
      commitGuide(saved)
      setScreen({ name: 'view', id: saved.id })
    },
    [commitGuide],
  )

  const cancelEdit = useCallback(() => {
    if (pendingNewId) {
      discardDraftGuide(pendingNewId)
      setScreen({ name: 'list' })
    } else {
      setScreen(screen.name === 'edit' ? { name: 'view', id: screen.id } : { name: 'list' })
    }
  }, [discardDraftGuide, pendingNewId, screen])

  const deleteGuide = useCallback(
    async (id: string) => {
      if (await removeGuide(id)) setScreen({ name: 'list' })
    },
    [removeGuide],
  )

  return {
    screen,
    activeGuide,
    openGuide,
    editGuide,
    closeGuide,
    newGuide,
    saveGuide,
    cancelEdit,
    deleteGuide,
  }
}
