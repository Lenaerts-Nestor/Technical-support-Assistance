import { useCallback, useMemo, useState } from 'react'
import { DEFAULT_GUIDE_ORDER, TEMPLATE_FILE, blankGuide } from './guidesData'
import { parseGuidesFile, toGuidesFile } from './normalizeGuide'
import { useGuidesFolder } from './useGuidesFolder'
import type { Guide } from './types'

const uid = () => crypto.randomUUID()

/** Which screen the Guides feature is showing. */
export type GuidesScreen =
  | { name: 'list' }
  | { name: 'view'; id: string }
  | { name: 'edit'; id: string }

/** Sort by manual order, then newest-updated first. */
function compareGuides(a: Guide, b: Guide): number {
  const oa = a.order ?? DEFAULT_GUIDE_ORDER
  const ob = b.order ?? DEFAULT_GUIDE_ORDER
  if (oa !== ob) return oa - ob
  return b.updatedAt.localeCompare(a.updatedAt)
}

/**
 * Move one guide up/down within its group (pinned or all) and renumber that
 * group's `order` values to lock in the new positions.
 */
function applyMove(guides: Guide[], id: string, dir: -1 | 1): Guide[] {
  const target = guides.find((g) => g.id === id)
  if (!target) return guides

  const group = guides
    .filter((g) => !!g.pinned === !!target.pinned)
    .sort(compareGuides)
  const from = group.findIndex((g) => g.id === id)
  const to = from + dir
  if (to < 0 || to >= group.length) return guides

  ;[group[from], group[to]] = [group[to], group[from]]
  const orderById = new Map(group.map((g, i) => [g.id, i]))
  return guides.map((g) =>
    orderById.has(g.id) ? { ...g, order: orderById.get(g.id) } : g,
  )
}

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function useGuides() {
  const [guides, setGuides] = useState<Guide[]>([])
  const [error, setError] = useState<string | null>(null)
  const [screen, setScreen] = useState<GuidesScreen>({ name: 'list' })
  /** Id of a just-created guide that has never been saved — Cancel discards it. */
  const [pendingNewId, setPendingNewId] = useState<string | null>(null)

  const pinnedGuides = useMemo(
    () => guides.filter((g) => g.pinned).sort(compareGuides),
    [guides],
  )
  const unpinnedGuides = useMemo(
    () => guides.filter((g) => !g.pinned).sort(compareGuides),
    [guides],
  )
  const activeGuide = useMemo(() => {
    if (screen.name === 'list') return null
    return guides.find((g) => g.id === screen.id) ?? null
  }, [guides, screen])

  const loadGuides = useCallback((list: Guide[]) => {
    setGuides(list)
    setScreen({ name: 'list' })
    setPendingNewId(null)
    setError(null)
  }, [])

  const importGuides = useCallback(
    (text: string) => {
      try {
        loadGuides(parseGuidesFile(text))
      } catch {
        setError('That file is not a valid guides JSON export.')
      }
    },
    [loadGuides],
  )

  /** Folder link + debounced autosave of guides.json + step-image resolution. */
  const folder = useGuidesFolder({ guides, onAdopt: loadGuides })

  const togglePin = useCallback((id: string) => {
    setGuides((list) => {
      const topOrder =
        Math.min(0, ...list.filter((g) => g.pinned).map((g) => g.order ?? 0)) - 1
      return list.map((g) =>
        g.id === id
          ? {
              ...g,
              pinned: !g.pinned,
              order: g.pinned ? DEFAULT_GUIDE_ORDER : topOrder,
            }
          : g,
      )
    })
  }, [])

  const moveGuide = useCallback(
    (id: string, dir: -1 | 1) => setGuides((list) => applyMove(list, id, dir)),
    [],
  )

  const openGuide = useCallback((id: string) => setScreen({ name: 'view', id }), [])
  const editGuide = useCallback((id: string) => setScreen({ name: 'edit', id }), [])
  const closeGuide = useCallback(() => setScreen({ name: 'list' }), [])

  const newGuide = useCallback(() => {
    const now = new Date().toISOString()
    const draft = blankGuide(uid(), now)
    setGuides((list) => [draft, ...list])
    setPendingNewId(draft.id)
    setScreen({ name: 'edit', id: draft.id })
  }, [])

  const saveGuide = useCallback((draft: Guide) => {
    const saved: Guide = { ...draft, updatedAt: new Date().toISOString() }
    setGuides((list) => list.map((g) => (g.id === saved.id ? saved : g)))
    setPendingNewId((pending) => (pending === saved.id ? null : pending))
    setScreen({ name: 'view', id: saved.id })
  }, [])

  const cancelEdit = useCallback(() => {
    setGuides((list) =>
      pendingNewId ? list.filter((g) => g.id !== pendingNewId) : list,
    )
    setScreen(
      pendingNewId
        ? { name: 'list' }
        : screen.name === 'edit'
          ? { name: 'view', id: screen.id }
          : { name: 'list' },
    )
    setPendingNewId(null)
  }, [pendingNewId, screen])

  const deleteGuide = useCallback((id: string) => {
    setGuides((list) => list.filter((g) => g.id !== id))
    setPendingNewId((pending) => (pending === id ? null : pending))
    setScreen({ name: 'list' })
  }, [])

  const exportGuides = useCallback(
    () => downloadJson('guides-backup.json', toGuidesFile(guides)),
    [guides],
  )

  const downloadTemplate = useCallback(
    () => downloadJson('guides-template.json', TEMPLATE_FILE),
    [],
  )

  return {
    guides,
    pinnedGuides,
    unpinnedGuides,
    screen,
    activeGuide,
    error,
    importGuides,
    togglePin,
    moveGuide,
    openGuide,
    editGuide,
    closeGuide,
    newGuide,
    saveGuide,
    cancelEdit,
    deleteGuide,
    exportGuides,
    downloadTemplate,
    folder,
  }
}
